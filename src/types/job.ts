export type RequirementImportance = 'critical' | 'high' | 'medium' | 'low';
export type RequirementCategory = 'hard_skill' | 'soft_skill' | 'responsibility' | 'experience' | 'education' | 'certification' | 'technology';

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company?: string;
  location?: string;
  job_type?: string;
  seniority?: string;
  raw_text: string;
  source_url?: string;
  keywords: string[];
  resume_id?: string;
  status: JobStatus;
  deadline?: string;
  applied_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 
  | 'saved' 
  | 'tailoring' 
  | 'ready' 
  | 'applied' 
  | 'recruiter_screen' 
  | 'interview' 
  | 'offer' 
  | 'rejected' 
  | 'withdrawn';

export interface JobRequirement {
  id: string;
  job_id: string;
  requirement_text: string;
  category: RequirementCategory;
  importance: RequirementImportance;
  sort_order: number;
  is_implied: boolean;
}

export interface ParsedJobDescription {
  job_title: string;
  company?: string;
  location?: string;
  job_type?: string;
  seniority?: string;
  summary?: string;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  education_requirements: string[];
  certifications: string[];
  experience_requirements: string[];
  soft_skills: string[];
  technologies: string[];
  keywords: string[];
  salary_range?: string;
}
