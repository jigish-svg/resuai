import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const performResumeSaveMock = vi.fn();
let version: { id: string; snapshot: unknown } | null = null;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'resumes') return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'resume-1' } }) }) }) }) };
      if (table === 'resume_versions') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: version }) }) }) }) };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

vi.mock('@/lib/resume/perform-save', async () => {
  const actual = await vi.importActual<typeof import('@/lib/resume/perform-save')>('@/lib/resume/perform-save');
  return {
    ...actual,
    performResumeSave: (...args: unknown[]) => performResumeSaveMock(...args),
  };
});

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => 'allowed'),
  rateLimitResponse: () => null,
  RATE_LIMITS: { resumeRestore: {} },
}));

import { POST } from '../route';

const RESUME_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';
const VERSION_ID = '6c4d2b63-8a1f-5e9b-0b42-3a5a7a2f0d22';

function makeRequest() {
  return new NextRequest('http://localhost/api/resume/versions/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId: RESUME_ID, versionId: VERSION_ID }),
  });
}

describe('POST /api/resume/versions/restore', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    performResumeSaveMock.mockReset().mockResolvedValue({ resumeId: RESUME_ID });
  });

  it('restoring an upload/manual_save snapshot calls performResumeSave tagged as a restore', async () => {
    version = { id: VERSION_ID, snapshot: { parsed: { skills: ['Python'] }, rawText: 'old text', name: null, template: null } };

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.restored).toBe(true);
    expect(performResumeSaveMock).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ rawText: 'old text', resumeId: RESUME_ID, versionAction: 'restore' })
    );
  });

  it('a tailor_accept snapshot is returned as-is, never applied directly (bypassing Truth Guard)', async () => {
    version = { id: VERSION_ID, snapshot: { jobId: 'job-1', sections: [{ section_type: 'summary', sort_order: 0, content: { text: 'x' } }] } };

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(data.restored).toBe(false);
    expect(data.snapshot).toEqual(version.snapshot);
    expect(performResumeSaveMock).not.toHaveBeenCalled();
  });

  it('404s when the version does not belong to this resume', async () => {
    version = null;
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });
});
