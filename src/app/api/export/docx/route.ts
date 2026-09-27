import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ExportDocxBody, toSafeFileName } from '@/lib/api/schemas/documents';
import { createClient } from '@/lib/supabase/server';
import { buildResumeDocumentFromSections } from '@/lib/export/build-document';
import { generateResumeDOCX } from '@/lib/export/docx-generator';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { buildSectionsFromResume } from '@/lib/resume/build-sections-from-resume';

export const runtime = 'nodejs';

/**
 * Exports the job's stored, approved state — never the client-submitted
 * `sections` in the request body. That value is accepted for backward
 * compatibility with the existing client call but is never read here.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, ExportDocxBody);
  if (!body.ok) return body.response;
  const { fileName, jobId } = body.data;

  try {
    const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume first.');
    }

    const { data: tailoredResume } = await supabase
      .from('tailored_resumes')
      .select('sections')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let sections;
    if (tailoredResume) {
      sections = tailoredResume.sections;
    } else {
      const { data: resumeSections } = await supabase
        .from('resume_sections')
        .select('section_type, content, sort_order')
        .eq('resume_id', resume.id);
      sections = buildSectionsFromResume(resume, resumeSections ?? []);
    }

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
