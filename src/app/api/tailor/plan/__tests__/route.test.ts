import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const rpcMock = vi.fn();
const runTruthGuardMock = vi.fn();
const getResumeForJobMock = vi.fn();
const generateTailoringPlanMock = vi.fn();
const isPaidUserMock = vi.fn();
const checkRateLimitMock = vi.fn();

function chain(data: unknown): unknown {
  const node = {
    select: () => chain(data),
    eq: () => chain(data),
    order: () => chain(data),
    single: async () => ({ data }),
    maybeSingle: async () => ({ data }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
  return node;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'jobs') return chain({ id: 'job-1', title: 'Backend Engineer', company: 'Acme', keywords: [], resume_id: 'resume-1' });
      if (table === 'job_requirements') return chain([]);
      if (table === 'achievements') return chain([]);
      throw new Error(`Unexpected table in test: ${table}`);
    },
    rpc: (name: string, args: unknown) => rpcMock(name, args),
  }),
}));

vi.mock('@/lib/resume/get-resume-for-job', () => ({
  getResumeForJob: (...args: unknown[]) => getResumeForJobMock(...args),
}));

vi.mock('@/lib/openai/tailoring-engine', () => ({
  generateTailoringPlan: (...args: unknown[]) => generateTailoringPlanMock(...args),
  runTruthGuard: (...args: unknown[]) => runTruthGuardMock(...args),
}));

vi.mock('@/lib/plan', () => ({ isPaidUser: (...args: unknown[]) => isPaidUserMock(...args) }));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitResponse: () => null,
  RATE_LIMITS: { tailorPlan: {} },
}));

import { POST } from '../route';

const VALID_JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';
const VALID_SECTIONS = [{ section_type: 'summary', sort_order: 0, content: { text: 'Backend engineer.' } }];

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/tailor/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tailor/plan — non-blocking Truth Guard feedback, never persists', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    isPaidUserMock.mockReset().mockResolvedValue(true);
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'Backend engineer.' });
    generateTailoringPlanMock.mockReset().mockResolvedValue({
      summary_change: { proposed: 'Rewritten summary', rationale: 'r' },
      bullet_changes: [],
      skills_to_add: [],
      skills_to_remove: [],
      gaps: [],
    });
    runTruthGuardMock.mockReset();
    rpcMock.mockReset();
  });

  it('7. attaches truthGuard metadata to the response and never calls any persistence RPC', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'x', reason: 'r', source: 'not_in_resume' }], passed: false });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.truthGuard.status).toBe('unsupported');
    expect(data.truthGuard.flags).toHaveLength(1);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('reports supported when nothing is flagged', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });
    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();
    expect(data.truthGuard.status).toBe('supported');
  });
});
