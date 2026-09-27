import { describe, expect, it } from 'vitest';
import { ConceptDictionary } from '../types';
import { areEquivalent, areIncompatible, normalizeConcept, normalizeConcepts } from '../normalize';

function buildFixtureDictionary(): ConceptDictionary {
  const concepts = ['Python', 'JavaScript', 'Java', 'React', 'Angular', 'PostgreSQL', 'MySQL', 'AWS', 'Azure', 'PyTorch'];
  const conceptIdToName = new Map<string, string>();
  const idFor = new Map<string, string>();
  concepts.forEach((name, i) => {
    const id = `concept-${i}`;
    idFor.set(name, id);
    conceptIdToName.set(id, name);
  });

  const aliasToConceptId = new Map<string, string>([
    ['python', idFor.get('Python')!],
    ['python3', idFor.get('Python')!],
    ['javascript', idFor.get('JavaScript')!],
    ['js', idFor.get('JavaScript')!],
    ['java', idFor.get('Java')!],
    ['react', idFor.get('React')!],
    ['react.js', idFor.get('React')!],
    ['reactjs', idFor.get('React')!],
    ['angular', idFor.get('Angular')!],
    ['postgresql', idFor.get('PostgreSQL')!],
    ['postgres', idFor.get('PostgreSQL')!],
    ['mysql', idFor.get('MySQL')!],
    ['aws', idFor.get('AWS')!],
    ['amazon web services', idFor.get('AWS')!],
    ['azure', idFor.get('Azure')!],
    ['pytorch', idFor.get('PyTorch')!],
  ]);

  const incompatible = new Map<string, Set<string>>();
  const neverMergePairs: [string, string][] = [
    ['Java', 'JavaScript'],
    ['PostgreSQL', 'MySQL'],
    ['AWS', 'Azure'],
    ['React', 'Angular'],
    ['Python', 'PyTorch'],
  ];
  for (const [a, b] of neverMergePairs) {
    const idA = idFor.get(a)!;
    const idB = idFor.get(b)!;
    incompatible.set(idA, new Set([...(incompatible.get(idA) ?? []), idB]));
    incompatible.set(idB, new Set([...(incompatible.get(idB) ?? []), idA]));
  }

  return { aliasToConceptId, conceptIdToName, incompatible, equivalent: new Map() };
}

describe('normalizeConcept', () => {
  const dict = buildFixtureDictionary();

  it.each([
    ['Python', 'Python'],
    ['python3', 'Python'],
    ['JS', 'JavaScript'],
    ['React.js', 'React'],
    ['ReactJS', 'React'],
    ['Postgres', 'PostgreSQL'],
    ['Amazon Web Services', 'AWS'],
  ])('resolves alias %s to canonical concept %s', (alias, expected) => {
    expect(normalizeConcept(dict, alias)?.canonicalName).toBe(expected);
  });

  it('returns null for unknown text, never a fuzzy guess', () => {
    expect(normalizeConcept(dict, 'Rust')).toBeNull();
    expect(normalizeConcept(dict, 'Java')?.canonicalName).toBe('Java');
    // "JavaScript" containing "Java" as a substring must not resolve via Java's alias.
    expect(normalizeConcept(dict, 'JavaScript')?.canonicalName).toBe('JavaScript');
  });

  it('is case-insensitive', () => {
    expect(normalizeConcept(dict, 'PYTHON')?.canonicalName).toBe('Python');
    expect(normalizeConcept(dict, '  python  ')?.canonicalName).toBe('Python');
  });
});

describe('normalizeConcepts (batch)', () => {
  it('normalizes a whole skills list in one pass', () => {
    const dict = buildFixtureDictionary();
    const results = normalizeConcepts(dict, ['Python', 'FastAPI', 'PostgreSQL', 'Docker']);
    expect(results.map((r) => r?.canonicalName ?? null)).toEqual(['Python', null, 'PostgreSQL', null]);
  });
});

describe('never-merge pairs are incompatible, never equivalent', () => {
  const dict = buildFixtureDictionary();

  it.each([
    ['Java', 'JavaScript'],
    ['PostgreSQL', 'MySQL'],
    ['AWS', 'Azure'],
    ['React', 'Angular'],
    ['Python', 'PyTorch'],
  ])('%s and %s are incompatible', (a, b) => {
    const conceptA = normalizeConcept(dict, a)!;
    const conceptB = normalizeConcept(dict, b)!;
    expect(areIncompatible(dict, conceptA.conceptId, conceptB.conceptId)).toBe(true);
    expect(areEquivalent(dict, conceptA.conceptId, conceptB.conceptId)).toBe(false);
  });

  it('a concept is never incompatible with itself', () => {
    const python = normalizeConcept(dict, 'Python')!;
    expect(areIncompatible(dict, python.conceptId, python.conceptId)).toBe(false);
    expect(areEquivalent(dict, python.conceptId, python.conceptId)).toBe(true);
  });

  it('unrelated concepts are neither equivalent nor incompatible', () => {
    const python = normalizeConcept(dict, 'Python')!;
    const react = normalizeConcept(dict, 'React')!;
    expect(areIncompatible(dict, python.conceptId, react.conceptId)).toBe(false);
    expect(areEquivalent(dict, python.conceptId, react.conceptId)).toBe(false);
  });
});
