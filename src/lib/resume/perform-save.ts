import { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import type { ParsedResumeSchema } from '@/lib/api/schemas/resume';
import type { ResumeTemplate } from '@/types/resume';
import type { TruthGuardFlag } from '@/types/match';
import { getEmbedding } from '@/lib/openai/evidence-matcher';
import { EMBEDDING_MODEL } from '@/lib/openai/client';
import { runTruthGuard } from '@/lib/openai/tailoring-engine';
import { classifyTruthGuardResult, TruthGuardStatus } from '@/lib/openai/truth-guard-gate';
import { buildResumeSavePayload } from '@/lib/resume/save-payload';
import { loadConceptDictionary } from '@/lib/concepts/dictionary';
import { normalizeConcepts } from '@/lib/concepts/normalize';
import { determineCandidateSource, CandidateDataSource } from '@/lib/resume/determine-source';

type ParsedResumeInput = z.infer<typeof ParsedResumeSchema>;

export type VersionAction = 'upload' | 'manual_save' | 'restore';

export interface PerformResumeSaveInput {
  parsed: ParsedResumeInput;
  rawText: string;
  name?: string | null;
  resumeId?: string | null;
  template?: ResumeTemplate | null;
  /** Defaults to 'upload' (no resumeId) or 'manual_save' (has resumeId); callers like restore override it. */
  versionAction?: VersionAction;
  /** Set only after the caller already received a needs_review/unsupported verdict for this exact save and the user chose to save anyway. Never a way to skip the check itself — see ResumeTruthGuardBlockedError. */
  confirmUnsupported?: boolean | null;
}

/** Thrown when new/changed resume content is flagged and not yet confirmed. Callers map this to the same 'needs_confirmation' response shape Step 1 established for tailoring. */
export class ResumeTruthGuardBlockedError extends Error {
  constructor(public truthGuardStatus: TruthGuardStatus, public flags: TruthGuardFlag[]) {
    super('Resume save blocked pending Truth Guard confirmation');
  }
}

// Keyed by achievement text alone: editing an achievement's company or job
// title (metadata, not the claim itself) must not reset its provenance —
// only a change to the achievement's own text means the content is new/changed
// (Phase 8.5 finding C).
function achievementKey(a: { achievement_text: string }): string {
  return a.achievement_text;
}

function projectKey(p: { name: string; description: string }): string {
  return `${p.name}\u0000${p.description}`;
}

/**
 * The full resume-save flow (Truth Guard on new/changed content, embeddings,
 * concept normalization, per-item provenance, the atomic save_resume RPC,
 * recommendation matching, and a resume_versions entry) as a single reusable
 * function — used by both the ordinary save route and version restore, so
 * neither duplicates this logic. Throws the raw RPC error on failure, or
 * ResumeTruthGuardBlockedError when new/changed content is flagged and
 * unconfirmed, so each caller can map either through its own error handling.
 */
export async function performResumeSave(
  supabase: SupabaseClient,
  userId: string,
  input: PerformResumeSaveInput
): Promise<{ resumeId: string }> {
  const { parsed, rawText, name, resumeId, template, confirmUnsupported } = input;

  const payload = buildResumeSavePayload(parsed, rawText, { name, template });

  const existingAchievementSourceByKey = new Map<string, CandidateDataSource>();
  const existingProjectSourceByKey = new Map<string, CandidateDataSource>();
  let priorRawText: string | null = null;
  let priorSummary = '';

  if (resumeId) {
    const [{ data: existingAchievements }, { data: existingProjects }, { data: priorResume }, { data: priorSections }] = await Promise.all([
      supabase.from('achievements').select('achievement_text, source').eq('resume_id', resumeId),
      supabase.from('projects').select('name, description, source').eq('resume_id', resumeId),
      supabase.from('resumes').select('raw_text').eq('id', resumeId).eq('user_id', userId).maybeSingle(),
      supabase.from('resume_sections').select('content').eq('resume_id', resumeId).eq('section_type', 'summary').maybeSingle(),
    ]);
    for (const a of existingAchievements ?? []) {
      existingAchievementSourceByKey.set(achievementKey(a), a.source as CandidateDataSource);
    }
    for (const p of existingProjects ?? []) {
      existingProjectSourceByKey.set(projectKey(p), p.source as CandidateDataSource);
    }
    priorRawText = priorResume?.raw_text ?? null;
    priorSummary = (priorSections?.content as { text?: string } | undefined)?.text ?? '';
  }

  // Truth Guard gate: only ever runs on an update, and only when there is
  // genuinely new/changed content (a first-time upload is trusted parsing per
  // rule 2; a save that only touches metadata like company/phone never
  // reaches this check, so ordinary manual saves stay exactly as fast as
  // before — Phase 8.5 finding A).
  if (resumeId) {
    const changedAchievementTexts = payload.achievements
      .filter((a) => !existingAchievementSourceByKey.has(achievementKey(a)))
      .map((a) => a.achievement_text);
    const newSummary = parsed.summary ?? '';
    const changedSummary = newSummary.trim() && newSummary !== priorSummary ? newSummary : null;

    const changedText = [changedSummary, ...changedAchievementTexts].filter(Boolean).join('\n');
    if (changedText) {
      const truthGuardResult = priorRawText ? await runTruthGuard(changedText, priorRawText) : { flags: [], passed: false };
      const truthGuardStatus = priorRawText ? classifyTruthGuardResult(truthGuardResult) : 'needs_review';
      if (truthGuardStatus !== 'supported' && !confirmUnsupported) {
        throw new ResumeTruthGuardBlockedError(truthGuardStatus, truthGuardResult.flags);
      }
    }
  }

  const embeddings = await Promise.all(
    payload.achievements.map((a) => getEmbedding(`${a.job_title} at ${a.company}: ${a.achievement_text}`).catch(() => null))
  );

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
  if (error) throw error;

  // Recommendation -> fact link, informational only: see Step 4. Never writes
  // to achievements/resume_sections — only updates the suggestion's own status.
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

  // A version is a meaningful saved state — this save call itself is exactly
  // that boundary. Logged, not fatal: the resume already saved successfully;
  // a version-tracking failure shouldn't turn a successful save into an error.
  const versionAction: VersionAction = input.versionAction ?? (resumeId ? 'manual_save' : 'upload');
  const label = versionAction === 'restore' ? 'Restored version' : versionAction === 'upload' ? 'Original upload' : 'Manual update';
  const { error: versionError } = await supabase.from('resume_versions').insert({
    resume_id: savedId,
    label,
    snapshot: { parsed, rawText, name: name ?? null, template: template ?? null },
    created_by_action: versionAction,
  });
  if (versionError) console.error('Failed to record resume version:', versionError);

  return { resumeId: savedId };
}
