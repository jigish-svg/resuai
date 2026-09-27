import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const rpcMock = vi.fn();
const getEmbeddingMock = vi.fn();
const loadConceptDictionaryMock = vi.fn();
const checkRateLimitMock = vi.fn();
let resumesCount = 0;
let existingAchievements: { company: string; job_title: string; achievement_text: string; source: string }[] = [];

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

function parsedResumeWithAchievement(achievementText: string, phone?: string) {
  return {
    candidate: { name: 'Jane Doe', email: 'jane@example.com', ...(phone ? { phone } : {}) },
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
      aliasToConceptId: new Map(),
      conceptIdToName: new Map(),
      incompatible: new Map(),
      equivalent: new Map(),
    });
    rpcMock.mockReset().mockResolvedValue({ data: 'resume-1', error: null });
    resumesCount = 0;
    existingAchievements = [];
  });

  it('a fresh save (no resumeId) marks every achievement ai_parsed', async () => {
    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python'), rawText: 'Jane Doe resume text' }));

    const rpcArgs = rpcMock.mock.calls[0][1];
    expect(rpcArgs.p_resume_id).toBeNull();
    expect(rpcArgs.p_achievements[0].source).toBe('ai_parsed');
  });

  it('editing only the phone number on an update leaves an unchanged, previously-parsed bullet as ai_parsed', async () => {
    existingAchievements = [{ company: 'Acme', job_title: 'Engineer', achievement_text: 'Built APIs with Python', source: 'ai_parsed' }];

    await POST(makeRequest({ parsed: parsedResumeWithAchievement('Built APIs with Python', '555-1234'), rawText: 'Jane Doe resume text', resumeId: RESUME_ID }));

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
