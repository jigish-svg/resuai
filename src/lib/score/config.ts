import type { DimensionId, FitLabel, Necessity, RequirementKind, ToVerifyReason } from './types';

// Every number here is a starting value from PRD section 10, not empirically
// validated (OQ-3). Change them only by adding a new versioned config, so a
// stored score can always be reproduced from its version.

export interface DimensionConfig {
  id: DimensionId;
  name: string;
  weight: number;
  kinds: readonly RequirementKind[];
}

export interface ScoreConfig {
  version: number;
  dimensions: readonly DimensionConfig[];
  credits: {
    verified: number;
    evidenced: number;
    claimed_not_shown: number;
    adjacent_concept: number;
    judge_partial: number;
  };
  necessityWeights: Record<Necessity, number>;
  minEvaluated: number;
  rangeThreshold: number;
  rangeReasons: readonly ToVerifyReason[];
  // Highest first. A score at or above `min` gets the label.
  bands: readonly { min: number; label: FitLabel }[];
  mustHaveKinds: readonly RequirementKind[];
  mustHaveCap: FitLabel;
}

export const SCORE_CONFIG_V1: ScoreConfig = {
  version: 1,
  dimensions: [
    { id: 'D1', name: 'Skills and tools', weight: 0.35, kinds: ['hard_skill', 'tool', 'technology'] },
    { id: 'D2', name: 'Responsibilities and domain', weight: 0.25, kinds: ['responsibility', 'domain'] },
    { id: 'D3', name: 'Experience and seniority', weight: 0.2, kinds: ['experience', 'seniority'] },
    { id: 'D4', name: 'Education', weight: 0.1, kinds: ['education'] },
    { id: 'D5', name: 'Certifications and licences', weight: 0.05, kinds: ['certification'] },
    { id: 'D6', name: 'Soft skills and languages', weight: 0.05, kinds: ['soft_skill', 'language'] },
  ],
  credits: {
    verified: 1.0,
    evidenced: 0.85,
    claimed_not_shown: 0.5,
    adjacent_concept: 0.4,
    judge_partial: 0.5,
  },
  necessityWeights: { required: 1.0, preferred: 0.5, nice_to_have: 0.25, unspecified: 0.5 },
  minEvaluated: 3,
  rangeThreshold: 10,
  rangeReasons: ['engine_gap', 'thin_evidence', 'judge_disagreement', 'ambiguous_requirement', 'low_confidence_extraction'],
  bands: [
    { min: 80, label: 'Strong fit' },
    { min: 65, label: 'Good fit' },
    { min: 45, label: 'Partial fit' },
    { min: 0, label: 'Weak fit' },
  ],
  mustHaveKinds: ['hard_skill', 'tool', 'technology', 'experience', 'education', 'certification'],
  mustHaveCap: 'Partial fit',
};
