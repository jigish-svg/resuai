import { describe, expect, it } from 'vitest';
import { determineAchievementSource } from '../determine-source';

describe('determineAchievementSource', () => {
  it('a fresh save (no resumeId) is straight from parsing -> ai_parsed, regardless of any existing source', () => {
    expect(determineAchievementSource(undefined, undefined)).toBe('ai_parsed');
    expect(determineAchievementSource(null, 'user_stated')).toBe('ai_parsed');
  });

  it('an update: unchanged content (a matching existing achievement) keeps its existing source', () => {
    expect(determineAchievementSource('resume-1', 'ai_parsed')).toBe('ai_parsed');
    expect(determineAchievementSource('resume-1', 'externally_verified')).toBe('externally_verified');
  });

  it('an update: new or changed content (no matching existing achievement) becomes user_stated', () => {
    expect(determineAchievementSource('resume-1', undefined)).toBe('user_stated');
  });

  it('never infers externally_verified on its own', () => {
    // The only way to get externally_verified out is to already have had it in.
    expect(determineAchievementSource('resume-1', undefined)).not.toBe('externally_verified');
    expect(determineAchievementSource(undefined, undefined)).not.toBe('externally_verified');
  });
});
