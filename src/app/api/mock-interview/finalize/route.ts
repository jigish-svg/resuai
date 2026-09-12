import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSessionSummary, TranscriptEntry } from '@/lib/openai/mock-interview';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_TRANSCRIPT_ENTRIES = 200;
const MAX_TRANSCRIPT_CHARS = 20000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return NextResponse.json(
      { error: 'Mock Interview Practice is a paid feature. Upgrade to unlock it.', upgradeRequired: true },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.mockInterviewFinalize))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { sessionId, transcript }: { sessionId: string; transcript: TranscriptEntry[] } = await request.json();
  if (!sessionId || !transcript || transcript.length === 0) {
    return NextResponse.json({ error: 'sessionId and a non-empty transcript are required' }, { status: 400 });
  }
  if (transcript.length > MAX_TRANSCRIPT_ENTRIES) {
    return NextResponse.json({ error: 'Transcript is too long' }, { status: 400 });
  }
  const totalChars = transcript.reduce((sum, t) => sum + (t.text?.length ?? 0), 0);
  if (totalChars > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: 'Transcript is too long' }, { status: 400 });
  }

  try {
    const { data: session } = await supabase
      .from('mock_interview_sessions')
      .select('id, job_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .single();
    if (!session) {
      return NextResponse.json({ error: 'Session not found or already completed' }, { status: 404 });
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('title, company, resume_id')
      .eq('id', session.job_id)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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
    const message = error instanceof Error ? error.message : 'Failed to finalize session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
