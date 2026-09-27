import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ResumeIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Returns the resume's current autosaved draft, or null if none exists. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, ResumeIdBody);
  if (!body.ok) return body.response;
  const { resumeId } = body.data;

  try {
    const { data: resume } = await supabase.from('resumes').select('id').eq('id', resumeId).eq('user_id', user.id).maybeSingle();
    if (!resume) {
      return apiError('not_found', 'Resume not found.');
    }

    const { data: state } = await supabase.from('resume_autosave_state').select('draft, updated_at').eq('resume_id', resumeId).maybeSingle();

    return NextResponse.json({ draft: state?.draft ?? null, updatedAt: state?.updated_at ?? null });
  } catch (error) {
    console.error('Get autosave error:', error);
    return apiError('internal_error', 'Failed to load autosave. Please try again.');
  }
}
