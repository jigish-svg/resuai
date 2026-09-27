import { describe, expect, it, vi, beforeEach } from 'vitest';

const lookupMock = vi.fn();

vi.mock('node:dns/promises', () => ({
  default: { lookup: (...args: unknown[]) => lookupMock(...args) },
}));

import { fetchJobPostingText, UrlFetchError } from '../fetch-job-url';

function htmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...init });
}

describe('fetchJobPostingText', () => {
  beforeEach(() => {
    lookupMock.mockReset().mockResolvedValue([{ address: '93.184.216.34' }]); // a public address
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rejects a non-http(s) scheme before any network call', async () => {
    await expect(fetchJobPostingText('ftp://example.com/file')).rejects.toThrow(UrlFetchError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects localhost outright', async () => {
    await expect(fetchJobPostingText('http://localhost:3000/internal')).rejects.toThrow(UrlFetchError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['loopback', '127.0.0.1'],
    ['private 10.x', '10.0.0.5'],
    ['private 192.168.x', '192.168.1.1'],
    ['private 172.16-31.x', '172.20.0.1'],
    ['link-local', '169.254.169.254'],
  ])('rejects a hostname that resolves to a %s address (SSRF guard)', async (_label, ip) => {
    lookupMock.mockResolvedValue([{ address: ip }]);
    await expect(fetchJobPostingText('http://internal.example.com/')).rejects.toThrow(UrlFetchError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches a public URL and strips HTML down to readable text', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(htmlResponse('<html><body><script>evil()</script><h1>Backend Engineer</h1><p>5+ years Python</p></body></html>'));
    const text = await fetchJobPostingText('https://jobs.example.com/posting/1');
    expect(text).toContain('Backend Engineer');
    expect(text).toContain('5+ years Python');
    expect(text).not.toContain('evil()');
    expect(text).not.toContain('<h1>');
  });

  it('follows a same-safety redirect and re-validates the destination', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://jobs.example.com/posting/1-final' } }))
      .mockResolvedValueOnce(htmlResponse('<p>Final page content</p>'));
    const text = await fetchJobPostingText('https://jobs.example.com/posting/1');
    expect(text).toContain('Final page content');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects a redirect chain that is too long', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://jobs.example.com/next' } }));
    await expect(fetchJobPostingText('https://jobs.example.com/posting/1')).rejects.toThrow(UrlFetchError);
  });

  it('rejects a non-HTML/text response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('binary', { status: 200, headers: { 'content-type': 'application/pdf' } }));
    await expect(fetchJobPostingText('https://jobs.example.com/posting/1.pdf')).rejects.toThrow(UrlFetchError);
  });

  it('rejects an upstream error status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404, headers: { 'content-type': 'text/html' } }));
    await expect(fetchJobPostingText('https://jobs.example.com/missing')).rejects.toThrow(UrlFetchError);
  });
});
