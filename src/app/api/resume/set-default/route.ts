import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ResumeIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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

    const { error: clearError } = await supabase.from('resumes').update({ is_master: false }).eq('user_id', user.id);
    if (clearError) throw clearError;

    const { error: setError } = await supabase.from('resumes').update({ is_master: true }).eq('id', resumeId);
    if (setError) throw setError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default resume error:', error);
    return apiError('internal_error', 'Failed to set default resume. Please try again.');
  }
}
