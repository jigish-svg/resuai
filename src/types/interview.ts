export type InterviewQuestionCategory = 'behavioral' | 'technical' | 'role_specific' | 'company';

export interface InterviewQuestion {
  question: string;
  category: InterviewQuestionCategory;
  related_requirement?: string;
  talking_points: string;
  is_gap: boolean;
  gap_strategy?: string;
}

export interface SkillGapPrep {
  keyword: string;
  what_it_involves: string;
  how_to_prepare: string[];
  honest_talking_point: string;
}

export interface InterviewPrep {
  id: string;
  user_id: string;
  job_id: string;
  match_id?: string;
  questions: InterviewQuestion[];
  questions_to_ask: string[];
  skill_gaps: SkillGapPrep[];
  created_at: string;
  updated_at: string;
}
