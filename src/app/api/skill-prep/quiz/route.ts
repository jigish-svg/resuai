import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { PlanIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { generateSkillQuiz } from '@/lib/openai/skill-prep';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

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

  if (!(await checkRateLimit(supabase, RATE_LIMITS.skillPrepQuiz))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, PlanIdBody);
  if (!body.ok) return body.response;
  const { planId } = body.data;

  try {
    const { data: plan } = await supabase
      .from('skill_prep_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single();
    if (!plan) {
      return apiError('not_found', 'Plan not found.');
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
    return apiError('analysis_failed', 'Failed to generate quiz. Please try again.');
  }
}
