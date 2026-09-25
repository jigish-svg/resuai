import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { TruthGuardBody } from '@/lib/api/schemas/tailor';
import { createClient } from '@/lib/supabase/server';
import { runTruthGuard } from '@/lib/openai/tailoring-engine';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.truthGuard));
  if (limited) return limited;

  const body = await parseJsonBody(request, TruthGuardBody);
  if (!body.ok) return body.response;
  const { tailoredText, jobId } = body.data;

  try {
    let jobResumeId: string | null = null;
    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
      jobResumeId = job?.resume_id ?? null;
    }
    const resume = await getResumeForJob(supabase, user.id, jobResumeId);

    if (!resume?.raw_text) {
      return apiError('conflict', 'Upload your master resume first so there is something to check against.');
    }

    const result = await runTruthGuard(tailoredText, resume.raw_text);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Truth Guard error:', error);
    return apiError('analysis_failed', 'Truth Guard check failed. Please try again.');
  }
}
