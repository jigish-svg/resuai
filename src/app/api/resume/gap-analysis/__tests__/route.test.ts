import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const loadConceptDictionaryMock = vi.fn();
const suggestRoleSkillsMock = vi.fn();
const openaiParseMock = vi.fn();

let achievements: { id: string; metrics: string[]; concept_ids: string[] }[] = [];
let projects: { id: string; description: string; technologies: string[]; concept_ids: string[] }[] = [];
let sections: { section_type: string; content: unknown }[] = [];
let suggestions: { id: string; suggestion_type: string; content: unknown }[] = [];

function chain(data: unknown) {
  return {
    select: () => chain(data),
    eq: () => chain(data),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'resume-1' } }) }) }) }) };
      if (table === 'achievements') return chain(achievements);
      if (table === 'projects') return chain(projects);
      if (table === 'resume_sections') return chain(sections);
      if (table === 'ai_suggestions') return chain(suggestions);
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

vi.mock('@/lib/concepts/dictionary', () => ({
  loadConceptDictionary: (...args: unknown[]) => loadConceptDictionaryMock(...args),
}));

// Proves the "zero new AI calls" latency property directly: if the route ever
// imported/called either of these, the mock would be exercised and these
// assertions would need updating — they never are.
vi.mock('@/lib/openai/skill-suggestions', () => ({
  suggestRoleSkills: (...args: unknown[]) => suggestRoleSkillsMock(...args),
}));
vi.mock('@/lib/openai/client', () => ({
  openai: { beta: { chat: { completions: { parse: (...args: unknown[]) => openaiParseMock(...args) } } } },
  MODEL: 'gpt-4o',
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest() {
  return new NextRequest('http://localhost/api/resume/gap-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: RESUME_ID }),
  });
}

describe('POST /api/resume/gap-analysis — read-only, zero new AI calls', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    loadConceptDictionaryMock.mockReset().mockResolvedValue({
      aliasToConceptId: new Map([['python', 'concept-python'], ['docker', 'concept-docker']]),
      conceptIdToName: new Map([['concept-python', 'Python'], ['concept-docker', 'Docker']]),
      incompatible: new Map(),
      equivalent: new Map(),
    });
    suggestRoleSkillsMock.mockReset();
    openaiParseMock.mockReset();
    achievements = [];
    projects = [];
    sections = [];
    suggestions = [];
  });

  it('demonstrated includes concepts backed by an achievement or project', async () => {
    achievements = [{ id: 'ach-1', metrics: ['40%'], concept_ids: ['concept-python'] }];
    projects = [{ id: 'proj-1', description: 'A well-described project with plenty of detail.', technologies: ['Docker'], concept_ids: ['concept-docker'] }];

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(data.demonstrated.sort()).toEqual(['Docker', 'Python']);
  });

  it('a skills-list entry with no backing achievement/project is weaklyDemonstrated', async () => {
    sections = [{ section_type: 'skills', content: { skills: ['Python', 'Kubernetes'] } }];
    achievements = [{ id: 'ach-1', metrics: ['40%'], concept_ids: ['concept-python'] }];

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(data.weaklyDemonstrated).toEqual(['Kubernetes']);
  });

  it('an achievement with no metrics produces a content gap', async () => {
    achievements = [{ id: 'ach-1', metrics: [], concept_ids: [] }];
    const res = await POST(makeRequest());
    const data = await res.json();
    expect(data.contentGaps).toEqual([{ type: 'missing_metrics', message: 'This achievement has no measurable outcome.', refId: 'ach-1' }]);
  });

  it('surfaces an existing pending suggestion verbatim, never regenerating it', async () => {
    suggestions = [{ id: 'sugg-1', suggestion_type: 'skill', content: { skill: 'Docker' } }];
    const res = await POST(makeRequest());
    const data = await res.json();

    expect(data.recommendations).toEqual([{ id: 'sugg-1', type: 'skill', content: { skill: 'Docker' } }]);
    expect(suggestRoleSkillsMock).not.toHaveBeenCalled();
    expect(openaiParseMock).not.toHaveBeenCalled();
  });
});
