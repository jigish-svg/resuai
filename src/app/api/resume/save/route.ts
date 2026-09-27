import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { SaveResumeBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { performResumeSave, ResumeTruthGuardBlockedError } from '@/lib/resume/perform-save';

export const runtime = 'nodejs';

const SAVE_FAILED = 'Failed to save resume. Please try again.';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.resumeSave));
  if (limited) return limited;

  const body = await parseJsonBody(request, SaveResumeBody);
  if (!body.ok) return body.response;
  const { parsed, rawText, name, resumeId, template, confirmUnsupported } = body.data;

  try {
    if (!resumeId) {
      const { count } = await supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count ?? 0) > 0 && !(await isPaidUser(supabase, user.id))) {
        return apiError('forbidden', `Free plan is limited to ${FREE_TIER_LIMITS.maxResumeProfiles} resume profile. Upgrade to create more.`);
      }
    }

    const { resumeId: savedId } = await performResumeSave(supabase, user.id, { parsed, rawText, name, resumeId, template, confirmUnsupported });
    return NextResponse.json({ resumeId: savedId });
  } catch (error) {
    if (error instanceof ResumeTruthGuardBlockedError) {
      return apiError(
        'needs_confirmation',
        'Some content could not be verified against your resume. Review it and confirm to save anyway.',
        { truthGuardStatus: error.truthGuardStatus, flags: error.flags }
      );
    }
    if (error && typeof error === 'object') {
      return rpcError(error as { code?: string; message?: string }, { notFound: 'Resume not found.', fallback: SAVE_FAILED });
    }
    console.error('Resume save error:', error);
    return apiError('internal_error', SAVE_FAILED);
  }
}
