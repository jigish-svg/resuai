import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { RewriteTextBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { rewriteResumeText } from '@/lib/openai/resume-writer';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.resumeRewriteText))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, RewriteTextBody);
  if (!body.ok) return body.response;
  const { text, fieldType, jobTitle, company } = body.data;

  try {
    const rewritten = await rewriteResumeText(text, fieldType, { jobTitle: jobTitle ?? undefined, company: company ?? undefined });
    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error('Resume text rewrite error:', error);
    return apiError('analysis_failed', 'Failed to rewrite text. Please try again.');
  }
}
