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
  const { jobTitles, currentSkills, resumeId } = body.data;
  if (!jobTitles || jobTitles.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await suggestRoleSkills(jobTitles, currentSkills ?? []);

    // Persistence is additive and opt-in: a caller that doesn't send resumeId
    // gets exactly today's ephemeral behavior. A suggestion is a recommendation,
    // never candidate data — it only ever lands in ai_suggestions, never in
    // achievements/resume_sections.
    if (resumeId && suggestions.length > 0) {
      const { data: resume } = await supabase.from('resumes').select('id').eq('id', resumeId).eq('user_id', user.id).maybeSingle();
      if (resume) {
        const { data: existing } = await supabase
          .from('ai_suggestions')
          .select('content')
          .eq('resume_id', resumeId)
          .eq('suggestion_type', 'skill')
          .in('status', ['pending', 'matched_by_later_fact']);
        const alreadySuggested = new Set(
          (existing ?? []).map((row) => (row.content as { skill?: string })?.skill?.toLowerCase()).filter(Boolean)
        );
        const newRows = suggestions
          .filter((skill) => !alreadySuggested.has(skill.toLowerCase()))
          .map((skill) => ({
            user_id: user.id,
            resume_id: resumeId,
            suggestion_type: 'skill' as const,
            content: { skill },
          }));
        if (newRows.length > 0) {
          const { error: insertError } = await supabase.from('ai_suggestions').insert(newRows);
          if (insertError) console.error('Failed to persist skill suggestions:', insertError);
        }
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Skill suggestion error:', error);
    return apiError('analysis_failed', 'Failed to suggest skills. Please try again.');
  }
}
