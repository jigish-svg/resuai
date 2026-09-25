import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ExportDocxBody, toSafeFileName } from '@/lib/api/schemas/documents';
import { createClient } from '@/lib/supabase/server';
import { buildResumeDocumentFromSections } from '@/lib/export/build-document';
import { generateResumeDOCX } from '@/lib/export/docx-generator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, ExportDocxBody);
  if (!body.ok) return body.response;
  const { sections, fileName } = body.data;

  try {
    const doc = buildResumeDocumentFromSections(sections);
    const docxBuffer = await generateResumeDOCX(doc);

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${toSafeFileName(fileName, 'resume')}.docx"`,
      },
    });
  } catch (error) {
    console.error('DOCX export error:', error);
    return apiError('internal_error', 'Failed to generate DOCX. Please try again.');
  }
}
