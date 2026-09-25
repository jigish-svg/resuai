import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { TailorSectionsBody } from '@/lib/api/schemas/tailor';
import { createClient } from '@/lib/supabase/server';
import { optimizeResumeForATS } from '@/lib/openai/tailoring-engine';
import { TailoredSection } from '@/types/match';
import { ResumeDocumentExperience } from '@/types/export';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function getContent<T>(sections: TailoredSection[], type: string, fallback: T): T {
  return (sections.find((s) => s.section_type === type)?.content as T) ?? fallback;
}

function setContent(sections: TailoredSection[], type: string, content: unknown): TailoredSection[] {
  const exists = sections.some((s) => s.section_type === type);
  if (exists) {
    return sections.map((s) => (s.section_type === type ? { ...s, content } : s));
  }
  return [...sections, { section_type: type, content, sort_order: sections.length }];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const limited = rateLimitResponse(await checkRateLimit(supabase, RATE_LIMITS.tailorOptimizeAts));
  if (limited) return limited;

  const body = await parseJsonBody(request, TailorSectionsBody);
  if (!body.ok) return body.response;
  const { jobId, sections } = body.data;

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, keywords, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }

    const { data: requirements } = await supabase
      .from('job_requirements')
      .select('requirement_text, importance')
      .eq('job_id', jobId)
      .order('sort_order');

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return apiError('conflict', 'Upload your master resume first.');
    }

    const { data: achievements } = await supabase
      .from('achievements')
      .select('company, job_title, achievement_text, skills, metrics')
      .eq('resume_id', resume.id);

    const summary = getContent<{ text: string }>(sections, 'summary', { text: '' });
    const experienceContent = getContent<{ experiences: ResumeDocumentExperience[] }>(sections, 'experience', { experiences: [] });
    const skillsContent = getContent<{ skills: string[] }>(sections, 'skills', { skills: [] });

    const result = await optimizeResumeForATS(
      summary.text,
      experienceContent.experiences.map((e) => ({ company: e.company, job_title: e.job_title, bullets: e.bullets })),
      skillsContent.skills,
      job.keywords ?? [],
      (requirements ?? []).map((r) => ({ text: r.requirement_text, importance: r.importance })),
      achievements ?? []
    );

    let updatedSections = setContent(sections, 'summary', { text: result.summary });
    updatedSections = setContent(updatedSections, 'skills', { skills: result.skills });
    updatedSections = setContent(updatedSections, 'experience', {
      experiences: experienceContent.experiences.map((e, i) => ({ ...e, bullets: result.experience[i].bullets })),
    });

    return NextResponse.json({
      sections: updatedSections,
      keywords_added: result.keywords_added,
      keywords_still_missing: result.keywords_still_missing,
    });
  } catch (error) {
    console.error('ATS optimization error:', error);
    return apiError('analysis_failed', 'Failed to optimize resume for ATS. Please try again.');
  }
}
