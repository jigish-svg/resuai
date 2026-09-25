import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { getFile, parseFormFields, readFormData } from '@/lib/api/parse-body';
import { ParseUploadFields } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { extractDocumentText, ParseTimeoutError, UnsupportedFileError } from '@/lib/parsers/extract-text';
import { parseJobDescription, extractRequirements } from '@/lib/openai/jd-parser';
import { assertFileWithinLimit, assertTextWithinLimit, UploadLimitError } from '@/lib/validation/upload-limits';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.jobParse));
  if (limited) return limited;

  const form = await readFormData(request);
  if (!form.ok) return form.response;
  const fields = parseFormFields(form.data, ParseUploadFields, ['file']);
  if (!fields.ok) return fields.response;
  const file = getFile(form.data, 'file');
  const pastedText = fields.data.text;

  let rawText = '';

  try {
    if (file) {
      assertFileWithinLimit(file);
      const buffer = Buffer.from(await file.arrayBuffer());
      rawText = await extractDocumentText(buffer);
    } else if (pastedText) {
      assertTextWithinLimit(pastedText);
      rawText = pastedText;
    } else {
      return apiError('validation_failed', 'Please upload a file or paste the text.');
    }

    if (!rawText.trim() || rawText.trim().length < 50) {
      return apiError('validation_failed', 'Could not extract enough text to parse. Try pasting the job description directly.');
    }
    assertTextWithinLimit(rawText);

    const parsed = await parseJobDescription(rawText);
    const { requirements } = await extractRequirements(parsed);

    return NextResponse.json({ parsed, requirements, rawText });
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return apiError('payload_too_large', error.message);
    }
    if (error instanceof UnsupportedFileError) {
      return apiError('unsupported_media_type', 'Please upload a PDF or Word document.');
    }
    if (error instanceof ParseTimeoutError) {
      return apiError('validation_failed', 'We could not read this file. Try a text-based PDF or paste the text.');
    }
    console.error('Job parse error:', error);
    return apiError('analysis_failed', 'Failed to parse job description. Please try again.');
  }
}
