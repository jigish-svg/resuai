import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { SaveTailoredBody } from '@/lib/api/schemas/tailor';
import { createClient } from '@/lib/supabase/server';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, SaveTailoredBody);
  if (!body.ok) return body.response;
  const { jobId, sections, name } = body.data;

  try {
    const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }
    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume first.');
    }

    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: tailoredResumeId, error } = await supabase.rpc('save_tailored_resume', {
      p_job_id: jobId,
      p_base_resume_id: resume.id,
      p_match_id: match?.id ?? null,
      p_name: name ?? null,
      p_sections: sections,
    });
    if (error) return rpcError(error, { notFound: 'Job not found.', fallback: 'Failed to save tailored resume. Please try again.' });

    return NextResponse.json({ tailoredResumeId });
  } catch (error) {
    console.error('Tailored resume save error:', error);
    return apiError('internal_error', 'Failed to save tailored resume. Please try again.');
  }
}
