import { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/errors';

export interface RateLimitConfig {
  bucket: string;
  maxRequests: number;
  windowSeconds: number;
  /**
   * What to do when the limiter itself fails. Routes that call a model use
   * 'deny' (PRD 21: expensive AI routes fail closed), so an outage can never
   * mean unlimited model calls.
   */
  onError: 'deny' | 'allow';
}

export type RateLimitResult = 'allowed' | 'limited' | 'unavailable';

/**
 * Checks and records one request against a per-user, per-bucket limit via
 * the `check_rate_limit` Postgres function (see migration 013). That
 * function runs as SECURITY DEFINER against a table with no direct
 * user-facing policies, so a user can't reset their own counter by calling
 * the table directly the way they could with a plain client-writable table.
 *
 * Any failure (RPC error, thrown call, unexpected answer) is logged and then
 * resolved by the bucket's onError setting.
 */
export async function checkRateLimit(supabase: SupabaseClient, config: RateLimitConfig): Promise<RateLimitResult> {
  let failure: unknown;
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_bucket: config.bucket,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });
    if (!error && typeof data === 'boolean') {
      return data ? 'allowed' : 'limited';
    }
    failure = error ?? new Error(`Unexpected rate limit answer: ${JSON.stringify(data)}`);
  } catch (error) {
    failure = error;
  }

  console.error(`Rate limit check failed for bucket "${config.bucket}" (${config.onError}):`, failure);
  return config.onError === 'allow' ? 'allowed' : 'unavailable';
}

export const RATE_LIMIT_MESSAGE = "You've hit the hourly limit for this feature. Please wait a bit and try again.";
const LIMITER_UNAVAILABLE_MESSAGE = 'This feature is briefly unavailable. Please try again in a minute.';

/** The response to send when a request may not proceed, or null when it may. */
export function rateLimitResponse(result: RateLimitResult) {
  if (result === 'limited') return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  if (result === 'unavailable') return apiError('internal_error', LIMITER_UNAVAILABLE_MESSAGE);
  return null;
}

const HOUR = 3600;

// Generous enough for real usage, tight enough to block scripted abuse.
export const RATE_LIMITS = {
  resumeParse: { bucket: 'resume_parse', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  jobParse: { bucket: 'job_parse', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  // Resume save computes embeddings, so it is a model call too.
  resumeSave: { bucket: 'resume_save', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  match: { bucket: 'match', maxRequests: 30, windowSeconds: HOUR, onError: 'deny' },
  tailorPlan: { bucket: 'tailor_plan', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  tailorRewrite: { bucket: 'tailor_rewrite', maxRequests: 60, windowSeconds: HOUR, onError: 'deny' },
  tailorOptimizeAts: { bucket: 'tailor_optimize_ats', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  truthGuard: { bucket: 'truth_guard', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  interviewPrep: { bucket: 'interview_prep', maxRequests: 15, windowSeconds: HOUR, onError: 'deny' },
  coverLetter: { bucket: 'cover_letter', maxRequests: 15, windowSeconds: HOUR, onError: 'deny' },
  resumeRewriteText: { bucket: 'resume_rewrite_text', maxRequests: 60, windowSeconds: HOUR, onError: 'deny' },
  suggestSkills: { bucket: 'suggest_skills', maxRequests: 20, windowSeconds: HOUR, onError: 'deny' },
  skillPrepStart: { bucket: 'skill_prep_start', maxRequests: 15, windowSeconds: HOUR, onError: 'deny' },
  skillPrepQuiz: { bucket: 'skill_prep_quiz', maxRequests: 30, windowSeconds: HOUR, onError: 'deny' },
  mockInterviewStart: { bucket: 'mock_interview_start', maxRequests: 15, windowSeconds: HOUR, onError: 'deny' },
  mockInterviewFinalize: { bucket: 'mock_interview_finalize', maxRequests: 15, windowSeconds: HOUR, onError: 'deny' },
  // No model call; a limiter outage should not stop people keeping their files.
  evidenceUpload: { bucket: 'evidence_upload', maxRequests: 20, windowSeconds: HOUR, onError: 'allow' },
} as const satisfies Record<string, RateLimitConfig>;
