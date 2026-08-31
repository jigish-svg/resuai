import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suggestRoleSkills } from '@/lib/openai/skill-suggestions';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.suggestSkills))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobTitles, currentSkills }: { jobTitles: string[]; currentSkills: string[] } = await request.json();
  if (!jobTitles || jobTitles.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await suggestRoleSkills(jobTitles, currentSkills ?? []);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Skill suggestion error:', error);
    const message = error instanceof Error ? error.message : 'Failed to suggest skills';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
