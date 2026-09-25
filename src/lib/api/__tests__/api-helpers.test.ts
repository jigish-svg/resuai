import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiError, API_ERROR_STATUS } from '@/lib/api/errors';
import { parseJsonBody, parseFormFields } from '@/lib/api/parse-body';
import { apiErrorMessage } from '@/lib/api/client';

const jsonRequest = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });

const Body = z.object({ jobId: z.string().uuid(), note: z.string().max(10).nullish() }).strict();
const JOB_ID = '5b3c1a52-7f0e-4d8a-9a31-2f4f6f1e9c11';

describe('apiError', () => {
  it('uses the PRD envelope and the mapped status', async () => {
    const res = apiError('not_found', 'Job not found.');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'Job not found.' } });
  });

  it('includes details only when given', async () => {
    const res = apiError('validation_failed', 'Check the form.', { fields: [] });
    expect(await res.json()).toEqual({
      error: { code: 'validation_failed', message: 'Check the form.', details: { fields: [] } },
    });
  });

  it('maps every code to a 4xx or 5xx status', () => {
    for (const status of Object.values(API_ERROR_STATUS)) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
    expect(API_ERROR_STATUS.validation_failed).toBe(422);
    expect(API_ERROR_STATUS.rate_limited).toBe(429);
    expect(API_ERROR_STATUS.internal_error).toBe(500);
  });
});

describe('parseJsonBody', () => {
  it('returns typed data for a valid body', async () => {
    const result = await parseJsonBody(jsonRequest(JSON.stringify({ jobId: JOB_ID })), Body);
    expect(result).toEqual({ ok: true, data: { jobId: JOB_ID } });
  });

  it('rejects unknown fields with validation_failed', async () => {
    const result = await parseJsonBody(jsonRequest(JSON.stringify({ jobId: JOB_ID, user_id: 'x' })), Body);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(422);
    const body = await result.response.json();
    expect(body.error.code).toBe('validation_failed');
    expect(body.error.details.fields).toEqual([{ path: '', code: 'unrecognized_keys' }]);
  });

  it('rejects invalid JSON with validation_failed', async () => {
    const result = await parseJsonBody(jsonRequest('{not json'), Body);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(422);
    expect((await result.response.json()).error.code).toBe('validation_failed');
  });

  it('rejects a body over the byte cap with payload_too_large', async () => {
    const result = await parseJsonBody(jsonRequest(JSON.stringify({ jobId: JOB_ID, note: 'x'.repeat(200) })), Body, {
      maxBytes: 50,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(413);
  });

  it('never echoes submitted values in details', async () => {
    const secret = 'my private resume text';
    const result = await parseJsonBody(jsonRequest(JSON.stringify({ jobId: secret, note: secret })), Body);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = await result.response.text();
    expect(text).not.toContain(secret);
    expect(JSON.parse(text).error.details.fields).toEqual([
      { path: 'jobId', code: 'invalid_string' },
      { path: 'note', code: 'too_big' },
    ]);
  });
});

describe('parseFormFields', () => {
  const Fields = z.object({ resumeId: z.string().uuid().nullish(), description: z.string().max(5).nullish() }).strict();

  it('validates text fields and ignores the named file fields', () => {
    const form = new FormData();
    form.set('resumeId', JOB_ID);
    form.set('file', new Blob(['x']), 'a.pdf');
    expect(parseFormFields(form, Fields, ['file'])).toEqual({ ok: true, data: { resumeId: JOB_ID } });
  });

  it('rejects unknown text fields', () => {
    const form = new FormData();
    form.set('user_id', 'x');
    const result = parseFormFields(form, Fields, ['file']);
    expect(result.ok).toBe(false);
  });

  it('rejects a file where a text field is expected', () => {
    const form = new FormData();
    form.set('description', new Blob(['x']), 'd.txt');
    const result = parseFormFields(form, Fields, ['file']);
    expect(result.ok).toBe(false);
  });
});

describe('apiErrorMessage', () => {
  it('reads the PRD envelope', () => {
    expect(apiErrorMessage({ error: { code: 'not_found', message: 'Job not found.' } }, 'Fallback')).toBe('Job not found.');
  });

  it('falls back on missing or malformed bodies', () => {
    expect(apiErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(apiErrorMessage({}, 'Fallback')).toBe('Fallback');
    expect(apiErrorMessage({ error: { message: 42 } }, 'Fallback')).toBe('Fallback');
    expect(apiErrorMessage({ error: { message: '  ' } }, 'Fallback')).toBe('Fallback');
  });

  it('ignores a bare string error (old format)', () => {
    expect(apiErrorMessage({ error: 'raw exception text' }, 'Fallback')).toBe('Fallback');
  });
});
