import { SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  bucket: string;
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Checks and records one request against a per-user, per-bucket limit via
 * the `check_rate_limit` Postgres function (see migration 013). That
 * function runs as SECURITY DEFINER against a table with no direct
 * user-facing policies, so a user can't reset their own counter by calling
 * the table directly the way they could with a plain client-writable table.
 *
 * Fails OPEN on unexpected errors (allows the request) — a broken limiter
 * should never be the reason a paying user can't use the product.
 */
export async function checkRateLimit(supabase: SupabaseClient, config: RateLimitConfig): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: config.bucket,
    p_max_requests: config.maxRequests,
    p_window_seconds: config.windowSeconds,
  });
  if (error) {
    console.error(`Rate limit check failed for bucket "${config.bucket}":`, error);
    return true;
  }
  return data === true;
}

const HOUR = 3600;

// Generous enough for real usage, tight enough to block scripted abuse.
export const RATE_LIMITS = {
  resumeParse: { bucket: 'resume_parse', maxRequests: 20, windowSeconds: HOUR },
  jobParse: { bucket: 'job_parse', maxRequests: 20, windowSeconds: HOUR },
  resumeSave: { bucket: 'resume_save', maxRequests: 20, windowSeconds: HOUR },
  match: { bucket: 'match', maxRequests: 30, windowSeconds: HOUR },
  tailorPlan: { bucket: 'tailor_plan', maxRequests: 20, windowSeconds: HOUR },
  tailorRewrite: { bucket: 'tailor_rewrite', maxRequests: 60, windowSeconds: HOUR },
  tailorOptimizeAts: { bucket: 'tailor_optimize_ats', maxRequests: 20, windowSeconds: HOUR },
  truthGuard: { bucket: 'truth_guard', maxRequests: 20, windowSeconds: HOUR },
  interviewPrep: { bucket: 'interview_prep', maxRequests: 15, windowSeconds: HOUR },
  coverLetter: { bucket: 'cover_letter', maxRequests: 15, windowSeconds: HOUR },
  resumeRewriteText: { bucket: 'resume_rewrite_text', maxRequests: 60, windowSeconds: HOUR },
  suggestSkills: { bucket: 'suggest_skills', maxRequests: 20, windowSeconds: HOUR },
  skillPrepStart: { bucket: 'skill_prep_start', maxRequests: 15, windowSeconds: HOUR },
  skillPrepQuiz: { bucket: 'skill_prep_quiz', maxRequests: 30, windowSeconds: HOUR },
  interviewChat: { bucket: 'interview_chat', maxRequests: 30, windowSeconds: HOUR },
  mockInterviewStart: { bucket: 'mock_interview_start', maxRequests: 15, windowSeconds: HOUR },
  mockInterviewFinalize: { bucket: 'mock_interview_finalize', maxRequests: 15, windowSeconds: HOUR },
  evidenceUpload: { bucket: 'evidence_upload', maxRequests: 20, windowSeconds: HOUR },
} as const satisfies Record<string, RateLimitConfig>;

export const RATE_LIMIT_MESSAGE = "You've hit the hourly limit for this feature. Please wait a bit and try again.";
