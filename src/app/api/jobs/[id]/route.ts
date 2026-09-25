import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { id as idSchema } from '@/lib/api/schemas/common';
import { UpdateJobBody } from '@/lib/api/schemas/jobs';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const JOB_NOT_FOUND = 'Job not found.';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }
  if (!idSchema.safeParse(id).success) {
    return apiError('not_found', JOB_NOT_FOUND);
  }

  const body = await parseJsonBody(request, UpdateJobBody);
  if (!body.ok) return body.response;
  const { status, notes } = body.data;

  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    updates.status = status;
    if (status === 'applied') {
      updates.applied_at = new Date().toISOString();
    }
  }
  if (notes !== undefined) updates.notes = notes;

  const { error } = await supabase.from('jobs').update(updates).eq('id', id).eq('user_id', user.id);
  if (error) {
    console.error('Job update error:', error);
    return apiError('internal_error', 'Failed to update the job. Please try again.');
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }
  if (!idSchema.safeParse(id).success) {
    return apiError('not_found', JOB_NOT_FOUND);
  }

  const { error } = await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id);
  if (error) {
    console.error('Job delete error:', error);
    return apiError('internal_error', 'Failed to delete the job. Please try again.');
  }

  return NextResponse.json({ success: true });
}
