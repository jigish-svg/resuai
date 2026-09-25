import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { JobIdBody } from '@/lib/api/schemas/common';
import { SaveCoverLetterBody } from '@/lib/api/schemas/documents';
import { createClient } from '@/lib/supabase/server';
import { generateCoverLetter } from '@/lib/openai/cover-letter';
import { isPaidUser } from '@/lib/plan';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return apiError('forbidden', 'Cover letter generation is a paid feature. Upgrade to unlock it.');
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.coverLetter))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

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
      .select('requirement_text, importance')
      .eq('job_id', jobId)
      .order('sort_order');

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume before generating a cover letter.');
    }

    const { data: achievements } = await supabase
      .from('achievements')
      .select('company, job_title, achievement_text, skills, metrics')
      .eq('resume_id', resume.id);

    const letter = await generateCoverLetter(
      resume.candidate_name || 'Candidate',
      job.title,
      job.company,
      requirements ?? [],
      achievements ?? []
    );

    const { data: existing } = await supabase
      .from('cover_letters')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let coverLetter;
    if (existing) {
      const { data, error } = await supabase
        .from('cover_letters')
        .update({ content: letter })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      coverLetter = data;
    } else {
      const { data, error } = await supabase
        .from('cover_letters')
        .insert({ user_id: user.id, job_id: jobId, content: letter })
        .select('*')
        .single();
      if (error) throw error;
      coverLetter = data;
    }

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error('Cover letter error:', error);
    return apiError('analysis_failed', 'Failed to generate cover letter. Please try again.');
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, SaveCoverLetterBody);
  if (!body.ok) return body.response;
  const { jobId, content } = body.data;

  try {
    const { error } = await supabase
      .from('cover_letters')
      .update({ content })
      .eq('job_id', jobId)
      .eq('user_id', user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cover letter update error:', error);
    return apiError('internal_error', 'Failed to save cover letter. Please try again.');
  }
}
