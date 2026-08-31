import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runTruthGuard } from '@/lib/openai/tailoring-engine';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.truthGuard))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { tailoredText, jobId } = await request.json();
  if (!tailoredText) {
    return NextResponse.json({ error: 'tailoredText is required' }, { status: 400 });
  }

  try {
    let jobResumeId: string | null = null;
    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
      jobResumeId = job?.resume_id ?? null;
    }
    const resume = await getResumeForJob(supabase, user.id, jobResumeId);

    if (!resume?.raw_text) {
      return NextResponse.json({ error: 'No master resume found to verify against' }, { status: 400 });
    }

    const result = await runTruthGuard(tailoredText, resume.raw_text);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Truth Guard error:', error);
    const message = error instanceof Error ? error.message : 'Truth Guard check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
