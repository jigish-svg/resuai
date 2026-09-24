import { describe, expect, it } from 'vitest';
import { SCORE_CONFIG_V1, type ScoreConfig } from '@/lib/score/config';
import { computeFitScore, creditFor, labelFor } from '@/lib/score/fit-score';
import type { RequirementResult } from '@/lib/score/types';
import {
  attention,
  evidenced,
  mixedFixtures,
  times,
  toVerify,
  unsupported,
  verified,
  yearsShort,
} from './fixtures';

const score = (results: RequirementResult[]) => computeFitScore(results, SCORE_CONFIG_V1);

describe('configuration', () => {
  it('dimension weights sum to 1.0', () => {
    const sum = SCORE_CONFIG_V1.dimensions.reduce((s, d) => s + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 12);
  });

  it('every credit is between 0 and 1', () => {
    for (const credit of Object.values(SCORE_CONFIG_V1.credits)) {
      expect(credit).toBeGreaterThanOrEqual(0);
      expect(credit).toBeLessThanOrEqual(1);
    }
  });

  it('each scored kind belongs to exactly one dimension', () => {
    const kinds = SCORE_CONFIG_V1.dimensions.flatMap((d) => d.kinds);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const unscored of ['location', 'work_authorization', 'other'] as const) {
      expect(kinds).not.toContain(unscored);
    }
  });
});

describe('perfect candidate', () => {
  it('scores 100 when every dimension is used', () => {
    const result = score([
      verified('hard_skill'),
      verified('responsibility'),
      verified('experience'),
      verified('education'),
      verified('certification'),
      verified('soft_skill'),
    ]);
    expect(result.score).toBe(100);
    expect(result.label).toBe('Strong fit');
  });

  it('scores 100 when only one dimension is used (no cap by construction)', () => {
    expect(score(times(3, () => verified('technology'))).score).toBe(100);
  });

  it('scores 100 when three dimensions are used', () => {
    expect(score([verified('tool'), verified('domain'), verified('language')]).score).toBe(100);
  });
});

describe('no neutral fill and renormalisation', () => {
  it('a job that only uses D1 scores exactly S1 x 100', () => {
    // S1 = (1 + 0.85 + 0) / 3
    const result = score([verified('hard_skill'), evidenced('hard_skill'), unsupported('hard_skill')]);
    expect(result.score).toBe(62);
    expect(result.dimensions.map((d) => d.id)).toEqual(['D1']);
    expect(result.dimensions[0].effectiveWeight).toBe(1);
  });

  it('matches a hand-computed D1 + D3 case', () => {
    // S1 = 0.5, S3 = 0.85; W1' = 0.35/0.55, W3' = 0.20/0.55
    // 100 x (0.63636 x 0.5 + 0.36364 x 0.85) = 62.727 -> 63
    const result = score([verified('hard_skill'), unsupported('technology'), evidenced('experience')]);
    expect(result.score).toBe(63);
    const d1 = result.dimensions.find((d) => d.id === 'D1')!;
    const d3 = result.dimensions.find((d) => d.id === 'D3')!;
    expect(d1.effectiveWeight).toBeCloseTo(0.35 / 0.55, 12);
    expect(d3.effectiveWeight).toBeCloseTo(0.2 / 0.55, 12);
    expect(d1.score).toBeCloseTo(0.5, 12);
    expect(d3.score).toBeCloseTo(0.85, 12);
  });

  it('a dimension with only To verify items is inactive and never lowers the score', () => {
    const base = [verified('hard_skill'), verified('hard_skill'), verified('hard_skill')];
    const withIdleDimension = [...base, toVerify('education', 'by_design')];
    expect(score(withIdleDimension).score).toBe(100);
    expect(score(withIdleDimension).dimensions.map((d) => d.id)).toEqual(['D1']);
  });

  it('necessity weights apply within a dimension', () => {
    // required verified (w 1) + nice_to_have unsupported (w 0.25): 1 / 1.25 = 0.8
    const result = score([
      verified('hard_skill'),
      verified('hard_skill'),
      unsupported('hard_skill', { necessity: 'nice_to_have' }),
      unsupported('hard_skill', { necessity: 'nice_to_have' }),
    ]);
    expect(result.score).toBe(80);
  });

  it('unspecified necessity weighs the same as preferred', () => {
    const a = score([verified('responsibility'), unsupported('responsibility', { necessity: 'preferred' }), verified('responsibility')]);
    const b = score([verified('responsibility'), unsupported('responsibility', { necessity: 'unspecified' }), verified('responsibility')]);
    expect(a.score).toBe(b.score);
  });
});

