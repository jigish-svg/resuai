import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { rpcError } from '@/lib/api/rpc-error';
import { SaveJobBody } from '@/lib/api/schemas/jobs';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, SaveJobBody);
  if (!body.ok) return body.response;
  const { parsed, requirements, rawText, sourceUrl } = body.data;

  try {
    if (!(await isPaidUser(supabase, user.id))) {
      const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count ?? 0) >= FREE_TIER_LIMITS.maxActiveJobs) {
        return apiError('forbidden', `Free plan is limited to ${FREE_TIER_LIMITS.maxActiveJobs} jobs. Upgrade to add more.`);
      }
    }

    const { data: jobId, error } = await supabase.rpc('save_job', {
      p_job: {
        title: parsed.job_title,
        company: parsed.company ?? null,
        location: parsed.location ?? null,
        job_type: parsed.job_type ?? null,
        seniority: parsed.seniority ?? null,
        raw_text: rawText,
        source_url: sourceUrl ?? null,
        keywords: parsed.keywords,
      },
      // Array order becomes sort_order.
      p_requirements: requirements.map((r) => ({
        requirement_text: r.requirement_text,
        category: r.category,
        importance: r.importance,
        is_implied: r.is_implied ?? false,
      })),
    });
    if (error) return rpcError(error, { notFound: 'Job not found.', fallback: 'Failed to save job. Please try again.' });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Job save error:', error);
    return apiError('internal_error', 'Failed to save job. Please try again.');
  }
}
