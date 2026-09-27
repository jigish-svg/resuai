import { fromLegacyMatch, LegacyRequirement, LegacyMatchItem } from './legacy-adapter';

export interface GapEntry {
  requirementId: string;
  requirementText: string;
  category: string;
  importance: string;
}

export interface RequirementGaps {
  present: GapEntry[];
  toVerify: GapEntry[];
  notFound: GapEntry[];
}

export type RequirementForGap = LegacyRequirement & { id: string; requirement_text: string };

/**
 * Buckets non-inferred requirements into PRESENT / TO VERIFY / NOT FOUND ON
 * YOUR RESUME using the exact same `fromLegacyMatch` classification the fit
 * score itself is built from, so this view can never disagree with the score.
 * Pure and deterministic — no AI call, no DB access.
 */
export function computeRequirementGaps(
  requirements: RequirementForGap[],
  itemByRequirement: Map<string, LegacyMatchItem | undefined>
): RequirementGaps {
  const present: GapEntry[] = [];
  const toVerify: GapEntry[] = [];
  const notFound: GapEntry[] = [];

  for (const requirement of requirements) {
    const result = fromLegacyMatch(requirement, itemByRequirement.get(requirement.id));
    const entry: GapEntry = {
      requirementId: requirement.id,
      requirementText: requirement.requirement_text,
      category: requirement.category,
      importance: requirement.importance,
    };
    if (result.state === 'backed_up') present.push(entry);
    else if (result.state === 'needs_attention') toVerify.push(entry);
    else notFound.push(entry);
  }

  return { present, toVerify, notFound };
}
