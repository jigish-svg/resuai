import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TailorEditor from '@/components/tailor/TailorEditor';
import { getInitialTailoredSections } from '@/lib/tailor/get-initial-sections';

export default async function TailorPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase.from('jobs').select('id, title, company, resume_id').eq('id', jobId).eq('user_id', user!.id).single();
  if (!job) notFound();

  const { data: requirements } = await supabase
    .from('job_requirements')
    .select('id, requirement_text, category, importance')
    .eq('job_id', jobId)
    .order('sort_order');

  const { data: match } = await supabase
    .from('matches')
    .select('overall_score, skill_score, responsibility_score, experience_score, education_score, semantic_score, ats_score')
    .eq('job_id', jobId)
    .eq('user_id', user!.id)
    .maybeSingle();

  const initialSections = await getInitialTailoredSections(supabase, user!.id, jobId);

  const { data: resumeRow } = job.resume_id
    ? await supabase.from('resumes').select('template').eq('id', job.resume_id).eq('user_id', user!.id).maybeSingle()
    : { data: null };

  return (
    <TailorEditor
      jobId={jobId}
      jobTitle={job.title}
      jobCompany={job.company}
      requirements={requirements ?? []}
      match={match ?? null}
      initialSections={initialSections}
      template={resumeRow?.template ?? undefined}
    />
  );
}
