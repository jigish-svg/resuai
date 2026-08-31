import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { answerInterviewChatQuestion, InterviewChatMessage } from '@/lib/openai/interview-chat';

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

  if (!(await checkRateLimit(supabase, RATE_LIMITS.interviewChat))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobId, message, history }: { jobId: string; message: string; history?: InterviewChatMessage[] } = await request.json();
  if (!jobId || !message || !message.trim()) {
    return NextResponse.json({ error: 'jobId and message are required' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 413 });
  }
  if ((history?.length ?? 0) > 40) {
    return NextResponse.json({ error: 'Conversation is too long — start a new chat.' }, { status: 413 });
  }

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const reply = await answerInterviewChatQuestion(job.title, job.company, history ?? [], message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Interview chat error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get a response';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
