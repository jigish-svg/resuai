import type { z } from 'zod';
import type { ParsedResumeSchema } from '@/lib/api/schemas/resume';
import type { ResumeTemplate } from '@/types/resume';

// The validated request shape: optional fields may be null as well as absent.
type ParsedResumeInput = z.infer<typeof ParsedResumeSchema>;

export interface ResumeRowPayload {
  // Null keeps the current name on update; default_name is used on create.
  name: string | null;
  default_name: string;
  raw_text: string;
  template: ResumeTemplate | null;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  candidate_location: string | null;
  candidate_linkedin: string | null;
  candidate_website: string | null;
}

export interface SectionPayload {
  section_type: 'summary' | 'experience' | 'skills' | 'education' | 'certifications';
  content: unknown;
  sort_order: number;
}

export interface AchievementPayload {
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
  dates: string;
  /** Canonical concept ids resolved from `skills` via the concept dictionary; filled in by the save route, not this builder. */
  concept_ids?: string[];
  embedding_model?: string | null;
  /** ai_parsed | user_stated | externally_verified; filled in by the save route by comparing against the resume's existing achievements, not this builder. */
  source?: string;
}

export interface ProjectPayload {
  name: string;
  description: string;
  role: string | null;
  technologies: string[];
  metrics: string[];
  start_date: string | null;
  end_date: string | null;
  link: string | null;
  /** Canonical concept ids resolved from `technologies` via the concept dictionary; filled in by the save route, not this builder. */
  concept_ids?: string[];
  /** ai_parsed | user_stated | externally_verified; filled in by the save route by comparing against the resume's existing projects, not this builder. */
  source?: string;
}

/** Everything save_resume writes, built before the RPC so the DB write is one step. */
export function buildResumeSavePayload(
  parsed: ParsedResumeInput,
  rawText: string,
  { name, template }: { name?: string | null; template?: ResumeTemplate | null }
): { resume: ResumeRowPayload; sections: SectionPayload[]; achievements: AchievementPayload[]; projects: ProjectPayload[] } {
  const firstTitle = parsed.experience[0]?.job_title;

  const resume: ResumeRowPayload = {
    name: name || null,
    default_name: firstTitle ? `${firstTitle} Resume` : 'Resume',
    raw_text: rawText,
    template: template || null,
    candidate_name: parsed.candidate.name,
    candidate_email: parsed.candidate.email,
    candidate_phone: parsed.candidate.phone ?? null,
    candidate_location: parsed.candidate.location ?? null,
    candidate_linkedin: parsed.candidate.linkedin ?? null,
    candidate_website: parsed.candidate.website ?? null,
  };

  const sections: SectionPayload[] = [
    { section_type: 'summary', content: { text: parsed.summary ?? '' }, sort_order: 0 },
    {
      section_type: 'experience',
      content: {
        experiences: parsed.experience.map((exp) => ({
          company: exp.company,
          job_title: exp.job_title,
          start_date: exp.start_date,
          end_date: exp.end_date,
          is_current: exp.is_current,
          location: exp.location,
          bullets: exp.achievements.map((a) => a.text),
        })),
      },
      sort_order: 1,
    },
    { section_type: 'skills', content: { skills: parsed.skills }, sort_order: 2 },
    { section_type: 'education', content: { items: parsed.education }, sort_order: 3 },
    { section_type: 'certifications', content: { items: parsed.certifications }, sort_order: 4 },
  ];

  const achievements = parsed.experience.flatMap((exp) =>
    exp.achievements.map((a) => ({
      company: exp.company,
      job_title: exp.job_title,
      achievement_text: a.text,
      skills: a.skills,
      metrics: a.metrics,
      dates: exp.is_current ? `${exp.start_date} - Present` : `${exp.start_date} - ${exp.end_date ?? ''}`,
    }))
  );

  const projects: ProjectPayload[] = (parsed.projects ?? []).map((p) => ({
    name: p.name,
    description: p.description,
    role: p.role ?? null,
    technologies: p.technologies,
    metrics: p.metrics,
    start_date: p.start_date ?? null,
    end_date: p.end_date ?? null,
    link: p.link ?? null,
  }));

  return { resume, sections, achievements, projects };
}
