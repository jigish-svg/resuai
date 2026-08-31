import { TailoredSection } from '@/types/match';
import { ParsedResume, ResumeTemplate } from '@/types/resume';
import { ResumeDocument } from '@/types/export';

function sectionContent<T>(sections: TailoredSection[], type: string): T | undefined {
  return sections.find((s) => s.section_type === type)?.content as T | undefined;
}

export function buildResumeDocumentFromSections(sections: TailoredSection[], template?: ResumeTemplate): ResumeDocument {
  const header = sectionContent<ResumeDocument['candidate']>(sections, 'header');
  const summary = sectionContent<{ text: string }>(sections, 'summary');
  const experience = sectionContent<{ experiences: ResumeDocument['experience'] }>(sections, 'experience');
  const skills = sectionContent<{ skills: string[] }>(sections, 'skills');
  const education = sectionContent<{ items: ResumeDocument['education'] }>(sections, 'education');
  const certifications = sectionContent<{ items: ResumeDocument['certifications'] }>(sections, 'certifications');

  return {
    candidate: header ?? { name: 'Candidate', email: '' },
    summary: summary?.text,
    experience: experience?.experiences ?? [],
    skills: skills?.skills ?? [],
    education: education?.items ?? [],
    certifications: certifications?.items ?? [],
    template,
  };
}

export function buildResumeDocumentFromParsedResume(resume: ParsedResume, template?: ResumeTemplate): ResumeDocument {
  return {
    candidate: resume.candidate,
    summary: resume.summary,
    experience: resume.experience.map((exp) => ({
      company: exp.company,
      job_title: exp.job_title,
      start_date: exp.start_date,
      end_date: exp.end_date,
      is_current: exp.is_current,
      location: exp.location,
      bullets: exp.achievements.map((a) => a.text),
    })),
    skills: resume.skills,
    education: resume.education,
    certifications: resume.certifications,
    template,
  };
}
