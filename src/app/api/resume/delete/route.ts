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
    const { data: resume } = await supabase
      .from('resumes')
      .select('id, is_master')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!resume) {
      return apiError('not_found', 'Resume not found.');
    }

    const { error: deleteError } = await supabase.from('resumes').delete().eq('id', resumeId);
    if (deleteError) throw deleteError;

    if (resume.is_master) {
      const { data: another } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (another) {
        await supabase.from('resumes').update({ is_master: true }).eq('id', another.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete resume error:', error);
    return apiError('internal_error', 'Failed to delete resume. Please try again.');
  }
}
