import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertFileWithinLimit, UploadLimitError } from '@/lib/validation/upload-limits';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const BUCKET = 'evidence-files';
const MAX_DESCRIPTION_LENGTH = 500;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.evidenceUpload))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const resumeId = formData.get('resumeId') as string | null;
  const description = ((formData.get('description') as string | null) ?? '').slice(0, MAX_DESCRIPTION_LENGTH);

  if (!file || !resumeId) {
    return NextResponse.json({ error: 'file and resumeId are required' }, { status: 400 });
  }

  try {
    assertFileWithinLimit(file);

    const { data: resume } = await supabase
      .from('resumes')
      .select('id')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const filePath = `${user.id}/${resumeId}/${crypto.randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: file.type || undefined,
    });
    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await supabase
      .from('evidence_uploads')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        file_path: filePath,
        file_name: file.name,
        description,
        content_type: file.type || null,
        size_bytes: file.size,
      })
      .select('id, file_name, description, created_at')
      .single();
    if (insertError) throw insertError;

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);

    return NextResponse.json({
      upload: {
        id: inserted.id,
        fileName: inserted.file_name,
        description: inserted.description,
        createdAt: inserted.created_at,
        viewUrl: signed?.signedUrl ?? null,
      },
    });
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error('Evidence upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
