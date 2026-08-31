import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TailoredSection } from '@/types/match';
import { buildResumeDocumentFromSections } from '@/lib/export/build-document';
import { generateResumeDOCX } from '@/lib/export/docx-generator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sections, fileName }: { sections: TailoredSection[]; fileName?: string } = await request.json();
  if (!sections) {
    return NextResponse.json({ error: 'sections is required' }, { status: 400 });
  }

  try {
    const doc = buildResumeDocumentFromSections(sections);
    const docxBuffer = await generateResumeDOCX(doc);

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName || 'resume'}.docx"`,
      },
    });
  } catch (error) {
    console.error('DOCX export error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate DOCX';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
