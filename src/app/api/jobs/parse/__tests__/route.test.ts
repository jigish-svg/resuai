import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const checkRateLimitMock = vi.fn();
const parseJobDescriptionMock = vi.fn();
const extractRequirementsMock = vi.fn();
const fetchJobPostingTextMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: () => getUserMock() } }),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitResponse: () => null,
  RATE_LIMITS: { jobParse: {} },
}));

vi.mock('@/lib/openai/jd-parser', () => ({
  parseJobDescription: (...args: unknown[]) => parseJobDescriptionMock(...args),
  extractRequirements: (...args: unknown[]) => extractRequirementsMock(...args),
}));

vi.mock('@/lib/parsers/fetch-job-url', async () => {
  const actual = await vi.importActual<typeof import('@/lib/parsers/fetch-job-url')>('@/lib/parsers/fetch-job-url');
  return {
    ...actual,
    fetchJobPostingText: (...args: unknown[]) => fetchJobPostingTextMock(...args),
  };
});

import { POST } from '../route';
import { UrlFetchError } from '@/lib/parsers/fetch-job-url';

function makeRequest(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  return new NextRequest('http://localhost/api/jobs/parse', { method: 'POST', body: formData });
}

const LONG_TEXT = 'Senior Backend Engineer. '.repeat(10);

describe('POST /api/jobs/parse', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } } });
    checkRateLimitMock.mockReset().mockResolvedValue('allowed');
    parseJobDescriptionMock.mockReset().mockResolvedValue({ job_title: 'Backend Engineer' });
    extractRequirementsMock.mockReset().mockResolvedValue({ requirements: [] });
    fetchJobPostingTextMock.mockReset();
  });

  it('parses pasted text without touching the URL fetcher', async () => {
    const res = await POST(makeRequest({ text: LONG_TEXT }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.rawText).toBe(LONG_TEXT);
    expect(fetchJobPostingTextMock).not.toHaveBeenCalled();
  });

  it('fetches and parses a URL-only submission (Phase C integration fix)', async () => {
    fetchJobPostingTextMock.mockResolvedValueOnce(LONG_TEXT);
    const res = await POST(makeRequest({ url: 'https://jobs.example.com/posting/123' }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(fetchJobPostingTextMock).toHaveBeenCalledWith('https://jobs.example.com/posting/123');
    expect(data.rawText).toBe(LONG_TEXT);
    expect(data.parsed).toBeDefined();
    expect(data.requirements).toBeDefined();
  });

  it('ignores the url field when text is also present (url is informational only in that path)', async () => {
    const res = await POST(makeRequest({ text: LONG_TEXT, url: 'https://jobs.example.com/posting/123' }));
    expect(res.status).toBe(200);
    expect(fetchJobPostingTextMock).not.toHaveBeenCalled();
  });

  it('surfaces a UrlFetchError as a clean validation_failed response, not a 500', async () => {
    fetchJobPostingTextMock.mockRejectedValueOnce(new UrlFetchError('This URL cannot be fetched.'));
    const res = await POST(makeRequest({ url: 'https://jobs.example.com/posting/123' }));
    const data = await res.json();
    expect(res.status).toBe(422);
    expect(data.error.code).toBe('validation_failed');
    expect(data.error.message).toBe('This URL cannot be fetched.');
  });

  it('rejects a non-http(s) URL at the schema level before ever calling the fetcher', async () => {
    const res = await POST(makeRequest({ url: 'javascript:alert(1)' }));
    expect(res.status).toBe(422);
    expect(fetchJobPostingTextMock).not.toHaveBeenCalled();
  });

  it('returns validation_failed when neither file, text, nor url is provided', async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();
    expect(res.status).toBe(422);
    expect(data.error.code).toBe('validation_failed');
  });
});
