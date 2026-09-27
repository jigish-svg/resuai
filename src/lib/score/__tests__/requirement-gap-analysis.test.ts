import { describe, expect, it } from 'vitest';
import { computeRequirementGaps, RequirementForGap } from '../requirement-gap-analysis';
import { LegacyMatchItem } from '../legacy-adapter';

const req = (overrides: Partial<RequirementForGap> = {}): RequirementForGap => ({
  id: 'req-1',
  requirement_text: 'Python experience',
  category: 'hard_skill',
  importance: 'critical',
  is_implied: false,
  ...overrides,
});

describe('computeRequirementGaps', () => {
  it('buckets matched -> present, partial -> toVerify, no evidence/missing -> notFound', () => {
    const requirements = [
      req({ id: 'req-matched' }),
      req({ id: 'req-partial', requirement_text: 'AWS' }),
      req({ id: 'req-none', requirement_text: 'Kubernetes' }),
    ];
    const items = new Map<string, LegacyMatchItem | undefined>([
      ['req-matched', { status: 'matched', confidence: 'high' }],
      ['req-partial', { status: 'partial', confidence: 'medium' }],
    ]);

    const gaps = computeRequirementGaps(requirements, items);

    expect(gaps.present.map((g) => g.requirementId)).toEqual(['req-matched']);
    expect(gaps.toVerify.map((g) => g.requirementId)).toEqual(['req-partial']);
    expect(gaps.notFound.map((g) => g.requirementId)).toEqual(['req-none']);
  });

  it('a requirement with no match item at all is notFound, not silently dropped', () => {
    const gaps = computeRequirementGaps([req()], new Map());
    expect(gaps.notFound).toHaveLength(1);
  });

  it('is pure and deterministic: same input always produces the same output', () => {
    const requirements = [req()];
    const items = new Map<string, LegacyMatchItem | undefined>([['req-1', { status: 'matched' }]]);
    const first = computeRequirementGaps(requirements, items);
    const second = computeRequirementGaps(requirements, items);
    expect(first).toEqual(second);
  });
});
