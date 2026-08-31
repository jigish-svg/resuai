import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewPrep } from '@/lib/openai/interview-prep';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return NextResponse.json(
      { error: 'Interview Prep is a paid feature. Upgrade to unlock it.', upgradeRequired: true },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.interviewPrep))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobId } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: requirements } = await supabase
      .from('job_requirements')
      .select('id, requirement_text, category, importance')
      .eq('job_id', jobId)
      .order('sort_order');
    if (!requirements || requirements.length === 0) {
      return NextResponse.json({ error: 'This job has no extracted requirements yet' }, { status: 400 });
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
      return NextResponse.json({ error: 'Upload your master resume before generating interview prep' }, { status: 400 });
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
    const message = error instanceof Error ? error.message : 'Failed to generate interview prep';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
