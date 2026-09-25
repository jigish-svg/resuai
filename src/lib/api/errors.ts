import { NextResponse } from 'next/server';

// PRD 20A error codes. internal_error is our one addition: the PRD list has no
// code for an unexpected server failure outside an analysis.
export const API_ERROR_STATUS = {
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  upstream_blocked: 502,
  analysis_failed: 502,
  guard_blocked: 422,
  needs_confirmation: 422,
  internal_error: 500,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> };
}

/** `message` is shown to the user as-is: keep it short and human, never exception text. */
export function apiError(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
  const body: ApiErrorBody = { error: details ? { code, message, details } : { code, message } };
  return NextResponse.json(body, { status: API_ERROR_STATUS[code] });
}

export const unauthorized = () => apiError('unauthorized', 'Please sign in again.');
