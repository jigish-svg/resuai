import type { NextResponse } from 'next/server';
import type { z } from 'zod';
import { apiError } from './errors';

export const DEFAULT_MAX_BODY_BYTES = 1_000_000;

const INVALID_MESSAGE = "Some of what was sent wasn't valid. Please check and try again.";
const TOO_LARGE_MESSAGE = 'That is too much text to send at once. Please shorten it and try again.';

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

// Paths and issue codes only: the values can be resume or job text.
function fieldIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), code: issue.code }));
}

function fromSchema<S extends z.ZodTypeAny>(schema: S, input: unknown): ParseResult<z.infer<S>> {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { ok: false, response: apiError('validation_failed', INVALID_MESSAGE, { fields: fieldIssues(result.error) }) };
  }
  return { ok: true, data: result.data };
}

export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
  { maxBytes = DEFAULT_MAX_BODY_BYTES }: { maxBytes?: number } = {}
): Promise<ParseResult<z.infer<S>>> {
  // Content-Length can be absent or wrong, so the real size is checked after reading.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, response: apiError('payload_too_large', TOO_LARGE_MESSAGE) };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, response: apiError('payload_too_large', TOO_LARGE_MESSAGE) };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: apiError('validation_failed', INVALID_MESSAGE) };
  }
  return fromSchema(schema, json);
}

export async function readFormData(request: Request): Promise<ParseResult<FormData>> {
  try {
    return { ok: true, data: await request.formData() };
  } catch {
    return { ok: false, response: apiError('validation_failed', INVALID_MESSAGE) };
  }
}

/** Returns the named field if it is a file, otherwise null. */
export function getFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File ? value : null;
}

/**
 * Validates the text fields of a multipart body. Fields named in `fileFields`
 * are skipped here and checked by the route; any other File is rejected.
 */
export function parseFormFields<S extends z.ZodTypeAny>(
  formData: FormData,
  schema: S,
  fileFields: string[]
): ParseResult<z.infer<S>> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (fileFields.includes(key)) continue;
    fields[key] = value;
  }
  return fromSchema(schema, fields);
}
