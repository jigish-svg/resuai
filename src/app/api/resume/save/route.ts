import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { SaveResumeBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { getEmbedding } from '@/lib/openai/evidence-matcher';
import { EMBEDDING_MODEL } from '@/lib/openai/client';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { buildResumeSavePayload } from '@/lib/resume/save-payload';
import { loadConceptDictionary } from '@/lib/concepts/dictionary';
import { normalizeConcepts } from '@/lib/concepts/normalize';
import { determineAchievementSource, CandidateDataSource } from '@/lib/resume/determine-source';

function achievementKey(a: { company: string; job_title: string; achievement_text: string }): string {
  return `${a.company}\u0000${a.job_title}\u0000${a.achievement_text}`;
}

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

    // One dictionary load for the whole save, not one query per skill: every
    // achievement's skills[] is normalized in a single batch pass against it.
    const dictionary = await loadConceptDictionary(supabase);
    const conceptIdsByAchievement = payload.achievements.map((a) =>
      normalizeConcepts(dictionary, a.skills)
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => c.conceptId)
    );

    // Provenance is per-achievement, not per save call: an update fetches the
    // resume's current achievements once, so an unchanged bullet keeps its
    // existing source (e.g. ai_parsed) instead of being relabeled just because
    // the user edited something else on the same save.
    const existingSourceByKey = new Map<string, CandidateDataSource>();
    if (resumeId) {
      const { data: existing } = await supabase
        .from('achievements')
        .select('company, job_title, achievement_text, source')
        .eq('resume_id', resumeId);
      for (const a of existing ?? []) {
        existingSourceByKey.set(achievementKey(a), a.source as CandidateDataSource);
      }
    }

    const { data: savedId, error } = await supabase.rpc('save_resume', {
      p_resume_id: resumeId ?? null,
      p_resume: payload.resume,
      p_sections: payload.sections,
      p_achievements: payload.achievements.map((a, i) => ({
        ...a,
        embedding: embeddings[i],
        embedding_model: embeddings[i] ? EMBEDDING_MODEL : null,
        concept_ids: conceptIdsByAchievement[i],
        source: determineAchievementSource(resumeId, existingSourceByKey.get(achievementKey(a))),
      })),
    });
    if (error) return rpcError(error, { notFound: 'Resume not found.', fallback: SAVE_FAILED });

    return NextResponse.json({ resumeId: savedId });
  } catch (error) {
    console.error('Resume save error:', error);
    return apiError('internal_error', SAVE_FAILED);
  }
}
