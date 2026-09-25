import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
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

    const { data: defaultResume } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_master', true)
      .maybeSingle();

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        title: parsed.job_title,
        company: parsed.company,
        location: parsed.location,
        job_type: parsed.job_type,
        seniority: parsed.seniority,
        raw_text: rawText,
        source_url: sourceUrl,
        keywords: parsed.keywords,
        status: 'saved',
        resume_id: defaultResume?.id ?? null,
      })
      .select('id')
      .single();
    if (jobError) throw jobError;

    const requirementRows = requirements.map((r, i) => ({
      job_id: job.id,
      requirement_text: r.requirement_text,
      category: r.category,
      importance: r.importance,
      is_implied: r.is_implied ?? false,
      sort_order: i,
    }));
    const { error: reqError } = await supabase.from('job_requirements').insert(requirementRows);
    if (reqError) throw reqError;

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error('Job save error:', error);
    return apiError('internal_error', 'Failed to save job. Please try again.');
  }
}
