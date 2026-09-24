// Inputs and outputs of the fit score (PRD sections 7, 8 and 10).
// The score reads requirement results and configuration only. Nothing else
// about the user (practice, quizzes, clicks, plan, tailored text) has a slot here.

export type RequirementKind =
  | 'hard_skill'
  | 'tool'
  | 'technology'
  | 'responsibility'
  | 'domain'
  | 'experience'
  | 'seniority'
  | 'education'
  | 'certification'
  | 'soft_skill'
  | 'language'
  | 'location'
  | 'work_authorization'
  | 'other';

export type Necessity = 'required' | 'preferred' | 'nice_to_have' | 'unspecified';

export type Origin = 'stated' | 'inferred';

export type BackedUpReason =
  | 'exact_in_role_bullet'
  | 'exact_in_project'
  | 'alias_match'
  | 'cert_present'
  | 'degree_meets_level'
  | 'years_meet'
  | 'judge_supported'
  | 'user_confirmed'
  | 'user_declared';

export type NeedsAttentionReason = 'claimed_not_shown' | 'years_short' | 'adjacent_concept' | 'judge_partial';

export type UnsupportedReason =
  | 'no_evidence_found'
  | 'below_required_level'
  | 'expired_credential'
  | 'contradicted_by_data'
  | 'user_confirmed_no';

export type ToVerifyReason =
  | 'by_design'
  | 'thin_evidence'
  | 'ambiguous_requirement'
  | 'low_confidence_extraction'
  | 'judge_disagreement'
  | 'engine_gap';

interface ResultBase {
  requirement_id: string;
  kind: RequirementKind;
  necessity: Necessity;
  origin: Origin;
}

export interface BackedUpResult extends ResultBase {
  state: 'backed_up';
  reason: BackedUpReason;
  // "claimed" never reaches Backed up; a bare listing is Needs attention (claimed_not_shown).
  strength: 'evidenced' | 'verified';
}

export interface NeedsAttentionResult extends ResultBase {
  state: 'needs_attention';
  reason: NeedsAttentionReason;
  // Present only for years_short.
  years?: { actual: number; required: number };
}

export interface UnsupportedResult extends ResultBase {
  state: 'unsupported';
  reason: UnsupportedReason;
}

export interface ToVerifyResult extends ResultBase {
  state: 'to_verify';
  reason: ToVerifyReason;
}

export type RequirementResult = BackedUpResult | NeedsAttentionResult | UnsupportedResult | ToVerifyResult;

export type DimensionId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';

export type FitLabel = 'Strong fit' | 'Good fit' | 'Partial fit' | 'Weak fit';

export interface DimensionScore {
  id: DimensionId;
  name: string;
  baseWeight: number;
  // Renormalised over the active dimensions.
  effectiveWeight: number;
  // 0 to 1, unrounded.
  score: number;
  evaluatedCount: number;
}

export interface RequirementContribution {
  requirement_id: string;
  dimension: DimensionId;
  // Score points this requirement adds, and the points it leaves on the table.
  contribution: number;
  loss: number;
}

export interface FitScore {
  scoreConfigVersion: number;
  // Null means "Not enough to score yet."
  score: number | null;
  label: FitLabel | null;
  mustHaveUnsupported: boolean;
  evaluatedCount: number;
  scoredTotal: number;
  // Null when nothing qualifies or the spread is under the display threshold.
  range: { low: number; high: number } | null;
  dimensions: DimensionScore[];
  contributions: RequirementContribution[];
  topGaps: RequirementContribution[];
  topContributors: RequirementContribution[];
}
