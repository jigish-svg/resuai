import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TailoredSection } from '@/types/match';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId, sections, name }: { jobId: string; sections: TailoredSection[]; name?: string } = await request.json();
  if (!jobId || !sections) {
    return NextResponse.json({ error: 'jobId and sections are required' }, { status: 400 });
  }

  try {
    const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
    const resume = await getResumeForJob(supabase, user.id, job?.resume_id);
    if (!resume) {
      return NextResponse.json({ error: 'No master resume found' }, { status: 400 });
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
    const message = error instanceof Error ? error.message : 'Failed to save tailored resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
