import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuizQuestion, QuizResultItem } from '@/types/skill-prep';
import { isPaidUser } from '@/lib/plan';

export const runtime = 'nodejs';

const PASS_THRESHOLD = 0.7;

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

  const { planId, answers }: { planId: string; answers: number[] } = await request.json();
  if (!planId || !answers) {
    return NextResponse.json({ error: 'planId and answers are required' }, { status: 400 });
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

    const questions = plan.quiz_questions as QuizQuestion[];
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'This plan has no quiz yet' }, { status: 400 });
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
    const message = error instanceof Error ? error.message : 'Failed to submit quiz';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