describe('exclusions', () => {
  const base = [verified('hard_skill'), evidenced('hard_skill'), unsupported('responsibility')];

  it('To verify items are excluded from the score', () => {
    expect(score([...base, toVerify('hard_skill', 'engine_gap')]).score).toBe(score(base).score);
  });

  it('inferred requirements are never scored, never counted and never cap the label', () => {
    const withInferred = [...base, unsupported('hard_skill', { origin: 'inferred' })];
    const a = score(base);
    const b = score(withInferred);
    expect(b.score).toBe(a.score);
    expect(b.scoredTotal).toBe(a.scoredTotal);
    expect(b.mustHaveUnsupported).toBe(false);
  });

  it('unscored kinds (location, work authorisation, other) never affect the score or coverage', () => {
    const withUnscored = [
      ...base,
      unsupported('location'),
      toVerify('work_authorization', 'by_design'),
      unsupported('other'),
    ];
    expect(score(withUnscored).score).toBe(score(base).score);
    expect(score(withUnscored).scoredTotal).toBe(3);
  });
});

describe('not enough to score', () => {
  it('is null when no dimension is active', () => {
    const result = score([toVerify('hard_skill', 'engine_gap'), toVerify('location', 'by_design')]);
    expect(result.score).toBeNull();
    expect(result.label).toBeNull();
  });

  it('is null with 2 evaluated requirements', () => {
    expect(score([verified('hard_skill'), verified('responsibility')]).score).toBeNull();
  });

  it('is null for an empty list', () => {
    expect(score([]).score).toBeNull();
  });

  it('is a number with 3 evaluated requirements', () => {
    expect(score([verified('hard_skill'), verified('responsibility'), verified('education')]).score).toBe(100);
  });
});

describe('coverage', () => {
  it('reports 9 of 11 requirements checked', () => {
    const result = score([
      ...times(9, () => evidenced('hard_skill')),
      toVerify('hard_skill', 'thin_evidence'),
      toVerify('responsibility', 'ambiguous_requirement'),
      toVerify('location', 'by_design'),
      unsupported('hard_skill', { origin: 'inferred' }),
    ]);
    expect(result.evaluatedCount).toBe(9);
    expect(result.scoredTotal).toBe(11);
  });
});

describe('range', () => {
  it('spans all-Unsupported to all-Backed-up-verified for the listed reasons', () => {
    const result = score([
      ...times(3, () => verified('hard_skill')),
      toVerify('hard_skill', 'engine_gap'),
      toVerify('hard_skill', 'low_confidence_extraction'),
    ]);
    expect(result.score).toBe(100);
    expect(result.range).toEqual({ low: 60, high: 100 });
  });

  it('ignores by_design items', () => {
    const result = score([
      ...times(3, () => verified('hard_skill')),
      toVerify('hard_skill', 'by_design'),
      toVerify('hard_skill', 'by_design'),
    ]);
    expect(result.range).toBeNull();
  });

  it('is hidden when high minus low is under the threshold', () => {
    const result = score([
      ...times(20, () => verified('hard_skill')),
      toVerify('hard_skill', 'judge_disagreement', { necessity: 'nice_to_have' }),
    ]);
    expect(result.range).toBeNull();
  });

  it('is null when the score itself is null', () => {
    const result = score([verified('hard_skill'), toVerify('hard_skill', 'engine_gap'), toVerify('hard_skill', 'engine_gap')]);
    expect(result.score).toBeNull();
    expect(result.range).toBeNull();
  });
});

