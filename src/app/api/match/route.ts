import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { buildMatchPayload } from '@/lib/match/save-payload';
import { JobIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { matchRequirementsToAchievements, MatchHints } from '@/lib/openai/evidence-matcher';
import { computeFitScore } from '@/lib/score/fit-score';
import { SCORE_CONFIG_V1 } from '@/lib/score/config';
import { fromLegacyMatch } from '@/lib/score/legacy-adapter';
import { MatchStatus, MatchConfidence } from '@/types/match';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { loadConceptDictionary } from '@/lib/concepts/dictionary';
import { areEquivalent, areIncompatible, normalizeConcepts } from '@/lib/concepts/normalize';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.match));
  if (limited) return limited;

  const body = await parseJsonBody(request, JobIdBody);
  if (!body.ok) return body.response;
  const { jobId } = body.data;

  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (jobError || !job) {
      return apiError('not_found', 'Job not found.');
    }

    const { data: requirements, error: reqError } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order');
    if (reqError) throw reqError;
    if (!requirements || requirements.length === 0) {
      return apiError('conflict', 'This job has no requirements yet. Re-add the job description and try again.');
    }

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume before running a match.');
    }

    const { data: achievements, error: achError } = await supabase
      .from('achievements')
      .select('id, company, job_title, achievement_text, skills, metrics, concept_ids')
      .eq('resume_id', resume.id);
    if (achError) throw achError;
    if (!achievements || achievements.length === 0) {
      return apiError('conflict', 'Your master resume has no achievements yet. Add some and try again.');
    }

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, description, technologies, metrics, concept_ids')
      .eq('resume_id', resume.id);

    const { data: resumeSections } = await supabase
      .from('resume_sections')
      .select('section_type, content')
      .eq('resume_id', resume.id);

    const skillsSection = resumeSections?.find((s) => s.section_type === 'skills');
    const skills = (skillsSection?.content as { skills?: string[] } | undefined)?.skills ?? [];

    const certificationsSection = resumeSections?.find((s) => s.section_type === 'certifications');
    const certifications = (certificationsSection?.content as { items?: { name: string; issuer?: string; date?: string }[] } | undefined)?.items ?? [];

    // Concept dictionary + retrieval hints: one dictionary load for the whole
    // match, deterministic concept lookups done in-process, and one pgvector
    // top-K RPC call per requirement (DB-side, not a JS comparison loop).
    const dictionary = await loadConceptDictionary(supabase);
    const conceptMatches = new Map<string, Set<string>>();
    const neverMergeExcluded = new Map<string, Set<string>>();
    const similarityHints = new Map<string, Map<string, number>>();
    const skillsCertsNeverMergeBlocked = new Set<string>();
    const positiveConceptHints = new Map<string, { skills?: boolean; certifications?: boolean; projects?: boolean }>();

    // Implied (inferred) requirements are never scored or shown in gap
    // analysis (fit-score.ts filters to origin === 'stated'), so running
    // concept matching or the LLM evidence match for them is pure cost with
    // no effect on the result (Phase C rule 5).
    const matchableRequirements = requirements.filter((r) => !r.is_implied);

    // Never-merge must cover every evidence path, not only achievements: the
    // skills-list, certifications-list, and project technologies are all
    // normalized to concepts here too, in one batch pass each (not one lookup
    // per requirement). Projects already have their concept_ids precomputed at
    // save time, so they're concatenated directly rather than re-normalized.
    //
    // Each source is kept separate (not pooled into one array): an equivalent
    // concept from one source (e.g. a listed skill) must never mask an
    // incompatible concept from a different source (e.g. a project using only
    // an incompatible technology) — see Phase 8.5 finding B.
    const skillConceptIds = normalizeConcepts(dictionary, skills)
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map((c) => c.conceptId);
    const certConceptIds = normalizeConcepts(dictionary, certifications.map((c) => c.name))
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map((c) => c.conceptId);
    const projectConceptIds = (projects ?? []).flatMap((p) => p.concept_ids ?? []);
    const nonAchievementConceptSources = [skillConceptIds, certConceptIds, projectConceptIds];

    for (const requirement of matchableRequirements) {
      const reqConceptId: string | null = requirement.normalized_concept_id;
      if (reqConceptId) {
        for (const achievement of achievements) {
          const achievementConceptIds: string[] = achievement.concept_ids ?? [];
          const hasEquivalent = achievementConceptIds.some((cid) => areEquivalent(dictionary, reqConceptId, cid));
          const hasIncompatible = achievementConceptIds.some((cid) => areIncompatible(dictionary, reqConceptId, cid));
          if (hasEquivalent) {
            const set = conceptMatches.get(requirement.id) ?? new Set<string>();
            set.add(achievement.id);
            conceptMatches.set(requirement.id, set);
          }
          // Exclude only when an incompatible concept is present AND no
          // equivalent one is also present — an achievement that genuinely
          // demonstrates the requirement (e.g. mentions both PostgreSQL and
          // MySQL) must not be excluded just because it also mentions an
          // incompatible technology (Phase C finding 4).
          if (hasIncompatible && !hasEquivalent) {
            const set = neverMergeExcluded.get(requirement.id) ?? new Set<string>();
            set.add(achievement.id);
            neverMergeExcluded.set(requirement.id, set);
          }
        }

        // Blocked if ANY single source is incompatible-only on its own — an
        // equivalent concept from a different source never suppresses this.
        const isSourceBlocked = (conceptIds: string[]) =>
          conceptIds.some((cid) => areIncompatible(dictionary, reqConceptId, cid)) &&
          !conceptIds.some((cid) => areEquivalent(dictionary, reqConceptId, cid));
        if (nonAchievementConceptSources.some(isSourceBlocked)) {
          skillsCertsNeverMergeBlocked.add(requirement.id);
        }

        // Positive hints: tell the model when the skills/certifications/projects
        // list already contains a deterministic alias/equivalent concept for this
        // requirement (e.g. "Postgres" for a "PostgreSQL" requirement, "React.js"
        // for "React"), so wording differences don't get mistaken for missing
        // evidence. This is annotation only — it never sets a status itself, never
        // overrides the never-merge exclusion above, and the model still decides
        // MATCHED/PARTIAL/NO_EVIDENCE (subject to the existing post-filters).
        const hasEquivalent = (conceptIds: string[]) => conceptIds.some((cid) => areEquivalent(dictionary, reqConceptId, cid));
        const positive: { skills?: boolean; certifications?: boolean; projects?: boolean } = {};
        if (hasEquivalent(skillConceptIds)) positive.skills = true;
        if (hasEquivalent(certConceptIds)) positive.certifications = true;
        if (hasEquivalent(projectConceptIds)) positive.projects = true;
        if (Object.keys(positive).length > 0) {
          positiveConceptHints.set(requirement.id, positive);
        }
      }

      if (!conceptMatches.get(requirement.id)?.size && requirement.embedding) {
        const { data: similar } = await supabase.rpc('match_achievements_by_embedding', {
          p_requirement_embedding: requirement.embedding,
          p_resume_id: resume.id,
          p_limit: 8,
        });
        if (similar?.length) {
          similarityHints.set(
            requirement.id,
            new Map(similar.map((s: { achievement_id: string; similarity: number }) => [s.achievement_id, s.similarity]))
          );
        }
      }
    }

    const hints: MatchHints = { conceptMatches, neverMergeExcluded, similarityHints, skillsCertsNeverMergeBlocked, positiveConceptHints };

    // Evidence matching (AI), given the deterministic concept/embedding hints above.
    const { matches: aiMatches, neverMergeViolationsStripped } = await matchRequirementsToAchievements(
      matchableRequirements.map((r) => ({ id: r.id, requirement_text: r.requirement_text, category: r.category, importance: r.importance })),
      achievements,
      resume.candidate_name || 'Candidate',
      skills,
      certifications,
      projects ?? [],
      hints
    );
    if (neverMergeViolationsStripped.length > 0) {
      console.warn('Never-merge violations stripped from match result:', neverMergeViolationsStripped);
    }

    const achievementById = new Map(achievements.map((a) => [a.id, a]));
    const aiMatchByRequirement = new Map(aiMatches.map((m) => [m.requirement_id, m]));

    const scoredItems = requirements.map((requirement) => {
      const aiMatch = aiMatchByRequirement.get(requirement.id);
      const status: MatchStatus = aiMatch?.status ?? 'no_evidence';
      const confidence: MatchConfidence = aiMatch?.confidence ?? 'low';
      const achievement = aiMatch?.achievement_id ? achievementById.get(aiMatch.achievement_id) : undefined;

      return {
        requirement,
        item: {
          requirement_id: requirement.id,
          achievement_id: achievement?.id,
          status,
          confidence,
          evidence_text: aiMatch?.evidence_text,
          explanation: aiMatch?.explanation ?? 'No matching evidence was found in the master resume.',
        },
      };
    });

    const fit = computeFitScore(
      scoredItems.map(({ item, requirement }) => fromLegacyMatch(requirement, item)),
      SCORE_CONFIG_V1
    );

    // Replaces any previous match for this job in one transaction.
    const payload = buildMatchPayload(fit, scoredItems.map(({ item }) => item));
    const { data: matchId, error: saveError } = await supabase.rpc('save_match', {
      p_job_id: jobId,
      p_resume_id: resume.id,
      p_match: payload.match,
      p_items: payload.items,
    });
    if (saveError) return rpcError(saveError, { notFound: 'Job not found.', fallback: 'Failed to save the match. Please try again.' });

    return NextResponse.json({ matchId, fit });
  } catch (error) {
    console.error('Match error:', error);
    return apiError('analysis_failed', 'Failed to run match analysis. Please try again.');
  }
}
