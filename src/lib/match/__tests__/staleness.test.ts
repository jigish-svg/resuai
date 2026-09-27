import { describe, expect, it } from 'vitest';
import { isMatchStale } from '../staleness';

describe('isMatchStale', () => {
  it('match newer than resume -> not stale', () => {
    expect(isMatchStale('2024-01-02T00:00:00Z', '2024-01-01T00:00:00Z')).toBe(false);
  });

  it('resume newer than match -> stale', () => {
    expect(isMatchStale('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z')).toBe(true);
  });

  it('equal timestamps -> not stale', () => {
    expect(isMatchStale('2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')).toBe(false);
  });

  it('is sensitive to sub-second differences', () => {
    expect(isMatchStale('2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.001Z')).toBe(true);
  });
});
