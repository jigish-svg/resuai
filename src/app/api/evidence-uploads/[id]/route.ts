import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { id as idSchema } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BUCKET = 'evidence-files';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }
  if (!idSchema.safeParse(id).success) {
    return apiError('not_found', 'Upload not found.');
  }

  try {
    const { data: upload } = await supabase
      .from('evidence_uploads')
      .select('id, file_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!upload) {
      return apiError('not_found', 'Upload not found.');
    }

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([upload.file_path]);
    if (storageError) throw storageError;

    const { error: deleteError } = await supabase.from('evidence_uploads').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Evidence upload delete error:', error);
    return apiError('internal_error', 'Failed to delete file. Please try again.');
  }
}
