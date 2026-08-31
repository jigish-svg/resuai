import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTailoringPlan } from '@/lib/openai/tailoring-engine';
import { TailoredSection } from '@/types/match';
import { ResumeDocumentExperience } from '@/types/export';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function getContent<T>(sections: TailoredSection[], type: string, fallback: T): T {
  return (sections.find((s) => s.section_type === type)?.content as T) ?? fallback;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return NextResponse.json(
      { error: 'JD-Specific Tailoring is a paid feature. Upgrade to unlock it.', upgradeRequired: true },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.tailorPlan))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobId, sections }: { jobId: string; sections: TailoredSection[] } = await request.json();
  if (!jobId || !sections) {
    return NextResponse.json({ error: 'jobId and sections are required' }, { status: 400 });
  }

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, keywords, resume_id')
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
      return NextResponse.json({ error: 'No master resume found' }, { status: 400 });
    }

    const { data: achievements } = await supabase
      .from('achievements')
      .select('company, job_title, achievement_text, skills, metrics')
      .eq('resume_id', resume.id);

    const summary = getContent<{ text: string }>(sections, 'summary', { text: '' });
    const experienceContent = getContent<{ experiences: ResumeDocumentExperience[] }>(sections, 'experience', { experiences: [] });
    const skillsContent = getContent<{ skills: string[] }>(sections, 'skills', { skills: [] });

    const plan = await generateTailoringPlan(
      job.title,
      job.company,
      summary.text,
      experienceContent.experiences.map((e) => ({ company: e.company, job_title: e.job_title, bullets: e.bullets })),
      skillsContent.skills,
      job.keywords ?? [],
      (requirements ?? []).map((r) => ({ text: r.requirement_text, importance: r.importance })),
      achievements ?? []
    );

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Tailoring plan error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate tailoring plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
