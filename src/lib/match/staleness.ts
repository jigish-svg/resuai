/**
 * A saved match reflects the resume as it existed when the match was
 * generated (matches are fully replaced on every save_match call, so
 * `created_at` is always that generation time). If the resume has been saved
 * again since, the match's achievement/project references may no longer
 * describe the resume as it exists now — the match row itself is untouched
 * and still valid for historical/reference purposes, but consumers should
 * know it may be out of date. Equal timestamps are not stale: only a resume
 * update strictly after the match was generated counts.
 */
export function isMatchStale(matchGeneratedAt: string, resumeUpdatedAt: string): boolean {
  return new Date(resumeUpdatedAt).getTime() > new Date(matchGeneratedAt).getTime();
}
