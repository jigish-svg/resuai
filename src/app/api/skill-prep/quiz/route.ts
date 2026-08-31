import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSkillQuiz } from '@/lib/openai/skill-prep';
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

  if (!(await checkRateLimit(supabase, RATE_LIMITS.skillPrepQuiz))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { planId }: { planId: string } = await request.json();
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }

  try {
    const { data: plan } = await supabase
      .from('skill_prep_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const priorQuestions: string[] = plan.quiz_questions?.map((q: { question: string }) => q.question) ?? [];
    const askedQuestions: string[] = Array.from(new Set([...(plan.asked_questions ?? []), ...priorQuestions]));

    const { questions } = await generateSkillQuiz(plan.skill, plan.what_it_involves, askedQuestions);

    const { data: updated, error } = await supabase
      .from('skill_prep_plans')
      .update({
        quiz_questions: questions,
        asked_questions: askedQuestions,
        status: 'quiz',
      })
      .eq('id', planId)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error('Skill quiz generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate quiz';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
