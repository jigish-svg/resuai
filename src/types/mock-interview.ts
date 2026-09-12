import { InterviewQuestionCategory } from './interview';

export interface MockInterviewSessionQuestion {
  question: string;
  category: InterviewQuestionCategory;
  is_gap: boolean;
}

export interface MockInterviewTranscriptEntry {
  role: 'interviewer' | 'candidate';
  text: string;
}

export interface MockInterviewSummary {
  readiness_score: number;
  summary: string;
  strengths: string[];
  focus_areas: string[];
}

export interface MockInterviewSession {
  id: string;
  user_id: string;
  job_id: string;
  interview_prep_id: string | null;
  questions: MockInterviewSessionQuestion[];
  transcript: MockInterviewTranscriptEntry[];
  overall_feedback: MockInterviewSummary | null;
  status: 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}
