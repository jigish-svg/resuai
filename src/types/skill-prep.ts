export type StudyMaterialType = 'video' | 'article' | 'course' | 'docs';

export interface StudyMaterial {
  type: StudyMaterialType;
  title: string;
  description: string;
  url: string;
  /** Realistic time to work through it, e.g. "25 min read" — lets someone judge if it fits before tomorrow's interview. */
  estimated_time?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export type SkillPrepStatus = 'not_started' | 'studying' | 'quiz' | 'passed' | 'failed' | 'added_to_resume';

export interface SkillPrepPlan {
  id: string;
  user_id: string;
  job_id: string;
  skill: string;
  what_it_involves: string;
  study_materials: StudyMaterial[];
  quiz_questions: QuizQuestion[];
  asked_questions: string[];
  status: SkillPrepStatus;
  quiz_score: number | null;
  quiz_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface QuizResultItem {
  question: string;
  options: string[];
  correct_index: number;
  selected_index: number;
  explanation: string;
}
