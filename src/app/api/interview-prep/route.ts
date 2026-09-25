import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { JobIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewPrep } from '@/lib/openai/interview-prep';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return apiError('forbidden', 'Interview Prep is a paid feature. Upgrade to unlock it.');
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.interviewPrep));
  if (limited) return limited;

  const body = await parseJsonBody(request, JobIdBody);
  if (!body.ok) return body.response;
  const { jobId } = body.data;

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }

    const { data: requirements } = await supabase
      .from('job_requirements')
      .select('id, requirement_text, category, importance')
      .eq('job_id', jobId)
      .order('sort_order');
    if (!requirements || requirements.length === 0) {
      return apiError('conflict', 'This job has no requirements yet. Re-add the job description and try again.');
    }

    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let matchItemsForPrep: { requirement_text: string; status: 'matched' | 'partial' | 'no_evidence'; evidence_text?: string }[] = [];
    if (match) {
      const { data: matchItems } = await supabase
        .from('match_items')
        .select('status, evidence_text, requirement:job_requirements(requirement_text)')
        .eq('match_id', match.id);
      matchItemsForPrep = (matchItems ?? []).map((m) => ({
        requirement_text: (m.requirement as unknown as { requirement_text: string })?.requirement_text ?? '',
        status: m.status,
        evidence_text: m.evidence_text ?? undefined,
      }));
    }

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume before generating interview prep.');
    }

    const { data: achievements } = await supabase
      .from('achievements')
      .select('company, job_title, achievement_text, skills, metrics')
      .eq('resume_id', resume.id);

    const result = await generateInterviewPrep(
      job.title,
      job.company,
      requirements,
      matchItemsForPrep,
      achievements ?? [],
      resume.candidate_name || 'Candidate'
    );

    const { data: existing } = await supabase
      .from('interview_prep')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let interviewPrepId: string;

    if (existing) {
      const { error } = await supabase
        .from('interview_prep')
        .update({
          match_id: match?.id,
          questions: result.questions,
          questions_to_ask: result.questions_to_ask,
          skill_gaps: result.skill_gaps,
        })
        .eq('id', existing.id);
      if (error) throw error;
      interviewPrepId = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from('interview_prep')
        .insert({
          user_id: user.id,
          job_id: jobId,
          match_id: match?.id,
          questions: result.questions,
          questions_to_ask: result.questions_to_ask,
          skill_gaps: result.skill_gaps,
        })
        .select('id')
        .single();
      if (error) throw error;
      interviewPrepId = inserted.id;
    }

    return NextResponse.json({ interviewPrepId, ...result });
  } catch (error) {
    console.error('Interview prep error:', error);
    return apiError('analysis_failed', 'Failed to generate interview prep. Please try again.');
  }
}
