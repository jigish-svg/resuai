import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCoverLetter } from '@/lib/openai/cover-letter';
import { isPaidUser } from '@/lib/plan';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
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
      { error: 'Cover letter generation is a paid feature. Upgrade to unlock it.', upgradeRequired: true },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.coverLetter))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobId }: { jobId: string } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: requirements } = await supabase
      .from('job_requirements')
      .select('requirement_text, importance')
      .eq('job_id', jobId)
      .order('sort_order');

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return NextResponse.json({ error: 'Upload your master resume before generating a cover letter' }, { status: 400 });
    }

    const { data: achievements } = await supabase
      .from('achievements')
      .select('company, job_title, achievement_text, skills, metrics')
      .eq('resume_id', resume.id);

    const letter = await generateCoverLetter(
      resume.candidate_name || 'Candidate',
      job.title,
      job.company,
      requirements ?? [],
      achievements ?? []
    );

    const { data: existing } = await supabase
      .from('cover_letters')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    let coverLetter;
    if (existing) {
      const { data, error } = await supabase
        .from('cover_letters')
        .update({ content: letter })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      coverLetter = data;
    } else {
      const { data, error } = await supabase
        .from('cover_letters')
        .insert({ user_id: user.id, job_id: jobId, content: letter })
        .select('*')
        .single();
      if (error) throw error;
      coverLetter = data;
    }

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error('Cover letter error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate cover letter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId, content }: { jobId: string; content: string } = await request.json();
  if (!jobId || content === undefined) {
    return NextResponse.json({ error: 'jobId and content are required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('cover_letters')
      .update({ content })
      .eq('job_id', jobId)
      .eq('user_id', user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cover letter update error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save cover letter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