describe('labels', () => {
  it.each([
    [100, 'Strong fit'],
    [80, 'Strong fit'],
    [79, 'Good fit'],
    [65, 'Good fit'],
    [64, 'Partial fit'],
    [45, 'Partial fit'],
    [44, 'Weak fit'],
    [0, 'Weak fit'],
  ] as const)('%i is %s', (value, label) => {
    expect(labelFor(value, false, SCORE_CONFIG_V1)).toBe(label);
  });

  it('an Unsupported must-have caps the label at Partial fit', () => {
    const result = score([...times(19, () => verified('hard_skill')), unsupported('hard_skill')]);
    expect(result.score).toBe(95);
    expect(result.mustHaveUnsupported).toBe(true);
    expect(result.label).toBe('Partial fit');
  });

  it('the cap never raises a lower label', () => {
    expect(labelFor(30, true, SCORE_CONFIG_V1)).toBe('Weak fit');
  });

  it('responsibilities and soft skills are never must-haves', () => {
    // D1 = 1, D2 = 0.8, D6 = 0.8 -> (0.35 + 0.20 + 0.04) / 0.65 = 90.8 -> 91
    const result = score([
      ...times(19, () => verified('hard_skill')),
      ...times(4, () => verified('responsibility')),
      unsupported('responsibility'),
      ...times(4, () => verified('soft_skill')),
      unsupported('soft_skill'),
    ]);
    expect(result.score).toBe(91);
    expect(result.mustHaveUnsupported).toBe(false);
    expect(result.label).toBe('Strong fit');
  });

  it('a preferred hard skill is not a must-have', () => {
    const result = score([...times(19, () => verified('hard_skill')), unsupported('hard_skill', { necessity: 'preferred' })]);
    expect(result.mustHaveUnsupported).toBe(false);
  });

  it('a To verify must-have does not cap', () => {
    const result = score([...times(5, () => verified('hard_skill')), toVerify('certification', 'thin_evidence')]);
    expect(result.label).toBe('Strong fit');
  });
});

describe('years_short credit', () => {
  it('equals the ratio for one month below the target', () => {
    const credit = creditFor(yearsShort(5 - 1 / 12, 5), SCORE_CONFIG_V1);
    expect(credit).toBeCloseTo((5 - 1 / 12) / 5, 12);
  });

  it('is 1 when years exactly equal the target', () => {
    expect(creditFor(yearsShort(5, 5), SCORE_CONFIG_V1)).toBe(1);
  });

  it('is the ratio when far below the target', () => {
    expect(creditFor(yearsShort(1, 5), SCORE_CONFIG_V1)).toBeCloseTo(0.2, 12);
  });

  it('never exceeds 1', () => {
    expect(creditFor(yearsShort(8, 5), SCORE_CONFIG_V1)).toBe(1);
  });

  it('is 0 for zero years', () => {
    expect(creditFor(yearsShort(0, 5), SCORE_CONFIG_V1)).toBe(0);
  });

  it('rejects a non-positive target', () => {
    expect(() => score([yearsShort(1, 0), verified('hard_skill'), verified('hard_skill')])).toThrow();
  });
});

describe('monotonic in evidence', () => {
  // Unsupported < Needs attention < Backed up. years_short is kept at a ratio
  // below the evidenced credit; see the open question in the todo below.
  const ladder = (r: RequirementResult): RequirementResult[] => {
    const common = { requirement_id: r.requirement_id, kind: r.kind, necessity: r.necessity, origin: r.origin };
    return [
      { ...common, state: 'unsupported', reason: 'no_evidence_found' },
      { ...common, state: 'needs_attention', reason: 'adjacent_concept' },
      { ...common, state: 'needs_attention', reason: 'years_short', years: { actual: 2, required: 5 } },
      { ...common, state: 'needs_attention', reason: 'claimed_not_shown' },
      { ...common, state: 'needs_attention', reason: 'judge_partial' },
      { ...common, state: 'backed_up', reason: 'judge_supported', strength: 'evidenced' },
      { ...common, state: 'backed_up', reason: 'judge_supported', strength: 'verified' },
    ];
  };
  const rank = { unsupported: 0, needs_attention: 1, backed_up: 2 } as const;

  for (const [name, fixture] of Object.entries(mixedFixtures())) {
    it(`never lowers the score when one requirement moves up (${name})`, () => {
      fixture.forEach((original, i) => {
        if (original.state === 'to_verify' || original.origin === 'inferred') return;
        const steps = ladder(original);
        for (const lower of steps) {
          for (const higher of steps) {
            if (rank[higher.state as keyof typeof rank] <= rank[lower.state as keyof typeof rank]) continue;
            const a = score(fixture.map((r, j) => (j === i ? lower : r))).score!;
            const b = score(fixture.map((r, j) => (j === i ? higher : r))).score!;
            expect(b).toBeGreaterThanOrEqual(a);
          }
        }
      });
    });
  }

  it.todo(
    'years_short above 0.85 (e.g. 11 of 12 years) outranks Backed up evidenced (0.85); PRD 10B conflicts with the 10E monotonic rule, pending a decision',
  );
});

