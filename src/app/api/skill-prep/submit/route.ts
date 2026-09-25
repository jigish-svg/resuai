import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { SubmitQuizBody } from '@/lib/api/schemas/interview';
import { createClient } from '@/lib/supabase/server';
import { QuizQuestion, QuizResultItem } from '@/types/skill-prep';
import { isPaidUser } from '@/lib/plan';

export const runtime = 'nodejs';

const PASS_THRESHOLD = 0.7;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return apiError('forbidden', 'Interview Prep is a paid feature. Upgrade to unlock it.');
  }

  const body = await parseJsonBody(request, SubmitQuizBody);
  if (!body.ok) return body.response;
  const { planId, answers } = body.data;

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

    const questions = plan.quiz_questions as QuizQuestion[];
    if (!questions || questions.length === 0) {
      return apiError('conflict', 'Generate the quiz first.');
    }

    const results: QuizResultItem[] = questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      selected_index: answers[i] ?? -1,
      explanation: q.explanation,
    }));

    const correctCount = results.filter((r) => r.selected_index === r.correct_index).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = correctCount / questions.length >= PASS_THRESHOLD;

    const { data: updated, error } = await supabase
      .from('skill_prep_plans')
      .update({
        status: passed ? 'passed' : 'failed',
        quiz_score: score,
        quiz_attempts: (plan.quiz_attempts ?? 0) + 1,
      })
      .eq('id', planId)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ plan: updated, score, passed, correctCount, total: questions.length, results });
  } catch (error) {
    console.error('Skill quiz submission error:', error);
    return apiError('internal_error', 'Failed to submit quiz. Please try again.');
  }
}
