import { SupabaseClient } from '@supabase/supabase-js';
import { ConceptDictionary } from './types';

/**
 * Loads the entire concept/alias/relation dictionary in three queries (not one
 * per concept) and builds an in-memory structure. The dictionary is small
 * (a hand-curated reference table, low hundreds of rows at most) and is meant
 * to be loaded once per request/operation, then reused in-process for every
 * requirement/achievement/skill in that request — never re-queried per item.
 */
export async function loadConceptDictionary(supabase: SupabaseClient): Promise<ConceptDictionary> {
  const [{ data: concepts, error: conceptsError }, { data: aliases, error: aliasesError }, { data: relations, error: relationsError }] =
    await Promise.all([
      supabase.from('concepts').select('id, canonical_name'),
      supabase.from('concept_aliases').select('concept_id, alias'),
      supabase.from('concept_relations').select('concept_a_id, concept_b_id, relation'),
    ]);

  if (conceptsError) throw conceptsError;
  if (aliasesError) throw aliasesError;
  if (relationsError) throw relationsError;

  const conceptIdToName = new Map<string, string>((concepts ?? []).map((c) => [c.id, c.canonical_name]));
  const aliasToConceptId = new Map<string, string>();
  for (const a of aliases ?? []) {
    aliasToConceptId.set(a.alias.toLowerCase(), a.concept_id);
  }
  // A concept's own canonical name is always a valid alias of itself.
  for (const [id, name] of conceptIdToName) {
    if (!aliasToConceptId.has(name.toLowerCase())) {
      aliasToConceptId.set(name.toLowerCase(), id);
    }
  }

  const incompatible = new Map<string, Set<string>>();
  const equivalent = new Map<string, Set<string>>();
  for (const r of relations ?? []) {
    const target = r.relation === 'incompatible' ? incompatible : equivalent;
    addToSetMap(target, r.concept_a_id, r.concept_b_id);
    addToSetMap(target, r.concept_b_id, r.concept_a_id);
  }

  return { aliasToConceptId, conceptIdToName, incompatible, equivalent };
}

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string): void {
  const set = map.get(key);
  if (set) {
    set.add(value);
  } else {
    map.set(key, new Set([value]));
  }
}
