import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BUCKET = 'evidence-files';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: upload } = await supabase
      .from('evidence_uploads')
      .select('id, file_path')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([upload.file_path]);
    if (storageError) throw storageError;

    const { error: deleteError } = await supabase.from('evidence_uploads').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Evidence upload delete error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
