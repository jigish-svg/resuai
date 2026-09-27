import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { RestoreVersionBody, ParsedResumeSchema } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { performResumeSave, ResumeTruthGuardBlockedError } from '@/lib/resume/perform-save';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import type { z } from 'zod';
import type { ResumeTemplate } from '@/types/resume';

export const runtime = 'nodejs';

const RESTORE_FAILED = 'Failed to restore this version. Please try again.';

interface UploadOrManualSnapshot {
  parsed: z.infer<typeof ParsedResumeSchema>;
  rawText: string;
  name?: string | null;
  template?: ResumeTemplate | null;
}

function isUploadOrManualSnapshot(snapshot: unknown): snapshot is UploadOrManualSnapshot {
  return !!snapshot && typeof snapshot === 'object' && 'parsed' in snapshot && 'rawText' in snapshot;
}

/**
 * Restoring an upload/manual_save/restore snapshot re-runs it through the same
 * performResumeSave path as an ordinary save (Steps 2-4's provenance/concept
 * logic applies unchanged), which itself records a new version tagged
 * 'restore'. A tailor_accept snapshot ({ jobId, sections }) is returned as-is
 * for the caller to re-apply through /api/tailor/save's own Truth Guard gate —
 * re-implementing that gate here is out of scope for this pass.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.resumeRestore));
  if (limited) return limited;

  const body = await parseJsonBody(request, RestoreVersionBody);
  if (!body.ok) return body.response;
  const { resumeId, versionId, confirmUnsupported } = body.data;

  try {
    const { data: resume } = await supabase.from('resumes').select('id').eq('id', resumeId).eq('user_id', user.id).maybeSingle();
    if (!resume) {
      return apiError('not_found', 'Resume not found.');
    }

    const { data: version } = await supabase
      .from('resume_versions')
      .select('id, snapshot')
      .eq('id', versionId)
      .eq('resume_id', resumeId)
      .maybeSingle();
    if (!version) {
      return apiError('not_found', 'Version not found.');
    }

    if (isUploadOrManualSnapshot(version.snapshot)) {
      const snapshot = version.snapshot;
      const { resumeId: savedId } = await performResumeSave(supabase, user.id, {
        parsed: snapshot.parsed,
        rawText: snapshot.rawText,
        name: snapshot.name ?? null,
        resumeId,
        template: snapshot.template ?? null,
        versionAction: 'restore',
        confirmUnsupported,
      });
      return NextResponse.json({ restored: true, resumeId: savedId });
    }

    // A tailor_accept snapshot: hand it back for the caller to re-apply via
    // /api/tailor/save, so it goes through that route's own Truth Guard gate
    // rather than bypassing it here.
    return NextResponse.json({ restored: false, snapshot: version.snapshot });
  } catch (error) {
    if (error instanceof ResumeTruthGuardBlockedError) {
      return apiError(
        'needs_confirmation',
        'Some content in this version could not be verified against your current resume. Review it and confirm to restore anyway.',
        { truthGuardStatus: error.truthGuardStatus, flags: error.flags }
      );
    }
    if (error && typeof error === 'object') {
      return rpcError(error as { code?: string; message?: string }, { notFound: 'Resume not found.', fallback: RESTORE_FAILED });
    }
    console.error('Restore resume version error:', error);
    return apiError('internal_error', RESTORE_FAILED);
  }
}
