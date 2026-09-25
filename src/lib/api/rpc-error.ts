import { apiError } from './errors';

// SQLSTATEs raised by the functions in migration 019.
const NOT_FOUND = 'P0002';
const BAD_REFERENCE = '22023';
const NOT_AUTHENTICATED = '42501';

/** Turns a failed save RPC into a user-facing error. Database text is logged, never returned. */
export function rpcError(
  error: { code?: string; message?: string },
  messages: { notFound: string; fallback: string }
) {
  switch (error.code) {
    case NOT_FOUND:
      return apiError('not_found', messages.notFound);
    case BAD_REFERENCE:
      return apiError('validation_failed', "Some of what was sent wasn't valid. Please check and try again.");
    case NOT_AUTHENTICATED:
      return apiError('unauthorized', 'Please sign in again.');
    default:
      console.error('Save failed:', error);
      return apiError('internal_error', messages.fallback);
  }
}
