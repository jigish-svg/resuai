import { SupabaseClient } from '@supabase/supabase-js';
import { TailoredSection } from '@/types/match';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';

export async function getInitialTailoredSections(
  supabase: SupabaseClient,
  userId: string,
  jobId: string
): Promise<TailoredSection[]> {
  const { data: existingTailored } = await supabase
    .from('tailored_resumes')
    .select('sections')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingTailored) {
    return existingTailored.sections as TailoredSection[];
  }

  const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', userId).maybeSingle();
  const resume = await getResumeForJob(supabase, userId, job?.resume_id);

  if (!resume) {
    return [];
  }

  const { data: sections } = await supabase
    .from('resume_sections')
    .select('section_type, content, sort_order')
    .eq('resume_id', resume.id)
    .order('sort_order');

  return [
    {
      section_type: 'header',
      sort_order: -1,
      content: {
        name: resume.candidate_name || '',
        email: resume.candidate_email || '',
        phone: resume.candidate_phone,
        location: resume.candidate_location,
        linkedin: resume.candidate_linkedin,
        website: resume.candidate_website,
      },
    },
    ...((sections ?? []) as unknown as TailoredSection[]),
  ];
}
