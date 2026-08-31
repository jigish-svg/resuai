import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { skill, planId, jobId }: { skill: string; planId?: string; jobId?: string } = await request.json();
  if (!skill || !skill.trim()) {
    return NextResponse.json({ error: 'skill is required' }, { status: 400 });
  }

  try {
    let jobResumeId: string | null = null;
    if (jobId) {
      const { data: job } = await supabase.from('jobs').select('resume_id').eq('id', jobId).eq('user_id', user.id).maybeSingle();
      jobResumeId = job?.resume_id ?? null;
    }
    const resume = await getResumeForJob(supabase, user.id, jobResumeId);
    if (!resume) {
      return NextResponse.json({ error: 'No master resume found — set one up first' }, { status: 400 });
    }

    const { data: skillsSection } = await supabase
      .from('resume_sections')
      .select('id, content')
      .eq('resume_id', resume.id)
      .eq('section_type', 'skills')
      .maybeSingle();

    const currentSkills = (skillsSection?.content as { skills?: string[] } | null)?.skills ?? [];
    if (currentSkills.some((s) => s.toLowerCase() === skill.trim().toLowerCase())) {
      return NextResponse.json({ skills: currentSkills, alreadyPresent: true });
    }

    const updatedSkills = [...currentSkills, skill.trim()];

    if (skillsSection) {
      const { error } = await supabase
        .from('resume_sections')
        .update({ content: { skills: updatedSkills } })
        .eq('id', skillsSection.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('resume_sections')
        .insert({ resume_id: resume.id, section_type: 'skills', content: { skills: updatedSkills }, sort_order: 2 });
      if (error) throw error;
    }

    if (planId) {
      await supabase.from('skill_prep_plans').update({ status: 'added_to_resume' }).eq('id', planId).eq('user_id', user.id);
    }

    return NextResponse.json({ skills: updatedSkills, alreadyPresent: false });
  } catch (error) {
    console.error('Add skill error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
