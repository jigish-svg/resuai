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
import { determineCandidateSource, CandidateDataSource } from '@/lib/resume/determine-source';

function achievementKey(a: { company: string; job_title: string; achievement_text: string }): string {
  return `${a.company}\u0000${a.job_title}\u0000${a.achievement_text}`;
}

function projectKey(p: { name: string; description: string }): string {
  return `${p.name}\u0000${p.description}`;
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
    // achievement's skills[] and every project's technologies[] are normalized
    // in a single batch pass each against it.
    const dictionary = await loadConceptDictionary(supabase);
    const conceptIdsByAchievement = payload.achievements.map((a) =>
      normalizeConcepts(dictionary, a.skills)
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => c.conceptId)
    );
    const conceptIdsByProject = payload.projects.map((p) =>
      normalizeConcepts(dictionary, p.technologies)
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => c.conceptId)
    );

    // Provenance is per-item, not per save call: an update fetches the resume's
    // current achievements/projects once, so an unchanged bullet or project
    // keeps its existing source (e.g. ai_parsed) instead of being relabeled
    // just because the user edited something else on the same save.
    const existingAchievementSourceByKey = new Map<string, CandidateDataSource>();
    const existingProjectSourceByKey = new Map<string, CandidateDataSource>();
    if (resumeId) {
      const [{ data: existingAchievements }, { data: existingProjects }] = await Promise.all([
        supabase.from('achievements').select('company, job_title, achievement_text, source').eq('resume_id', resumeId),
        supabase.from('projects').select('name, description, source').eq('resume_id', resumeId),
      ]);
      for (const a of existingAchievements ?? []) {
        existingAchievementSourceByKey.set(achievementKey(a), a.source as CandidateDataSource);
      }
      for (const p of existingProjects ?? []) {
        existingProjectSourceByKey.set(projectKey(p), p.source as CandidateDataSource);
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
        source: determineCandidateSource(resumeId, existingAchievementSourceByKey.get(achievementKey(a))),
      })),
      p_projects: payload.projects.map((p, i) => ({
        ...p,
        concept_ids: conceptIdsByProject[i],
        source: determineCandidateSource(resumeId, existingProjectSourceByKey.get(projectKey(p))),
      })),
    });
    if (error) return rpcError(error, { notFound: 'Resume not found.', fallback: SAVE_FAILED });

    // Recommendation -> fact link, informational only: if the user has since
    // added a previously-suggested skill themselves, mark the suggestion as
    // matched. This never writes to achievements/resume_sections — it only
    // updates the suggestion's own status for the user's benefit.
    if (resumeId) {
      const { data: pendingSuggestions } = await supabase
        .from('ai_suggestions')
        .select('id, content')
        .eq('resume_id', resumeId)
        .eq('suggestion_type', 'skill')
        .eq('status', 'pending');

      const currentSkills = new Set(parsed.skills.map((s) => s.toLowerCase()));
      const matchedIds = (pendingSuggestions ?? [])
        .filter((row) => currentSkills.has(((row.content as { skill?: string })?.skill ?? '').toLowerCase()))
        .map((row) => row.id);

      if (matchedIds.length > 0) {
        await supabase.from('ai_suggestions').update({ status: 'matched_by_later_fact' }).in('id', matchedIds);
      }
    }

    return NextResponse.json({ resumeId: savedId });
  } catch (error) {
    console.error('Resume save error:', error);
    return apiError('internal_error', SAVE_FAILED);
  }
}
