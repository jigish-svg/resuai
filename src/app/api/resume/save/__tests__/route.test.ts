import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const rpcMock = vi.fn();
const getEmbeddingMock = vi.fn();
const loadConceptDictionaryMock = vi.fn();
const checkRateLimitMock = vi.fn();
let resumesCount = 0;
let existingAchievements: { company: string; job_title: string; achievement_text: string; source: string }[] = [];
let existingProjects: { name: string; description: string; source: string }[] = [];
let pendingSkillSuggestions: { id: string; content: { skill: string } }[] = [];
const suggestionUpdateMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') {
        return { select: () => ({ eq: () => Promise.resolve({ count: resumesCount }) }) };
      }
      if (table === 'achievements') {
        return { select: () => ({ eq: () => Promise.resolve({ data: existingAchievements }) }) };
      }
      if (table === 'projects') {
        return { select: () => ({ eq: () => Promise.resolve({ data: existingProjects }) }) };
      }
      if (table === 'ai_suggestions') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: pendingSkillSuggestions }) }) }) }),
          update: (patch: unknown) => ({ in: (...args: unknown[]) => suggestionUpdateMock(patch, ...args) }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  }),
}));

vi.mock('@/lib/openai/evidence-matcher', () => ({
  getEmbedding: (...args: unknown[]) => getEmbeddingMock(...args),
}));

vi.mock('@/lib/concepts/dictionary', () => ({
  loadConceptDictionary: (...args: unknown[]) => loadConceptDictionaryMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitResponse: () => null,
  RATE_LIMITS: { resumeSave: {} },
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

type ProjectFixture = { name: string; description: string; technologies?: string[] };

function parsedResumeWithAchievement(achievementText: string, opts: { phone?: string; projects?: ProjectFixture[] } = {}) {
  return {
    candidate: { name: 'Jane Doe', email: 'jane@example.com', ...(opts.phone ? { phone: opts.phone } : {}) },
    summary: 'Backend engineer.',
    experience: [
      {
        company: 'Acme',
        job_title: 'Engineer',
        start_date: '2020-01',
        is_current: true,
        achievements: [{ text: achievementText, skills: ['Python'], metrics: [] }],
      },
    ],
    skills: ['Python'],
    education: [],
    certifications: [],
    projects: (opts.projects ?? []).map((p) => ({ name: p.name, description: p.description, technologies: p.technologies ?? [], metrics: [] })),
  };
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/resume/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/resume/save — per-achievement provenance', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getEmbeddingMock.mockReset().mockResolvedValue([0.1, 0.2]);
    loadConceptDictionaryMock.mockReset().mockResolvedValue({
      aliasToConceptId: new Map([['postgres', 'concept-postgres'], ['postgresql', 'concept-postgres']]),
      conceptIdToName: new Map([['concept-postgres', 'PostgreSQL']]),
      incompatible: new Map(),
      equivalent: new Map(),
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'resume-1', error: null });
    resumesCount = 0;
    existingAchievements = [];
    existingProjects = [];
    pendingSkillSuggestions = [];
    suggestionUpdateMock.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('a fresh save (no resumeId) marks every achievement ai_parsed', async () => {
    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python'), rawText: 'Jane Doe resume text' }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_resume_id).toBeNull();
    expect(rpcArgs.p_achievements[0].source).toBe('ai_parsed');
  });

  it('editing only the phone number on an update leaves an unchanged, previously-parsed bullet as ai_parsed', async () => {
    existingAchievements = [{ company: 'Acme', job_title: 'Engineer', achievement_text: 'Built APIs with Python', source: 'ai_parsed' }];

    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', { phone: '555-1234' }), rawText: 'Jane Doe resume text', resumeId: RESUME_ID }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_resume_id).toBe(RESUME_ID);
    expect(rpcArgs.p_achievements[0].achievement_text).toBe('Built APIs with Python');
    expect(rpcArgs.p_achievements[0].source).toBe('ai_parsed');
  });

  it('genuinely new/changed achievement text on an update becomes user_stated', async () => {
    existingAchievements = [{ company: 'Acme', job_title: 'Engineer', achievement_text: 'Built APIs with Python', source: 'ai_parsed' }];

    await POST(
      makeRequest({
        parsed: parsedResumeWithAchievement('Rewrote the API layer myself for better performance'),
        rawText: 'Jane Doe resume text',
        resumeId: RESUME_ID,
      })
    );

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_achievements[0].achievement_text).toBe('Rewrote the API layer myself for better performance');
    expect(rpcArgs.p_achievements[0].source).toBe('user_stated');
  });

  it('an unchanged achievement that was previously externally_verified keeps that source, never downgraded', async () => {
    existingAchievements = [{ company: 'Acme', job_title: 'Engineer', achievement_text: 'Built APIs with Python', source: 'externally_verified' }];

    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python'), rawText: 'Jane Doe resume text', resumeId: RESUME_ID }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_achievements[0].source).toBe('externally_verified');
  });
});

describe('POST /api/resume/save — projects (Step 3)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getEmbeddingMock.mockReset().mockResolvedValue([0.1, 0.2]);
    loadConceptDictionaryMock.mockReset().mockResolvedValue({
      aliasToConceptId: new Map([['postgres', 'concept-postgres'], ['postgresql', 'concept-postgres']]),
      conceptIdToName: new Map([['concept-postgres', 'PostgreSQL']]),
      incompatible: new Map(),
      equivalent: new Map(),
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'resume-1', error: null });
    resumesCount = 0;
    existingAchievements = [];
    existingProjects = [];
    pendingSkillSuggestions = [];
    suggestionUpdateMock.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('1. project creation: a fresh save (no resumeId) marks a project ai_parsed', async () => {
    const projects = [{ name: 'URL Shortener', description: 'A distributed URL shortener.' }];
    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', { projects }), rawText: 'Jane Doe resume text' }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_projects).toHaveLength(1);
    expect(rpcArgs.p_projects[0].name).toBe('URL Shortener');
    expect(rpcArgs.p_projects[0].source).toBe('ai_parsed');
  });

  it('2. project update: unrelated edit leaves an unchanged project at its existing source', async () => {
    existingProjects = [{ name: 'URL Shortener', description: 'A distributed URL shortener.', source: 'ai_parsed' }];
    const projects = [{ name: 'URL Shortener', description: 'A distributed URL shortener.' }];

    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', { phone: '555-1234', projects }), rawText: 'Jane Doe resume text', resumeId: RESUME_ID }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_projects[0].source).toBe('ai_parsed');
  });

  it('2b. genuinely changed project content on an update becomes user_stated', async () => {
    existingProjects = [{ name: 'URL Shortener', description: 'A distributed URL shortener.', source: 'ai_parsed' }];
    const projects = [{ name: 'URL Shortener', description: 'A distributed URL shortener with custom analytics.' }];

    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', { projects }), rawText: 'Jane Doe resume text', resumeId: RESUME_ID }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_projects[0].source).toBe('user_stated');
  });

  it('3. an unchanged project previously externally_verified keeps that source, never downgraded or inferred', async () => {
    existingProjects = [{ name: 'URL Shortener', description: 'A distributed URL shortener.', source: 'externally_verified' }];
    const projects = [{ name: 'URL Shortener', description: 'A distributed URL shortener.' }];

    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', { projects }), rawText: 'Jane Doe resume text', resumeId: RESUME_ID }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_projects[0].source).toBe('externally_verified');
  });

  it('4. project technologies are normalized into concept_ids via the concept dictionary', async () => {
    const projects = [{ name: 'Inventory Service', description: 'Backend service.', technologies: ['Postgres'] }];
    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', { projects }), rawText: 'Jane Doe resume text' }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_projects[0].concept_ids).toEqual(['concept-postgres']);
  });
});

