import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { RewriteBulletBody } from '@/lib/api/schemas/tailor';
import { createClient } from '@/lib/supabase/server';
import { rewriteAchievementBullet } from '@/lib/openai/tailoring-engine';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.tailorRewrite))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, RewriteBulletBody);
  if (!body.ok) return body.response;
  const { originalText, requirementText, achievementId } = body.data;

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
    return apiError('analysis_failed', 'Failed to rewrite bullet. Please try again.');
  }
}
