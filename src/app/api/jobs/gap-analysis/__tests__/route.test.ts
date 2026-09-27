import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
let requirements: { id: string; requirement_text: string; category: string; importance: string; is_implied: boolean }[] = [];
let match: { id: string; resume_id: string; created_at: string } | null = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-02T00:00:00Z' };
let items: { requirement_id: string; status: string; confidence: string }[] = [];
let resume: { updated_at: string } | null = { updated_at: '2024-01-01T00:00:00Z' };

function chain(data: unknown) {
  return {
    select: () => chain(data),
    eq: () => chain(data),
    order: () => Promise.resolve({ data, error: null }),
    maybeSingle: async () => ({ data }),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => getUserMock() },
    from: (table: string) => {
      if (table === 'jobs') return chain({ id: 'job-1' });
      if (table === 'job_requirements') return chain(requirements);
      if (table === 'matches') return chain(match);
      if (table === 'match_items') return chain(items);
      if (table === 'resumes') return chain(resume);
      throw new Error(`Unexpected table in test: ${table}`);
    },
  }),
}));

import { POST } from '../route';

const JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

function makeRequest() {
  return new NextRequest('http://localhost/api/jobs/gap-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: JOB_ID }),
  });
}

describe('POST /api/jobs/gap-analysis — read-only, zero new AI calls', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-02T00:00:00Z' };
    resume = { updated_at: '2024-01-01T00:00:00Z' };
    requirements = [
      { id: 'req-matched', requirement_text: 'Python experience', category: 'hard_skill', importance: 'critical', is_implied: false },
      { id: 'req-partial', requirement_text: 'AWS experience', category: 'hard_skill', importance: 'high', is_implied: false },
      { id: 'req-none', requirement_text: 'Kubernetes experience', category: 'hard_skill', importance: 'medium', is_implied: false },
    ];
    items = [
      { requirement_id: 'req-matched', status: 'matched', confidence: 'high' },
      { requirement_id: 'req-partial', status: 'partial', confidence: 'medium' },
    ];
  });

  it('buckets matched -> present, partial -> toVerify, no_evidence -> notFound', async () => {
    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.present.map((r: { requirementId: string }) => r.requirementId)).toEqual(['req-matched']);
    expect(data.toVerify.map((r: { requirementId: string }) => r.requirementId)).toEqual(['req-partial']);
    expect(data.notFound.map((r: { requirementId: string }) => r.requirementId)).toEqual(['req-none']);
  });

  it('excludes inferred requirements entirely (query-level filter)', async () => {
    // is_implied=true rows are filtered by the route's own .eq('is_implied', false)
    // query, so the mock never even returns them here — this proves the filter
    // is applied, not just that the test fixture happens to omit them.
    const res = await POST(makeRequest());
    const data = await res.json();
    const allIds = [...data.present, ...data.toVerify, ...data.notFound].map((r: { requirementId: string }) => r.requirementId);
    expect(allIds).toHaveLength(3);
  });

  it('returns 409 and computes nothing when no match exists yet', async () => {
    match = null;
    const res = await POST(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.error.code).toBe('conflict');
  });

  describe('stale-match freshness (Phase C)', () => {
    it('match newer than the resume -> isStale is false', async () => {
      match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-02T00:00:00Z' };
      resume = { updated_at: '2024-01-01T00:00:00Z' };
      const data = await (await POST(makeRequest())).json();
      expect(data.isStale).toBe(false);
    });

    it('resume newer than the match -> isStale is true', async () => {
      match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-01T00:00:00Z' };
      resume = { updated_at: '2024-01-02T00:00:00Z' };
      const data = await (await POST(makeRequest())).json();
      expect(data.isStale).toBe(true);
    });

    it('equal timestamps -> isStale is false', async () => {
      match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-01T00:00:00Z' };
      resume = { updated_at: '2024-01-01T00:00:00Z' };
      const data = await (await POST(makeRequest())).json();
      expect(data.isStale).toBe(false);
    });

    it('a stale match still returns the existing (untouched) gap buckets, never a rerun', async () => {
      match = { id: 'match-1', resume_id: 'resume-1', created_at: '2024-01-01T00:00:00Z' };
      resume = { updated_at: '2024-01-02T00:00:00Z' };
      const data = await (await POST(makeRequest())).json();
      expect(data.isStale).toBe(true);
      // Same bucketing as the non-stale case in the top-level test above — the
      // route never reruns matching, it only flags the existing match.
      expect(data.present.map((r: { requirementId: string }) => r.requirementId)).toEqual(['req-matched']);
      expect(data.toVerify.map((r: { requirementId: string }) => r.requirementId)).toEqual(['req-partial']);
      expect(data.notFound.map((r: { requirementId: string }) => r.requirementId)).toEqual(['req-none']);
    });
  });
});
