import { ParsedCertification, ParsedEducation, ResumeTemplate } from './resume';

export interface ResumeDocument {
  candidate: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: ResumeDocumentExperience[];
  skills: string[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  template?: ResumeTemplate;
}

export interface ResumeDocumentExperience {
  company: string;
  job_title: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  location?: string;
  bullets: string[];
}
