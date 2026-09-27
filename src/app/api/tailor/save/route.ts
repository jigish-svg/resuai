import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { SaveTailoredBody } from '@/lib/api/schemas/tailor';
import { createClient } from '@/lib/supabase/server';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { runTruthGuard } from '@/lib/openai/tailoring-engine';
import { classifyTruthGuardResult } from '@/lib/openai/truth-guard-gate';
import { buildFullTextFromSections } from '@/lib/tailor/build-full-text';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, SaveTailoredBody);
  if (!body.ok) return body.response;
  const { jobId, sections, name, confirmUnsupported } = body.data;

  try {
    const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }
    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume first.');
    }

    // Truth Guard is the mandatory, unbypassable gate: built here from the
    // request's own validated `sections`, never from anything else a client
    // might send, and re-run fresh on every save regardless of what any earlier
    // (non-persisting) generation route may have already reported.
    const fullText = buildFullTextFromSections(sections);
    const truthGuardResult = resume.raw_text ? await runTruthGuard(fullText, resume.raw_text) : { flags: [], passed: false };
    const truthGuardStatus = resume.raw_text ? classifyTruthGuardResult(truthGuardResult) : 'needs_review';

    if (truthGuardStatus !== 'supported' && !confirmUnsupported) {
      return apiError(
        'needs_confirmation',
        'Some content could not be verified against your resume. Review it and confirm to save anyway.',
        { truthGuardStatus, flags: truthGuardResult.flags }
      );
    }

    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    // A tailored resume only ever reaches this point via user action (either
    // Truth Guard passed outright, or the user explicitly confirmed a flagged
    // result) — per the contract's evidence model, that acceptance moment is
    // what makes it candidate data, always as user_stated. Provenance records
    // the confirmed-override case specifically, reusing the Truth Guard result
    // already computed above rather than recomputing anything.
    const isConfirmedOverride = truthGuardStatus !== 'supported' && !!confirmUnsupported;
    const source = 'user_stated';
    const provenance = isConfirmedOverride
      ? { origin: 'ai_draft_confirmed_unsupported', truth_guard_status: truthGuardStatus, truth_guard_flags: truthGuardResult.flags }
      : null;

    const { data: tailoredResumeId, error } = await supabase.rpc('save_tailored_resume', {
      p_job_id: jobId,
      p_base_resume_id: resume.id,
      p_match_id: match?.id ?? null,
      p_name: name ?? null,
      p_sections: sections,
      p_truth_guard_status: truthGuardStatus,
      p_truth_guard_flags: truthGuardResult.flags,
      p_truth_guard_passed: truthGuardStatus === 'supported',
      p_truth_guard_confirmed_unsupported: isConfirmedOverride,
      p_source: source,
      p_provenance: provenance,
    });
    if (error) return rpcError(error, { notFound: 'Job not found.', fallback: 'Failed to save tailored resume. Please try again.' });

    return NextResponse.json({ tailoredResumeId, truthGuardStatus, source, provenance });
  } catch (error) {
    console.error('Tailored resume save error:', error);
    return apiError('internal_error', 'Failed to save tailored resume. Please try again.');
  }
}
