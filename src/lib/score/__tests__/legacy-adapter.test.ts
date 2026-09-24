import { describe, expect, it } from 'vitest';
import { fromLegacyMatch, type LegacyRequirement } from '@/lib/score/legacy-adapter';

const requirement = (overrides: Partial<LegacyRequirement> = {}): LegacyRequirement => ({
  id: 'r1',
  category: 'hard_skill',
  importance: 'high',
  is_implied: false,
  ...overrides,
});

describe('legacy adapter', () => {
  it('maps matched to Backed up, evidenced (never verified)', () => {
    expect(fromLegacyMatch(requirement(), { status: 'matched' })).toEqual({
      requirement_id: 'r1',
      kind: 'hard_skill',
      necessity: 'required',
      origin: 'stated',
      state: 'backed_up',
      reason: 'judge_supported',
      strength: 'evidenced',
    });
  });

  it('maps partial to Needs attention, judge_partial', () => {
    expect(fromLegacyMatch(requirement(), { status: 'partial' })).toMatchObject({
      state: 'needs_attention',
      reason: 'judge_partial',
    });
  });

  it('maps no_evidence to Unsupported, no_evidence_found', () => {
    expect(fromLegacyMatch(requirement(), { status: 'no_evidence' })).toMatchObject({
      state: 'unsupported',
      reason: 'no_evidence_found',
    });
  });

  it('treats a requirement the matcher skipped as no evidence found', () => {
    expect(fromLegacyMatch(requirement(), undefined)).toMatchObject({
      state: 'unsupported',
      reason: 'no_evidence_found',
    });
  });

  it.each([
    ['critical', 'required'],
    ['high', 'required'],
    ['medium', 'preferred'],
    ['low', 'nice_to_have'],
  ] as const)('maps importance %s to necessity %s', (importance, necessity) => {
    expect(fromLegacyMatch(requirement({ importance }), { status: 'matched' }).necessity).toBe(necessity);
  });

  it.each([
    ['hard_skill', 'hard_skill'],
    ['technology', 'technology'],
    ['soft_skill', 'soft_skill'],
    ['responsibility', 'responsibility'],
    ['experience', 'experience'],
    ['education', 'education'],
    ['certification', 'certification'],
  ] as const)('maps category %s to kind %s', (category, kind) => {
    expect(fromLegacyMatch(requirement({ category }), { status: 'matched' }).kind).toBe(kind);
  });

  it('marks implied requirements as inferred', () => {
    expect(fromLegacyMatch(requirement({ is_implied: true }), { status: 'matched' }).origin).toBe('inferred');
  });

  it('drops model confidence', () => {
    const result = fromLegacyMatch(requirement(), { status: 'matched', confidence: 'low' });
    expect(result).not.toHaveProperty('confidence');
  });
});
