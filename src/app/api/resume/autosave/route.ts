import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { AutosaveBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Saves in-progress editing state, separate from real candidate data and
 * never validated against the full resume schema — a draft is expected to be
 * mid-edit. One row per resume (upsert), never a version (Step 8).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, AutosaveBody);
  if (!body.ok) return body.response;
  const { resumeId, draft } = body.data;

  try {
    const { data: resume } = await supabase.from('resumes').select('id').eq('id', resumeId).eq('user_id', user.id).maybeSingle();
    if (!resume) {
      return apiError('not_found', 'Resume not found.');
    }

    const { error } = await supabase.from('resume_autosave_state').upsert({ resume_id: resumeId, draft }, { onConflict: 'resume_id' });
    if (error) throw error;

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Autosave error:', error);
    return apiError('internal_error', 'Failed to autosave. Please try again.');
  }
}
