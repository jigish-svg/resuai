export type CandidateDataSource = 'ai_parsed' | 'user_stated' | 'externally_verified';

/**
 * Provenance describes where a piece of candidate data came from, not the save
 * action that touched the row it lives in. A fresh resume (no resumeId) is
 * straight from parsing, so every achievement/project is ai_parsed. On an
 * update, an item whose identifying content already existed keeps whatever
 * source it already had — editing the phone number must not turn an
 * untouched, previously-parsed bullet or project into user_stated. Only new
 * or textually changed content is attributed to the user editing it just now.
 * This never infers externally_verified: that value is only ever set by an
 * actual outside verification path, which doesn't exist yet. Used for both
 * achievements and projects — the rule is identical for any candidate-data
 * item keyed by its own identifying fields.
 */
export function determineCandidateSource(
  resumeId: string | null | undefined,
  existingSource: CandidateDataSource | undefined
): CandidateDataSource {
  if (!resumeId) return 'ai_parsed';
  return existingSource ?? 'user_stated';
}