describe('POST /api/resume/save — matched_by_later_fact (Step 4)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getEmbeddingMock.mockReset().mockResolvedValue([0.1, 0.2]);
    loadConceptDictionaryMock.mockReset().mockResolvedValue({
      aliasToConceptId: new Map(),
      conceptIdToName: new Map(),
      incompatible: new Map(),
      equivalent: new Map(),
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'resume-1', error: null });
    resumesCount = 0;
    existingAchievements = [];
    existingProjects = [];
    pendingSkillSuggestions = [];
    suggestionUpdateMock.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('a pending suggestion whose skill now appears in the saved resume is marked matched_by_later_fact', async () => {
    pendingSkillSuggestions = [{ id: 'sugg-1', content: { skill: 'Docker' } }];

    await POST(
      makeRequest({
        parsed: { ...parsedResumeWithAchievement('Built APIs with Python'), skills: ['Python', 'Docker'] },
        rawText: 'Jane Doe resume text',
        resumeId: RESUME_ID,
      })
    );

    expect(suggestionUpdateMock).toHaveBeenCalledWith({ status: 'matched_by_later_fact' }, 'id', ['sugg-1']);
  });

  it('an unrelated pending suggestion is left untouched', async () => {
    pendingSkillSuggestions = [{ id: 'sugg-1', content: { skill: 'Kubernetes' } }];

    await POST(
      makeRequest({
        parsed: { ...parsedResumeWithAchievement('Built APIs with Python'), skills: ['Python', 'Docker'] },
        rawText: 'Jane Doe resume text',
        resumeId: RESUME_ID,
      })
    );

    expect(suggestionUpdateMock).not.toHaveBeenCalled();
  });

  it('never converts a suggestion into candidate data — only ai_suggestions.status changes, achievements/projects are unaffected', async () => {
    pendingSkillSuggestions = [{ id: 'sugg-1', content: { skill: 'Docker' } }];

    await POST(
      makeRequest({
        parsed: { ...parsedResumeWithAchievement('Built APIs with Python'), skills: ['Python', 'Docker'] },
        rawText: 'Jane Doe resume text',
        resumeId: RESUME_ID,
      })
    );

    const rpcArgs = rpcMock.mock.calls[0][1];
    // The RPC's own achievements/skills payload is untouched by the suggestion match —
    // 'Docker' was never in the parsed achievement's skills[], so it never appears there.
    expect(rpcArgs.p_achievements[0].skills).toEqual(['Python']);
  });

  it('a fresh save (no resumeId) never queries ai_suggestions at all — there is nothing prior to match against', async () => {
    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python'), rawText: 'Jane Doe resume text' }));
    expect(suggestionUpdateMock).not.toHaveBeenCalled();
  });
});
