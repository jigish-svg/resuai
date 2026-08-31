import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TailoredSection } from '@/types/match';
import { ResumeTemplate } from '@/types/resume';
import { buildResumeDocumentFromSections } from '@/lib/export/build-document';
import { generateResumePDF } from '@/lib/export/pdf-generator';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sections, fileName, jobId }: { sections: TailoredSection[]; fileName?: string; jobId?: string } = await request.json();
  if (!sections) {
    return NextResponse.json({ error: 'sections is required' }, { status: 400 });
  }

  try {
    let template: ResumeTemplate | undefined;
    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
      if (job?.resume_id) {
        const { data: resume } = await supabase.from('resumes').select('template').eq('id', job.resume_id).maybeSingle();
        template = resume?.template;
      }
    }

    const doc = buildResumeDocumentFromSections(sections, template);
    const pdfBuffer = await generateResumePDF(doc);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'resume'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
