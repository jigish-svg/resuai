import { describe, expect, it } from 'vitest';
import { buildMatchPayload } from '@/lib/match/save-payload';
import type { FitScore } from '@/lib/score/types';

const fit = (overrides: Partial<FitScore> = {}): FitScore => ({
  scoreConfigVersion: 1,
  score: 72,
  label: 'Good fit',
  mustHaveUnsupported: false,
  evaluatedCount: 5,
  scoredTotal: 6,
  range: { low: 65, high: 80 },
  dimensions: [],
  contributions: [],
  topGaps: [],
  topContributors: [],
  ...overrides,
});

const items = [
  {
    requirement_id: 'r1',
    achievement_id: 'a1',
    status: 'matched' as const,
    confidence: 'high' as const,
    evidence_text: 'Cut latency',
    explanation: 'Shows Go use.',
  },
  {
    requirement_id: 'r2',
    achievement_id: undefined,
    status: 'no_evidence' as const,
    confidence: 'low' as const,
    evidence_text: undefined,
    explanation: 'No matching evidence was found in the master resume.',
  },
];

describe('buildMatchPayload', () => {
  it('stores the score fields the match page reads back', () => {
    expect(buildMatchPayload(fit(), items).match).toEqual({
      overall_score: 72,
      label: 'Good fit',
      score_config_version: 1,
      evaluated_count: 5,
      scored_total: 6,
      range_low: 65,
      range_high: 80,
    });
  });

  it('keeps an absent score and range as null, never 0', () => {
    const { match } = buildMatchPayload(fit({ score: null, label: null, range: null }), items);
    expect(match.overall_score).toBeNull();
    expect(match.label).toBeNull();
    expect(match.range_low).toBeNull();
    expect(match.range_high).toBeNull();
  });

  it('maps items with null for missing evidence', () => {
    expect(buildMatchPayload(fit(), items).items).toEqual([
      { requirement_id: 'r1', achievement_id: 'a1', status: 'matched', confidence: 'high', evidence_text: 'Cut latency', explanation: 'Shows Go use.' },
      {
        requirement_id: 'r2',
        achievement_id: null,
        status: 'no_evidence',
        confidence: 'low',
        evidence_text: null,
        explanation: 'No matching evidence was found in the master resume.',
      },
    ]);
  });
});