describe('order invariance and determinism', () => {
  // Small deterministic PRNG so the shuffles are reproducible.
  function shuffled<T>(items: T[], seed: number): T[] {
    const out = [...items];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const j = s % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  for (const [name, fixture] of Object.entries(mixedFixtures())) {
    it(`reordering changes nothing (${name})`, () => {
      const expected = score(fixture);
      for (let seed = 1; seed <= 10; seed++) {
        expect(score(shuffled(fixture, seed))).toEqual(expected);
      }
    });

    it(`same inputs give the same output and inputs are not mutated (${name})`, () => {
      const frozen = fixture.map((r) => Object.freeze({ ...r, ...('years' in r && r.years ? { years: Object.freeze({ ...r.years }) } : {}) }));
      Object.freeze(frozen);
      const first = score(frozen as RequirementResult[]);
      const second = score(frozen as RequirementResult[]);
      expect(second).toEqual(first);
    });

    it(`stays within 0 to 100 (${name})`, () => {
      const result = score(fixture);
      expect(result.score).not.toBeNull();
      expect(result.score!).toBeGreaterThanOrEqual(0);
      expect(result.score!).toBeLessThanOrEqual(100);
    });
  }
});

describe('signature', () => {
  it('takes exactly results and configuration', () => {
    expect(computeFitScore.length).toBe(2);
  });

  it('rejects any extra field on a result at runtime', () => {
    const polluted = { ...verified('hard_skill'), quiz_passed: true } as unknown as RequirementResult;
    expect(() => score([polluted, verified('hard_skill'), verified('hard_skill')])).toThrow();
  });

  it('rejects a reason that does not belong to the state', () => {
    const wrong = { ...verified('hard_skill'), reason: 'no_evidence_found' } as unknown as RequirementResult;
    expect(() => score([wrong, verified('hard_skill'), verified('hard_skill')])).toThrow();
  });

  it('rejects years on anything but years_short', () => {
    const wrong = { ...attention('hard_skill', 'judge_partial'), years: { actual: 1, required: 2 } } as RequirementResult;
    expect(() => score([wrong, verified('hard_skill'), verified('hard_skill')])).toThrow();
  });

  it('does not compile when practice data is passed', () => {
    // @ts-expect-error a result has no slot for practice or quiz data
    const bad: RequirementResult = { ...verified('hard_skill'), practice_score: 90 };
    expect(bad).toBeDefined();
  });

  it('carries the config version it was computed with', () => {
    const v2: ScoreConfig = { ...SCORE_CONFIG_V1, version: 2 };
    expect(computeFitScore([verified('hard_skill')], v2).scoreConfigVersion).toBe(2);
  });
});

describe('rounding', () => {
  it('rounds an exact .5 half up, without floating-point drift', () => {
    // (12 x 1 + 0.5 + 0.4 + 6 x 0) / 20 = 0.645 -> 64.5 -> 65
    const result = score([
      ...times(12, () => verified('hard_skill')),
      attention('hard_skill', 'claimed_not_shown'),
      attention('hard_skill', 'adjacent_concept'),
      ...times(6, () => unsupported('hard_skill', { necessity: 'required' })),
    ]);
    expect(result.score).toBe(65);
  });
});

describe('explanation', () => {
  it('contributions add up to the score', () => {
    for (const fixture of Object.values(mixedFixtures())) {
      const result = score(fixture);
      const total = result.contributions.reduce((s, c) => s + c.contribution, 0);
      expect(Math.abs(total - result.score!)).toBeLessThanOrEqual(0.5);
    }
  });

  it('contribution plus loss per dimension adds up to its effective weight', () => {
    const result = score(mixedFixtures().careerSwitch);
    for (const d of result.dimensions) {
      const sum = result.contributions
        .filter((c) => c.dimension === d.id)
        .reduce((s, c) => s + c.contribution + c.loss, 0);
      expect(sum).toBeCloseTo(d.effectiveWeight * 100, 9);
    }
  });

  it('names the three biggest gaps and three biggest contributors', () => {
    const result = score([
      verified('hard_skill', { id: 'a' }),
      evidenced('hard_skill', { id: 'b' }),
      attention('hard_skill', 'judge_partial', { id: 'c' }),
      attention('hard_skill', 'adjacent_concept', { id: 'd' }),
      unsupported('hard_skill', { id: 'e' }),
    ]);
    expect(result.topContributors.map((c) => c.requirement_id)).toEqual(['a', 'b', 'c']);
    expect(result.topGaps.map((c) => c.requirement_id)).toEqual(['e', 'd', 'c']);
  });

  it('leaves out requirements with nothing to contribute or lose', () => {
    const result = score(times(3, () => verified('hard_skill')));
    expect(result.topGaps).toEqual([]);
  });
});
