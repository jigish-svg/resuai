import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { SuggestSkillsBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { suggestRoleSkills } from '@/lib/openai/skill-suggestions';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.suggestSkills));
  if (limited) return limited;

  const body = await parseJsonBody(request, SuggestSkillsBody);
  if (!body.ok) return body.response;
  const { jobTitles, currentSkills } = body.data;
  if (!jobTitles || jobTitles.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await suggestRoleSkills(jobTitles, currentSkills ?? []);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Skill suggestion error:', error);
    return apiError('analysis_failed', 'Failed to suggest skills. Please try again.');
  }
}
