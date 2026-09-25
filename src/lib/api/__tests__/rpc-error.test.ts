import { describe, expect, it, vi } from 'vitest';
import { rpcError } from '@/lib/api/rpc-error';

const body = async (res: Response) => (await res.json()).error;

describe('rpcError', () => {
  it('maps P0002 to not_found with the given message', async () => {
    const res = rpcError({ code: 'P0002', message: 'Resume not found' }, { notFound: 'Resume not found.', fallback: 'Failed.' });
    expect(res.status).toBe(404);
    expect(await body(res)).toEqual({ code: 'not_found', message: 'Resume not found.' });
  });

  it('maps 22023 to validation_failed', async () => {
    const res = rpcError({ code: '22023', message: 'bad ref' }, { notFound: 'x', fallback: 'Failed.' });
    expect(res.status).toBe(422);
    expect((await body(res)).code).toBe('validation_failed');
  });

  it('maps 42501 to unauthorized', async () => {
    expect(rpcError({ code: '42501', message: 'x' }, { notFound: 'x', fallback: 'Failed.' }).status).toBe(401);
  });

  it('logs anything else and returns internal_error without the database text', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = rpcError({ code: '23505', message: 'duplicate key value violates unique constraint' }, { notFound: 'x', fallback: 'Failed to save. Please try again.' });
    expect(res.status).toBe(500);
    const text = JSON.stringify(await body(res));
    expect(text).not.toContain('duplicate key');
    expect(text).toContain('Failed to save. Please try again.');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
