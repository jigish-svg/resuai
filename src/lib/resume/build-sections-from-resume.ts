import { TailoredSection } from '@/types/match';
import { ResumeForJob } from './get-resume-for-job';

interface ResumeSectionRow {
  section_type: string;
  content: unknown;
  sort_order: number;
}

/**
 * Reconstructs the same TailoredSection[] shape the tailoring flow already
 * uses, from a resume's own stored state — no tailoring involved. The header
 * isn't stored in resume_sections (candidate identity lives on the resumes
 * row itself), so it's synthesized here from the already-fetched resume
 * fields. Used wherever "this resume's current approved sections" is needed
 * without a tailored_resumes row to read instead (export, version restore).
 */
export function buildSectionsFromResume(resume: ResumeForJob, resumeSections: ResumeSectionRow[]): TailoredSection[] {
  const header: TailoredSection = {
    section_type: 'header',
    sort_order: -1,
    content: {
      name: resume.candidate_name ?? '',
      email: resume.candidate_email ?? '',
      phone: resume.candidate_phone ?? undefined,
      location: resume.candidate_location ?? undefined,
      linkedin: resume.candidate_linkedin ?? undefined,
      website: resume.candidate_website ?? undefined,
    },
  };

  return [header, ...resumeSections.map((s) => ({ section_type: s.section_type, content: s.content, sort_order: s.sort_order }))];
}
