export type MatchStatus = 'matched' | 'partial' | 'no_evidence';
export type MatchConfidence = 'high' | 'medium' | 'low';

export interface Match {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string;
  overall_score: number;
  skill_score: number;
  responsibility_score: number;
  experience_score: number;
  education_score: number;
  semantic_score: number;
  ats_score: number;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchItem {
  id: string;
  match_id: string;
  requirement_id: string;
  achievement_id?: string;
  status: MatchStatus;
  confidence: MatchConfidence;
  evidence_text?: string;
  explanation?: string;
}

export interface MatchResult {
  match: Match;
  items: MatchItemWithDetails[];
  strongMatches: MatchItemWithDetails[];
  partialMatches: MatchItemWithDetails[];
  missingItems: MatchItemWithDetails[];
}

export interface MatchItemWithDetails extends MatchItem {
  requirement: {
    requirement_text: string;
    category: string;
    importance: string;
  };
  achievement?: {
    achievement_text: string;
    company: string;
    job_title: string;
  };
}

export interface TailoredResume {
  id: string;
  user_id: string;
  job_id: string;
  base_resume_id: string;
  match_id: string;
  name: string;
  sections: TailoredSection[];
  selected_achievement_ids: string[];
  ats_score?: number;
  truth_guard_passed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TailoredSection {
  section_type: string;
  content: unknown;
  sort_order: number;
}

export interface TruthGuardFlag {
  text: string;
  reason: string;
  source: 'ai_generated' | 'not_in_resume';
}

export interface ATSCheckResult {
  score: number;
  checks: ATSCheck[];
}

export interface ATSCheck {
  label: string;
  passed: boolean;
  message?: string;
}
