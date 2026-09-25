import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
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
    const resume = await getResumeForJob(supabase, user.id, job?.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume first.');
    }

    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: existing } = await supabase
      .from('tailored_resumes')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let tailoredResumeId: string;

    if (existing) {
      const { error } = await supabase
        .from('tailored_resumes')
        .update({ sections, name: name || 'Tailored Resume', match_id: match?.id })
        .eq('id', existing.id);
      if (error) throw error;
      tailoredResumeId = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from('tailored_resumes')
        .insert({
          user_id: user.id,
          job_id: jobId,
          base_resume_id: resume.id,
          match_id: match?.id,
          name: name || 'Tailored Resume',
          sections,
        })
        .select('id')
        .single();
      if (error) throw error;
      tailoredResumeId = inserted.id;
    }

    await supabase.from('jobs').update({ status: 'ready' }).eq('id', jobId).eq('user_id', user.id);

    return NextResponse.json({ tailoredResumeId });
  } catch (error) {
    console.error('Tailored resume save error:', error);
    return apiError('internal_error', 'Failed to save tailored resume. Please try again.');
  }
}
