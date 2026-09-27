import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
let versions: { id: string; label: string; created_by_action: string; created_at: string }[] = [];

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'resume-1' } }) }) }) }) };
      if (table === 'resume_versions') {
        return { select: () => ({ eq: () => ({ order: async () => ({ data: versions, error: null }) }) }) };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest() {
  return new NextRequest('http://localhost/api/resume/versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: RESUME_ID }),
  });
}

describe('POST /api/resume/versions', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    versions = [
      { id: 'v2', label: 'Manual update', created_by_action: 'manual_save', created_at: '2024-01-02' },
      { id: 'v1', label: 'Original upload', created_by_action: 'upload', created_at: '2024-01-01' },
    ];
  });

  it('lists versions without the snapshot payload', async () => {
    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.versions).toEqual(versions);
    expect(data.versions[0].snapshot).toBeUndefined();
  });
});
