import type { FitScore } from '@/lib/score/types';
import type { MatchConfidence, MatchStatus } from '@/types/match';

export interface MatchItemInput {
  requirement_id: string;
  achievement_id?: string;
  status: MatchStatus;
  confidence: MatchConfidence;
  evidence_text?: string;
  explanation: string;
}

/** The match row and item rows save_match writes. */
export function buildMatchPayload(fit: FitScore, items: readonly MatchItemInput[]) {
  return {
    match: {
      overall_score: fit.score,
      label: fit.label,
      score_config_version: fit.scoreConfigVersion,
      evaluated_count: fit.evaluatedCount,
      scored_total: fit.scoredTotal,
      range_low: fit.range?.low ?? null,
      range_high: fit.range?.high ?? null,
    },
    items: items.map((item) => ({
      requirement_id: item.requirement_id,
      achievement_id: item.achievement_id ?? null,
      status: item.status,
      confidence: item.confidence,
      evidence_text: item.evidence_text ?? null,
      explanation: item.explanation,
    })),
  };
}
