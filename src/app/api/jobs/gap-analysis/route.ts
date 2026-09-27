import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { JobIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { computeRequirementGaps } from '@/lib/score/requirement-gap-analysis';
import { isMatchStale } from '@/lib/match/staleness';

export const runtime = 'nodejs';

/**
 * Read-only view over the job's most recent match — no new AI call, no new
 * matching. Reuses `fromLegacyMatch` (the exact classification the fit score
 * itself is built from) so this view can never disagree with the score.
 * Inferred requirements are excluded, same as scoring (rule 7).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, JobIdBody);
  if (!body.ok) return body.response;
  const { jobId } = body.data;

  try {
    const { data: job } = await supabase.from('jobs').select('id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }

    const { data: requirements, error: reqError } = await supabase
      .from('job_requirements')
      .select('id, requirement_text, category, importance, is_implied')
      .eq('job_id', jobId)
      .eq('is_implied', false)
      .order('sort_order');
    if (reqError) throw reqError;

    const { data: match } = await supabase
      .from('matches')
      .select('id, resume_id, created_at')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!match) {
      return apiError('conflict', 'Run a match for this job first.');
    }

    const { data: items, error: itemsError } = await supabase
      .from('match_items')
      .select('requirement_id, status, confidence')
      .eq('match_id', match.id);
    if (itemsError) throw itemsError;

    // Stale-match freshness (Phase C): the match reflects the resume as it was
    // when generated. If the resume was saved again since, flag it — the match
    // itself is left untouched (no rerun, no new AI call) for historical reference.
    const { data: resume } = await supabase.from('resumes').select('updated_at').eq('id', match.resume_id).eq('user_id', user.id).maybeSingle();
    const isStale = resume ? isMatchStale(match.created_at, resume.updated_at) : false;

    const itemByRequirement = new Map((items ?? []).map((i) => [i.requirement_id, i]));
    const gaps = computeRequirementGaps(requirements ?? [], itemByRequirement);

    return NextResponse.json({ ...gaps, isStale });
  } catch (error) {
    console.error('Job gap analysis error:', error);
    return apiError('internal_error', 'Failed to load gap analysis. Please try again.');
  }
}
