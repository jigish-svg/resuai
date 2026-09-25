import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

const client = (rpc: () => unknown) => ({ rpc: vi.fn(rpc) }) as unknown as SupabaseClient;

afterEach(() => vi.restoreAllMocks());

describe('checkRateLimit', () => {
  it('passes through allowed and limited answers', async () => {
    expect(await checkRateLimit(client(async () => ({ data: true, error: null })), RATE_LIMITS.match)).toBe('allowed');
    expect(await checkRateLimit(client(async () => ({ data: false, error: null })), RATE_LIMITS.match)).toBe('limited');
  });

  it('fails closed on an AI route when the RPC errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await checkRateLimit(
      client(async () => ({ data: null, error: { message: 'function does not exist' } })),
      RATE_LIMITS.match
    );
    expect(result).toBe('unavailable');
  });

  it('fails closed when the call throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await checkRateLimit(
      client(async () => {
        throw new Error('fetch failed');
      }),
      RATE_LIMITS.coverLetter
    );
    expect(result).toBe('unavailable');
  });

  it('treats a non-boolean answer as a failure, not a yes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await checkRateLimit(client(async () => ({ data: null, error: null })), RATE_LIMITS.match)).toBe('unavailable');
    expect(await checkRateLimit(client(async () => ({ data: 'true', error: null })), RATE_LIMITS.match)).toBe('unavailable');
  });

  it('still allows evidence uploads when the limiter is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await checkRateLimit(
      client(async () => ({ data: null, error: { message: 'down' } })),
      RATE_LIMITS.evidenceUpload
    );
    expect(result).toBe('allowed');
  });

  it('logs every limiter failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await checkRateLimit(client(async () => ({ data: null, error: { message: 'down' } })), RATE_LIMITS.match);
    expect(log).toHaveBeenCalled();
  });
});

describe('RATE_LIMITS', () => {
  it('fails closed for every bucket except evidence uploads', () => {
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      expect({ name, onError: config.onError }).toEqual({ name, onError: name === 'evidenceUpload' ? 'allow' : 'deny' });
    }
  });
});

describe('rateLimitResponse', () => {
  it('returns nothing when allowed', () => {
    expect(rateLimitResponse('allowed')).toBeNull();
  });

  it('maps limited to rate_limited 429', async () => {
    const res = rateLimitResponse('limited')!;
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: { code: 'rate_limited', message: RATE_LIMIT_MESSAGE } });
  });

  it('does not blame the user when the limiter is unavailable', async () => {
    const res = rateLimitResponse('unavailable')!;
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
    expect(body.error.message).not.toBe(RATE_LIMIT_MESSAGE);
  });
});
