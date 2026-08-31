import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStudyMaterials } from '@/lib/openai/skill-prep';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return NextResponse.json(
      { error: 'Interview Prep is a paid feature. Upgrade to unlock it.', upgradeRequired: true },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.skillPrepStart))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobId, skill, whatItInvolves }: { jobId: string; skill: string; whatItInvolves: string } = await request.json();
  if (!jobId || !skill) {
    return NextResponse.json({ error: 'jobId and skill are required' }, { status: 400 });
  }

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
    const message = error instanceof Error ? error.message : 'Failed to start skill prep';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
