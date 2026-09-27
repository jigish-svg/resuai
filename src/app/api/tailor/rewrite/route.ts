import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { RewriteBulletBody } from '@/lib/api/schemas/tailor';
import { createClient } from '@/lib/supabase/server';
import { rewriteAchievementBullet, runTruthGuard } from '@/lib/openai/tailoring-engine';
import { classifyTruthGuardResult } from '@/lib/openai/truth-guard-gate';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.tailorRewrite));
  if (limited) return limited;

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

    // Non-blocking, early feedback — /api/tailor/save independently re-checks
    // whatever the client eventually submits, regardless of this result.
    const baselineText = [originalText, ...verifiedFacts, ...verifiedMetrics].filter(Boolean).join('\n');
    const truthGuardResult = await runTruthGuard(result.rewritten, baselineText);
    const truthGuardStatus = classifyTruthGuardResult(truthGuardResult);

    return NextResponse.json({ ...result, truthGuard: { status: truthGuardStatus, flags: truthGuardResult.flags } });
  } catch (error) {
    console.error('Bullet rewrite error:', error);
    return apiError('analysis_failed', 'Failed to rewrite bullet. Please try again.');
  }
}
