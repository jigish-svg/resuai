import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { JobIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { computeRequirementGaps } from '@/lib/score/requirement-gap-analysis';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isMatchStale } from '@/lib/match/staleness';
import { buildFullTextFromSections } from '@/lib/tailor/build-full-text';

export const runtime = 'nodejs';

/**
 * Re-runs the exact same requirement classification as /api/jobs/gap-analysis
 * (same shared helper, same match data) — genuine gaps are structurally
 * incapable of changing here, since tailoring never writes to achievements,
 * projects, or match_items. The only thing that can change is which job
 * keywords the tailored wording now covers versus the master resume text —
 * a plain string comparison, no AI call, no new normalization.
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
    const { data: job } = await supabase.from('jobs').select('id, resume_id, keywords').eq('id', jobId).eq('user_id', user.id).maybeSingle();
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

    const { data: match } = await supabase.from('matches').select('id, resume_id, created_at').eq('job_id', jobId).eq('user_id', user.id).maybeSingle();
    if (!match) {
      return apiError('conflict', 'Run a match for this job first.');
    }

    const { data: items, error: itemsError } = await supabase
      .from('match_items')
      .select('requirement_id, status, confidence')
      .eq('match_id', match.id);
    if (itemsError) throw itemsError;

    // Stale-match freshness (Phase C): same check as /api/jobs/gap-analysis —
    // no rerun, no new AI call, just a flag on the existing (untouched) match.
    const { data: matchResume } = await supabase.from('resumes').select('updated_at').eq('id', match.resume_id).eq('user_id', user.id).maybeSingle();
    const isStale = matchResume ? isMatchStale(match.created_at, matchResume.updated_at) : false;

    const itemByRequirement = new Map((items ?? []).map((i) => [i.requirement_id, i]));
    const gaps = computeRequirementGaps(requirements ?? [], itemByRequirement);

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    const masterText = (resume?.raw_text ?? '').toLowerCase();
    const keywords: string[] = job.keywords ?? [];

    const { data: tailoredResume } = await supabase
      .from('tailored_resumes')
      .select('sections')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let presentationImproved: string[] = [];
    if (tailoredResume) {
      const tailoredText = buildFullTextFromSections(tailoredResume.sections).toLowerCase();
      presentationImproved = keywords.filter((k) => !masterText.includes(k.toLowerCase()) && tailoredText.includes(k.toLowerCase()));
    }

    return NextResponse.json({ ...gaps, presentationImproved, hasTailoredResume: !!tailoredResume, isStale });
  } catch (error) {
    console.error('Post-tailoring gap analysis error:', error);
    return apiError('internal_error', 'Failed to load gap analysis. Please try again.');
  }
}
