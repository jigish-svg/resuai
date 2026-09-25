import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { StartSkillPrepBody } from '@/lib/api/schemas/interview';
import { createClient } from '@/lib/supabase/server';
import { generateStudyMaterials } from '@/lib/openai/skill-prep';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return apiError('forbidden', 'Interview Prep is a paid feature. Upgrade to unlock it.');
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.skillPrepStart));
  if (limited) return limited;

  const body = await parseJsonBody(request, StartSkillPrepBody);
  if (!body.ok) return body.response;
  const { jobId, skill, whatItInvolves } = body.data;

  try {
    const { data: existing } = await supabase
      .from('skill_prep_plans')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .eq('skill', skill)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ plan: existing });
    }

    const materials = await generateStudyMaterials(skill, whatItInvolves ?? '');

    const { data: inserted, error } = await supabase
      .from('skill_prep_plans')
      .insert({
        user_id: user.id,
        job_id: jobId,
        skill,
        what_it_involves: whatItInvolves ?? '',
        study_materials: materials,
        status: 'studying',
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ plan: inserted });
  } catch (error) {
    console.error('Skill prep start error:', error);
    return apiError('analysis_failed', 'Failed to start skill prep. Please try again.');
  }
}
