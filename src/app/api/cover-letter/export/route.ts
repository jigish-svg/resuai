import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { content, fileName }: { content: string; fileName?: string } = await request.json();
  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

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
        'Content-Disposition': `attachment; filename="${fileName || 'cover_letter'}.docx"`,
      },
    });
  } catch (error) {
    console.error('Cover letter export error:', error);
    const message = error instanceof Error ? error.message : 'Failed to export cover letter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
