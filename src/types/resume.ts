export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'compact';

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  source_file?: string;
  raw_text?: string;
  version: number;
  is_master: boolean;
  template?: ResumeTemplate;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  candidate_location?: string;
  candidate_linkedin?: string;
  candidate_website?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeSection {
  id: string;
  resume_id: string;
  section_type: 'summary' | 'experience' | 'skills' | 'education' | 'certifications' | 'custom';
  content: SectionContent;
  sort_order: number;
}

export interface SectionContent {
  [key: string]: unknown;
}

export interface Experience {
  id?: string;
  company: string;
  job_title: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  location?: string;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  resume_id: string;
  company: string;
  job_title: string;
  achievement_text: string;
  skills: string[];
  metrics: string[];
  dates?: string;
  source: 'upload' | 'manual' | 'ai_parsed';
  confidence: number;
  embedding?: number[];
}

export interface ParsedResume {
  candidate: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: ParsedExperience[];
  skills: string[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
}

export interface ParsedExperience {
  company: string;
  job_title: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  location?: string;
  achievements: ParsedAchievement[];
}

export interface ParsedAchievement {
  text: string;
  skills: string[];
  metrics: string[];
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  field?: string;
  graduation_date?: string;
  gpa?: string;
}

export interface ParsedCertification {
  name: string;
  issuer?: string;
  date?: string;
  expiry?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  website?: string;
  created_at: string;
}
