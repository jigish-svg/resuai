import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
let autosaveRow: { draft: unknown; updated_at: string } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'resume-1' } }) }) }) }) };
      if (table === 'resume_autosave_state') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: autosaveRow }) }) }) };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest() {
  return new NextRequest('http://localhost/api/resume/autosave/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: RESUME_ID }),
  });
}

describe('POST /api/resume/autosave/get', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('returns null when no draft exists', async () => {
    autosaveRow = null;
    const res = await POST(makeRequest());
    const data = await res.json();
    expect(data.draft).toBeNull();
  });

  it('returns the current draft when one exists', async () => {
    autosaveRow = { draft: { summary: 'in progress' }, updated_at: '2024-01-01T00:00:00Z' };
    const res = await POST(makeRequest());
    const data = await res.json();
    expect(data.draft).toEqual({ summary: 'in progress' });
  });
});
