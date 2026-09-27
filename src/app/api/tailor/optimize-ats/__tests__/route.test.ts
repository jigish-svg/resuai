import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const rpcMock = vi.fn();
const runTruthGuardMock = vi.fn();
const getResumeForJobMock = vi.fn();
const optimizeResumeForATSMock = vi.fn();
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
      if (table === 'jobs') return chain({ id: 'job-1', keywords: [], resume_id: 'resume-1' });
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
  optimizeResumeForATS: (...args: unknown[]) => optimizeResumeForATSMock(...args),
  runTruthGuard: (...args: unknown[]) => runTruthGuardMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitResponse: () => null,
  RATE_LIMITS: { tailorOptimizeAts: {} },
}));

import { POST } from '../route';

const VALID_JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';
const VALID_SECTIONS = [
  { section_type: 'summary', sort_order: 0, content: { text: 'Backend engineer.' } },
  {
    section_type: 'experience',
    sort_order: 1,
    content: { experiences: [{ company: 'Acme', job_title: 'Eng', start_date: '2020-01', is_current: true, bullets: ['Did a thing'] }] },
  },
  { section_type: 'skills', sort_order: 2, content: { skills: ['Python'] } },
];

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/tailor/optimize-ats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/tailor/optimize-ats — non-blocking Truth Guard feedback, never persists', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    getResumeForJobMock.mockReset().mockResolvedValue({ id: 'resume-1', raw_text: 'Backend engineer. Did a thing.' });
    optimizeResumeForATSMock.mockReset().mockResolvedValue({
      summary: 'Optimized summary',
      experience: [{ bullets: ['Did an optimized thing'] }],
      skills: ['Python', 'FastAPI'],
      keywords_added: ['FastAPI'],
      keywords_still_missing: [],
    });
    runTruthGuardMock.mockReset();
    rpcMock.mockReset();
  });

  it('8. attaches truthGuard metadata to the response and never calls any persistence RPC', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [{ text: 'FastAPI', reason: 'r', source: 'not_in_resume' }], passed: false });

    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.truthGuard.status).toBe('unsupported');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('reports supported when nothing is flagged', async () => {
    runTruthGuardMock.mockResolvedValue({ flags: [], passed: true });
    const res = await POST(makeRequest({ jobId: VALID_JOB_ID, sections: VALID_SECTIONS }));
    const data = await res.json();
    expect(data.truthGuard.status).toBe('supported');
  });
});
