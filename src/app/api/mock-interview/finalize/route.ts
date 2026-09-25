import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { FinalizeMockInterviewBody } from '@/lib/api/schemas/interview';
import { createClient } from '@/lib/supabase/server';
import { generateSessionSummary } from '@/lib/openai/mock-interview';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return apiError('forbidden', 'Mock Interview Practice is a paid feature. Upgrade to unlock it.');
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.mockInterviewFinalize))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, FinalizeMockInterviewBody);
  if (!body.ok) return body.response;
  const { sessionId, transcript } = body.data;

  try {
    const { data: session } = await supabase
      .from('mock_interview_sessions')
      .select('id, job_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .single();
    if (!session) {
      return apiError('not_found', 'Session not found or already completed.');
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('title, company, resume_id')
      .eq('id', session.job_id)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    const { data: achievements } = resume
      ? await supabase
          .from('achievements')
          .select('company, job_title, achievement_text, skills, metrics')
          .eq('resume_id', resume.id)
      : { data: [] };

    const summary = await generateSessionSummary(job.title, job.company, transcript, achievements ?? []);

    const { data: updated, error } = await supabase
      .from('mock_interview_sessions')
      .update({
        transcript,
        overall_feedback: summary,
        status: 'completed',
      })
      .eq('id', sessionId)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('Mock interview finalize error:', error);
    return apiError('analysis_failed', 'Failed to finalize session. Please try again.');
  }
}
