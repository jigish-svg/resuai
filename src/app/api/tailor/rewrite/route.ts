import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rewriteAchievementBullet } from '@/lib/openai/tailoring-engine';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.tailorRewrite))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { originalText, requirementText, achievementId } = await request.json();
  if (!originalText || !requirementText) {
    return NextResponse.json({ error: 'originalText and requirementText are required' }, { status: 400 });
  }

  try {
    let verifiedFacts: string[] = [];
    let verifiedMetrics: string[] = [];

    if (achievementId) {
      const { data: achievement } = await supabase
        .from('achievements')
        .select('resume_id, skills, metrics')
        .eq('id', achievementId)
        .maybeSingle();

      if (achievement) {
        const { data: owningResume } = await supabase
          .from('resumes')
          .select('id')
          .eq('id', achievement.resume_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (owningResume) {
          verifiedFacts = achievement.skills ?? [];
          verifiedMetrics = achievement.metrics ?? [];
        }
      }
    }

    const result = await rewriteAchievementBullet(originalText, requirementText, verifiedFacts, verifiedMetrics);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Bullet rewrite error:', error);
    const message = error instanceof Error ? error.message : 'Failed to rewrite bullet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
