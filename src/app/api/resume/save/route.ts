import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { SaveResumeBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { getEmbedding } from '@/lib/openai/evidence-matcher';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { buildResumeSavePayload } from '@/lib/resume/save-payload';

export const runtime = 'nodejs';

const SAVE_FAILED = 'Failed to save resume. Please try again.';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.resumeSave))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, SaveResumeBody);
  if (!body.ok) return body.response;
  const { parsed, rawText, name, resumeId, template } = body.data;

  try {
    if (!resumeId) {
      const { count } = await supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count ?? 0) > 0 && !(await isPaidUser(supabase, user.id))) {
        return apiError('forbidden', `Free plan is limited to ${FREE_TIER_LIMITS.maxResumeProfiles} resume profile. Upgrade to create more.`);
      }
    }

    const payload = buildResumeSavePayload(parsed, rawText, { name, template });

    // Embeddings come before the write so the database step is a single transaction.
    // A failed embedding is stored as null, as before; semantic search skips it.
    const embeddings = await Promise.all(
      payload.achievements.map((a) =>
        getEmbedding(`${a.job_title} at ${a.company}: ${a.achievement_text}`).catch(() => null)
      )
    );

    const { data: savedId, error } = await supabase.rpc('save_resume', {
      p_resume_id: resumeId ?? null,
      p_resume: payload.resume,
      p_sections: payload.sections,
      p_achievements: payload.achievements.map((a, i) => ({ ...a, embedding: embeddings[i] })),
    });
    if (error) return rpcError(error, { notFound: 'Resume not found.', fallback: SAVE_FAILED });

    return NextResponse.json({ resumeId: savedId });
  } catch (error) {
    console.error('Resume save error:', error);
    return apiError('internal_error', SAVE_FAILED);
  }
}
