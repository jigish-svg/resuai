import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractTextFromPDF } from '@/lib/parsers/pdf-extractor';
import { extractTextFromDOCX } from '@/lib/parsers/docx-extractor';
import { parseResume } from '@/lib/openai/resume-parser';
import { assertFileWithinLimit, assertTextWithinLimit, UploadLimitError } from '@/lib/validation/upload-limits';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.resumeParse))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const pastedText = formData.get('text') as string | null;

  let rawText = '';

  try {
    if (file) {
      assertFileWithinLimit(file);
      const buffer = Buffer.from(await file.arrayBuffer());
      if (file.name.toLowerCase().endsWith('.pdf')) {
        rawText = await extractTextFromPDF(buffer);
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        rawText = await extractTextFromDOCX(buffer);
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or DOCX.' }, { status: 400 });
      }
    } else if (pastedText) {
      assertTextWithinLimit(pastedText);
      rawText = pastedText;
    } else {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
    }

    if (!rawText.trim() || rawText.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract enough text to parse. Try pasting the resume text directly.' }, { status: 400 });
    }
    assertTextWithinLimit(rawText);

    const parsed = await parseResume(rawText);

    return NextResponse.json({ parsed, rawText });
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error('Resume parse error:', error);
    const message = error instanceof Error ? error.message : 'Failed to parse resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
