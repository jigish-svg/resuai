import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rewriteResumeText, RewriteFieldType } from '@/lib/openai/resume-writer';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.resumeRewriteText))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { text, fieldType, jobTitle, company }: { text: string; fieldType: RewriteFieldType; jobTitle?: string; company?: string } =
    await request.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (fieldType !== 'summary' && fieldType !== 'bullet') {
    return NextResponse.json({ error: 'fieldType must be "summary" or "bullet"' }, { status: 400 });
  }

  try {
    const rewritten = await rewriteResumeText(text, fieldType, { jobTitle, company });
    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error('Resume text rewrite error:', error);
    const message = error instanceof Error ? error.message : 'Failed to rewrite text';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
