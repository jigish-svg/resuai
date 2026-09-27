import dns from 'node:dns/promises';
import net from 'node:net';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

/** A short, user-facing message only — never exposes internals. */
export class UrlFetchError extends Error {}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
  }
  return true;
}

/** Rejects anything that is not a public http(s) host: loopback, private/link-local ranges, and non-http(s) schemes. */
async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlFetchError('Only http/https URLs are supported.');
  }
  if (url.hostname === 'localhost') {
    throw new UrlFetchError('This URL cannot be fetched.');
  }
  let addresses: string[];
  try {
    addresses = (await dns.lookup(url.hostname, { all: true })).map((r) => r.address);
  } catch {
    throw new UrlFetchError('Could not resolve this URL.');
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new UrlFetchError('This URL cannot be fetched.');
  }
}

function stripHtml(html: string): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, '\n');
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'");
  return decoded.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n\n').trim();
}

/**
 * Fetches a job posting page server-side and returns its readable text — the
 * candidate for job_requirements extraction downstream (jd-parser.ts already
 * treats this exactly like pasted text: untrusted data, never instructions).
 *
 * SSRF guard: only public http(s) hosts are allowed. Each hop (including
 * redirects, followed manually and re-checked) is resolved and rejected if it
 * points at a loopback/private/link-local address. This does not fully close
 * a DNS-rebinding race between the check and the actual fetch — acceptable
 * for a Phase 0 baseline, not a hardened egress proxy.
 */
export async function fetchJobPostingText(rawUrl: string): Promise<string> {
  let url = new URL(rawUrl);

  for (let hop = 0; ; hop++) {
    await assertPublicHttpUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'GetJobFitBot/1.0 (job description fetch)' },
      });
    } catch {
      throw new UrlFetchError('Could not reach this URL.');
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location || hop >= MAX_REDIRECTS) {
        throw new UrlFetchError('This URL redirects too many times.');
      }
      url = new URL(location, url);
      continue;
    }

    if (!res.ok) {
      throw new UrlFetchError(`The page returned an error (${res.status}).`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new UrlFetchError('This URL did not return a readable page.');
    }

    const reader = res.body?.getReader();
    if (!reader) throw new UrlFetchError('Could not read the page content.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        controller.abort();
        throw new UrlFetchError('This page is too large to fetch.');
      }
      chunks.push(value);
    }

    return stripHtml(Buffer.concat(chunks).toString('utf-8'));
  }
}
