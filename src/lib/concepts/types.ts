export interface ConceptDictionary {
  /** lowercased alias -> canonical concept id */
  aliasToConceptId: Map<string, string>;
  /** canonical concept id -> canonical display name */
  conceptIdToName: Map<string, string>;
  /** canonical concept id -> set of canonical concept ids it is incompatible with */
  incompatible: Map<string, Set<string>>;
  /** canonical concept id -> set of canonical concept ids explicitly marked equivalent (beyond alias identity) */
  equivalent: Map<string, Set<string>>;
}
