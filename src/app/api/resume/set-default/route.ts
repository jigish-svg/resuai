import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
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
    const { error } = await supabase.rpc('set_default_resume', { p_resume_id: resumeId });
    if (error) return rpcError(error, { notFound: 'Resume not found.', fallback: 'Failed to set default resume. Please try again.' });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default resume error:', error);
    return apiError('internal_error', 'Failed to set default resume. Please try again.');
  }
}
