import { SupabaseClient } from '@supabase/supabase-js';

const RESUME_FOR_JOB_COLUMNS =
  'id, raw_text, candidate_name, candidate_email, candidate_phone, candidate_location, candidate_linkedin, candidate_website';

export interface ResumeForJob {
  id: string;
  raw_text: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  candidate_location: string | null;
  candidate_linkedin: string | null;
  candidate_website: string | null;
}

/**
 * Resolves which resume profile backs a given job: the one it was created
 * against (job.resume_id), falling back to the user's current default
 * ("master") resume for older jobs saved before multiple profiles existed.
 *
 * Carries that resume's own candidate identity (name/contact) so callers
 * never need a separate lookup against the shared profiles row — each
 * resume profile can represent a different identity (e.g. testing).
 */
export async function getResumeForJob(
  supabase: SupabaseClient,
  userId: string,
  jobResumeId: string | null | undefined
): Promise<ResumeForJob | null> {
  if (jobResumeId) {
    const { data } = await supabase
      .from('resumes')
      .select(RESUME_FOR_JOB_COLUMNS)
      .eq('id', jobResumeId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase
    .from('resumes')
    .select(RESUME_FOR_JOB_COLUMNS)
    .eq('user_id', userId)
    .eq('is_master', true)
    .maybeSingle();

  return data;
}
