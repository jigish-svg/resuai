import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ResumeIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Lists meaningful saved states for a resume, newest first. No snapshot payload — kept lightweight. */
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

    const { data: versions, error } = await supabase
      .from('resume_versions')
      .select('id, label, created_by_action, created_at')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ versions: versions ?? [] });
  } catch (error) {
    console.error('List resume versions error:', error);
    return apiError('internal_error', 'Failed to load versions. Please try again.');
  }
}
