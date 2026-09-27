import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const suggestRoleSkillsMock = vi.fn();
const checkRateLimitMock = vi.fn();
const insertMock = vi.fn();
let resumeExists = true;
let existingSuggestions: { content: { skill: string } }[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: resumeExists ? { id: 'resume-1' } : null } as { data: { id: string } | null }) }) }) }) };
      }
      if (table === 'ai_suggestions') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ in: () => Promise.resolve({ data: existingSuggestions }) }) }) }),
          insert: (rows: unknown[]) => insertMock(rows),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

vi.mock('@/lib/openai/skill-suggestions', () => ({
  suggestRoleSkills: (...args: unknown[]) => suggestRoleSkillsMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitResponse: () => null,
  RATE_LIMITS: { suggestSkills: {} },
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/resume/suggest-skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/resume/suggest-skills — recommendation isolation (Step 4)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    suggestRoleSkillsMock.mockReset().mockResolvedValue(['Docker', 'Kubernetes']);
    insertMock.mockReset().mockResolvedValue({ error: null });
    resumeExists = true;
    existingSuggestions = [];
  });

  it('without resumeId, behaves exactly as before: ephemeral, nothing persisted', async () => {
    const res = await POST(makeRequest({ jobTitles: ['Backend Engineer'] }));
    const data = await res.json();

    expect(data.suggestions).toEqual(['Docker', 'Kubernetes']);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('with resumeId, persists each suggestion as a pending ai_suggestions row', async () => {
    await POST(makeRequest({ jobTitles: ['Backend Engineer'], resumeId: RESUME_ID }));

    expect(insertMock).toHaveBeenCalledWith([
      { user_id: 'user-1', resume_id: RESUME_ID, suggestion_type: 'skill', content: { skill: 'Docker' } },
      { user_id: 'user-1', resume_id: RESUME_ID, suggestion_type: 'skill', content: { skill: 'Kubernetes' } },
    ]);
  });

  it('does not re-insert a suggestion already pending or matched for this resume', async () => {
    existingSuggestions = [{ content: { skill: 'Docker' } }];
    await POST(makeRequest({ jobTitles: ['Backend Engineer'], resumeId: RESUME_ID }));

    expect(insertMock).toHaveBeenCalledWith([
      { user_id: 'user-1', resume_id: RESUME_ID, suggestion_type: 'skill', content: { skill: 'Kubernetes' } },
    ]);
  });

  it('never persists a recommendation as candidate evidence — the response shape is unchanged regardless of resumeId', async () => {
    const res = await POST(makeRequest({ jobTitles: ['Backend Engineer'], resumeId: RESUME_ID }));
    const data = await res.json();
    expect(data).toEqual({ suggestions: ['Docker', 'Kubernetes'] });
  });

  it('does not persist anything if the resumeId does not belong to the caller', async () => {
    resumeExists = false;
    await POST(makeRequest({ jobTitles: ['Backend Engineer'], resumeId: RESUME_ID }));
    expect(insertMock).not.toHaveBeenCalled();
  });
});
