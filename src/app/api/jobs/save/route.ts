import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ParsedJobDescription, RequirementCategory, RequirementImportance } from '@/types/job';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';

export const runtime = 'nodejs';

interface SaveJobBody {
  parsed: ParsedJobDescription;
  requirements: { requirement_text: string; category: RequirementCategory; importance: RequirementImportance; is_implied?: boolean }[];
  rawText: string;
  sourceUrl?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: SaveJobBody = await request.json();
  const { parsed, requirements, rawText, sourceUrl } = body;

  if (!parsed || !requirements || !rawText) {
    return NextResponse.json({ error: 'Missing job data' }, { status: 400 });
  }

  try {
    if (!(await isPaidUser(supabase, user.id))) {
      const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count ?? 0) >= FREE_TIER_LIMITS.maxActiveJobs) {
        return NextResponse.json(
          { error: `Free plan is limited to ${FREE_TIER_LIMITS.maxActiveJobs} jobs. Upgrade to add more.`, upgradeRequired: true },
          { status: 403 }
        );
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
    const message = error instanceof Error ? error.message : 'Failed to save job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
