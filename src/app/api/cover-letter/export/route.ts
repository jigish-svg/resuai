import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ExportCoverLetterBody, toSafeFileName } from '@/lib/api/schemas/documents';
import { createClient } from '@/lib/supabase/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, ExportCoverLetterBody);
  if (!body.ok) return body.response;
  const { content, fileName } = body.data;

  try {
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((block) => new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: block.trim(), size: 22 })] }));

    const doc = new Document({
      sections: [
        {
          properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } },
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${toSafeFileName(fileName, 'cover_letter')}.docx"`,
      },
    });
  } catch (error) {
    console.error('Cover letter export error:', error);
    return apiError('internal_error', 'Failed to export cover letter. Please try again.');
  }
}
