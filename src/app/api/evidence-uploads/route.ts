import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { getFile, parseFormFields, readFormData } from '@/lib/api/parse-body';
import { EvidenceUploadFields } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { assertFileWithinLimit, UploadLimitError } from '@/lib/validation/upload-limits';
import { detectFileType, FILE_TYPES, sanitizeFileName } from '@/lib/validation/file-type';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const BUCKET = 'evidence-files';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.evidenceUpload));
  if (limited) return limited;

  const form = await readFormData(request);
  if (!form.ok) return form.response;
  const fields = parseFormFields(form.data, EvidenceUploadFields, ['file']);
  if (!fields.ok) return fields.response;
  const { resumeId } = fields.data;
  const description = fields.data.description ?? '';
  const file = getFile(form.data, 'file');
  if (!file) {
    return apiError('validation_failed', 'Please choose a file to upload.');
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
      return apiError('not_found', 'Resume not found.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Type, storage key and served content type all come from the bytes; the
    // browser-supplied name and MIME type are never trusted.
    const type = detectFileType(buffer);
    if (!type) {
      return apiError('unsupported_media_type', 'Please upload a PDF, Word document, PNG or JPEG.');
    }
    const { mime, ext } = FILE_TYPES[type];
    const fileName = sanitizeFileName(file.name);
    const filePath = `${user.id}/${resumeId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: mime,
    });
    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await supabase
      .from('evidence_uploads')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        file_path: filePath,
        file_name: fileName,
        description,
        content_type: mime,
        size_bytes: file.size,
      })
      .select('id, file_name, description, created_at')
      .single();
    if (insertError) {
      // Storage and the database cannot share a transaction: undo the upload so
      // no file is left without a row pointing at it.
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([filePath]);
      if (cleanupError) console.error('Evidence upload cleanup failed:', filePath, cleanupError);
      throw insertError;
    }

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
      return apiError('payload_too_large', error.message);
    }
    console.error('Evidence upload error:', error);
    return apiError('internal_error', 'Failed to upload file. Please try again.');
  }
}
