import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const upsertMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'resume-1' } }) }) }) }) };
      if (table === 'resume_autosave_state') {
        return { upsert: (row: unknown, opts: unknown) => upsertMock(row, opts) };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest(draft: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/resume/autosave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: RESUME_ID, draft }),
  });
}

describe('POST /api/resume/autosave', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    upsertMock.mockReset().mockResolvedValue({ error: null });
  });

  it('upserts the draft, one row per resume (onConflict: resume_id) — never creates a version', async () => {
    const res = await POST(makeRequest({ summary: 'in progress...' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.saved).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith({ resume_id: RESUME_ID, draft: { summary: 'in progress...' } }, { onConflict: 'resume_id' });
    // No mock handler for 'resume_versions' exists in this test's supabase mock —
    // if the route ever wrote one, from('resume_versions') would throw, proving
    // autosave never creates a version.
  });

  it('a second autosave call overwrites via the same upsert, not a fresh insert', async () => {
    await POST(makeRequest({ summary: 'draft 1' }));
    await POST(makeRequest({ summary: 'draft 2' }));

    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenLastCalledWith({ resume_id: RESUME_ID, draft: { summary: 'draft 2' } }, { onConflict: 'resume_id' });
  });

  it('rejects an oversized draft', async () => {
    const res = await POST(makeRequest({ blob: 'x'.repeat(200_000) }));
    expect(res.status).toBe(422);
  });
});
