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
import { areEquivalent, areIncompatible } from '@/lib/concepts/normalize';

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

    // Concept dictionary + retrieval hints: one dictionary load for the whole
    // match, deterministic concept lookups done in-process, and one pgvector
    // top-K RPC call per requirement (DB-side, not a JS comparison loop).
    const dictionary = await loadConceptDictionary(supabase);
    const conceptMatches = new Map<string, Set<string>>();
    const neverMergeExcluded = new Map<string, Set<string>>();
    const similarityHints = new Map<string, Map<string, number>>();

    for (const requirement of requirements) {
      const reqConceptId: string | null = requirement.normalized_concept_id;
      if (reqConceptId) {
        for (const achievement of achievements) {
          const achievementConceptIds: string[] = achievement.concept_ids ?? [];
          if (achievementConceptIds.some((cid) => areEquivalent(dictionary, reqConceptId, cid))) {
            const set = conceptMatches.get(requirement.id) ?? new Set<string>();
            set.add(achievement.id);
            conceptMatches.set(requirement.id, set);
          }
          if (achievementConceptIds.some((cid) => areIncompatible(dictionary, reqConceptId, cid))) {
            const set = neverMergeExcluded.get(requirement.id) ?? new Set<string>();
            set.add(achievement.id);
            neverMergeExcluded.set(requirement.id, set);
          }
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

    const hints: MatchHints = { conceptMatches, neverMergeExcluded, similarityHints };

    const { data: resumeSections } = await supabase
      .from('resume_sections')
      .select('section_type, content')
      .eq('resume_id', resume.id);

    const skillsSection = resumeSections?.find((s) => s.section_type === 'skills');
    const skills = (skillsSection?.content as { skills?: string[] } | undefined)?.skills ?? [];

    const certificationsSection = resumeSections?.find((s) => s.section_type === 'certifications');
    const certifications = (certificationsSection?.content as { items?: { name: string; issuer?: string; date?: string }[] } | undefined)?.items ?? [];

    // Evidence matching (AI), given the deterministic concept/embedding hints above.
    const { matches: aiMatches, neverMergeViolationsStripped } = await matchRequirementsToAchievements(
      requirements.map((r) => ({ id: r.id, requirement_text: r.requirement_text, category: r.category, importance: r.importance })),
      achievements,
      resume.candidate_name || 'Candidate',
      skills,
      certifications,
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
