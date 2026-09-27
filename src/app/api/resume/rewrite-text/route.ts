import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { RewriteTextBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { rewriteResumeText } from '@/lib/openai/resume-writer';
import { runTruthGuard } from '@/lib/openai/tailoring-engine';
import { classifyTruthGuardResult } from '@/lib/openai/truth-guard-gate';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.resumeRewriteText));
  if (limited) return limited;

  const body = await parseJsonBody(request, RewriteTextBody);
  if (!body.ok) return body.response;
  const { text, fieldType, jobTitle, company } = body.data;

  try {
    const rewritten = await rewriteResumeText(text, fieldType, { jobTitle: jobTitle ?? undefined, company: company ?? undefined });

    // This route never persists anything itself — whatever the user does with
    // `rewritten` still has to pass through /api/tailor/save's mandatory gate
    // before it can become saved content. This check is early feedback only,
    // compared against the original text (the only candidate content available
    // here), not a decision point.
    const truthGuardResult = await runTruthGuard(rewritten, text);
    const truthGuardStatus = classifyTruthGuardResult(truthGuardResult);

    return NextResponse.json({ rewritten, truthGuard: { status: truthGuardStatus, flags: truthGuardResult.flags } });
  } catch (error) {
    console.error('Resume text rewrite error:', error);
    return apiError('analysis_failed', 'Failed to rewrite text. Please try again.');
  }
}
