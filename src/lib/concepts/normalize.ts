import { ConceptDictionary } from './types';

export interface NormalizedConcept {
  conceptId: string;
  canonicalName: string;
}

/**
 * Exact, case-insensitive alias lookup only — no fuzzy or substring matching.
 * A near-miss ("Java" inside "JavaScript") must resolve to null, not to a
 * guessed concept, since false equivalence is the exact failure this module
 * exists to prevent.
 */
export function normalizeConcept(dict: ConceptDictionary, text: string): NormalizedConcept | null {
  const conceptId = dict.aliasToConceptId.get(text.trim().toLowerCase());
  if (!conceptId) return null;
  const canonicalName = dict.conceptIdToName.get(conceptId);
  if (!canonicalName) return null;
  return { conceptId, canonicalName };
}

/** Batch form: normalizes a whole list (e.g. one achievement's skills[]) in one pass, no per-item DB access. */
export function normalizeConcepts(dict: ConceptDictionary, texts: string[]): (NormalizedConcept | null)[] {
  return texts.map((text) => normalizeConcept(dict, text));
}

export function areEquivalent(dict: ConceptDictionary, conceptIdA: string, conceptIdB: string): boolean {
  if (conceptIdA === conceptIdB) return true;
  return dict.equivalent.get(conceptIdA)?.has(conceptIdB) ?? false;
}

export function areIncompatible(dict: ConceptDictionary, conceptIdA: string, conceptIdB: string): boolean {
  if (conceptIdA === conceptIdB) return false;
  return dict.incompatible.get(conceptIdA)?.has(conceptIdB) ?? false;
}
