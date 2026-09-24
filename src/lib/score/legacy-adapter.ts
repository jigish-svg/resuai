import type { RequirementCategory, RequirementImportance } from '@/types/job';
import type { MatchConfidence, MatchStatus } from '@/types/match';
import type { Necessity, RequirementKind, RequirementResult } from './types';

// Bridges today's job_requirements and match_items rows to the score's inputs
// until the Phase 1 requirement and evidence models replace them. Delete this
// file then. Model confidence is deliberately dropped: it is not a score input.

export interface LegacyRequirement {
  id: string;
  category: RequirementCategory;
  importance: RequirementImportance;
  is_implied: boolean;
}

export interface LegacyMatchItem {
  status: MatchStatus;
  confidence?: MatchConfidence;
}

const KIND: Record<RequirementCategory, RequirementKind> = {
  hard_skill: 'hard_skill',
  technology: 'technology',
  soft_skill: 'soft_skill',
  responsibility: 'responsibility',
  experience: 'experience',
  education: 'education',
  certification: 'certification',
};

const NECESSITY: Record<RequirementImportance, Necessity> = {
  critical: 'required',
  high: 'required',
  medium: 'preferred',
  low: 'nice_to_have',
};

export function fromLegacyMatch(requirement: LegacyRequirement, item: LegacyMatchItem | undefined): RequirementResult {
  const common = {
    requirement_id: requirement.id,
    kind: KIND[requirement.category],
    necessity: NECESSITY[requirement.importance],
    origin: requirement.is_implied ? ('inferred' as const) : ('stated' as const),
  };
  switch (item?.status) {
    case 'matched':
      // Nothing today is checked against an outside record, so a match is evidenced, never verified.
      return { ...common, state: 'backed_up', reason: 'judge_supported', strength: 'evidenced' };
    case 'partial':
      return { ...common, state: 'needs_attention', reason: 'judge_partial' };
    default:
      return { ...common, state: 'unsupported', reason: 'no_evidence_found' };
  }
}
