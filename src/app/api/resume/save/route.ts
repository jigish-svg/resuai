import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { SaveResumeBody } from '@/lib/api/schemas/resume';
import { createClient } from '@/lib/supabase/server';
import { getEmbedding } from '@/lib/openai/evidence-matcher';
import { isPaidUser, FREE_TIER_LIMITS } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.resumeSave))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, SaveResumeBody);
  if (!body.ok) return body.response;
  const { parsed, rawText, name, resumeId: requestedResumeId, template } = body.data;

  try {
    let resumeId: string;

    if (requestedResumeId) {
      // Updating a specific existing resume profile the user already owns
      const { data: existing } = await supabase
        .from('resumes')
        .select('id, name, version, template')
        .eq('id', requestedResumeId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!existing) {
        return apiError('not_found', 'Resume not found.');
      }

      resumeId = existing.id;
      const { error: updateError } = await supabase
        .from('resumes')
        .update({
          name: name || existing.name,
          raw_text: rawText,
          version: existing.version + 1,
          template: template || existing.template,
          candidate_name: parsed.candidate.name,
          candidate_email: parsed.candidate.email,
          candidate_phone: parsed.candidate.phone,
          candidate_location: parsed.candidate.location,
          candidate_linkedin: parsed.candidate.linkedin,
          candidate_website: parsed.candidate.website,
        })
        .eq('id', resumeId);
      if (updateError) throw updateError;

      // Clear previous derived data — it will be fully rebuilt below
      await supabase.from('resume_sections').delete().eq('resume_id', resumeId);
      await supabase.from('achievements').delete().eq('resume_id', resumeId);
    } else {
      // Creating a new resume profile
      const { count } = await supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const existingCount = count ?? 0;

      if (existingCount > 0 && !(await isPaidUser(supabase, user.id))) {
        return apiError('forbidden', `Free plan is limited to ${FREE_TIER_LIMITS.maxResumeProfiles} resume profile. Upgrade to create more.`);
      }

      const defaultName = parsed.experience[0]?.job_title ? `${parsed.experience[0].job_title} Resume` : 'Resume';

      const { data: inserted, error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          name: name || defaultName,
          raw_text: rawText,
          is_master: existingCount === 0, // first resume becomes the default automatically
          version: 1,
          template: template || 'classic',
          candidate_name: parsed.candidate.name,
          candidate_email: parsed.candidate.email,
          candidate_phone: parsed.candidate.phone,
          candidate_location: parsed.candidate.location,
          candidate_linkedin: parsed.candidate.linkedin,
          candidate_website: parsed.candidate.website,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      resumeId = inserted.id;
    }

    // Resume sections (display structure for the editor)
    const sections = [
      { resume_id: resumeId, section_type: 'summary', content: { text: parsed.summary ?? '' }, sort_order: 0 },
      {
        resume_id: resumeId,
        section_type: 'experience',
        content: {
          experiences: parsed.experience.map((exp) => ({
            company: exp.company,
            job_title: exp.job_title,
            start_date: exp.start_date,
            end_date: exp.end_date,
            is_current: exp.is_current,
            location: exp.location,
            bullets: exp.achievements.map((a) => a.text),
          })),
        },
        sort_order: 1,
      },
      { resume_id: resumeId, section_type: 'skills', content: { skills: parsed.skills }, sort_order: 2 },
      { resume_id: resumeId, section_type: 'education', content: { items: parsed.education }, sort_order: 3 },
      { resume_id: resumeId, section_type: 'certifications', content: { items: parsed.certifications }, sort_order: 4 },
    ];
    const { error: sectionsError } = await supabase.from('resume_sections').insert(sections);
    if (sectionsError) throw sectionsError;

    // Flatten achievements into the Evidence Library, with embeddings for semantic search
    const flatAchievements = parsed.experience.flatMap((exp) =>
      exp.achievements.map((a) => ({
        company: exp.company,
        job_title: exp.job_title,
        dates: exp.is_current ? `${exp.start_date} - Present` : `${exp.start_date} - ${exp.end_date ?? ''}`,
        achievement_text: a.text,
        skills: a.skills,
        metrics: a.metrics,
      }))
    );

    if (flatAchievements.length > 0) {
      const embeddings = await Promise.all(
        flatAchievements.map((a) => getEmbedding(`${a.job_title} at ${a.company}: ${a.achievement_text}`).catch(() => null))
      );

      const achievementRows = flatAchievements.map((a, i) => ({
        resume_id: resumeId,
        company: a.company,
        job_title: a.job_title,
        achievement_text: a.achievement_text,
        skills: a.skills,
        metrics: a.metrics,
        dates: a.dates,
        source: 'ai_parsed' as const,
        confidence: 1,
        embedding: embeddings[i],
      }));

      const { error: achievementsError } = await supabase.from('achievements').insert(achievementRows);
      if (achievementsError) throw achievementsError;
    }

    return NextResponse.json({ resumeId });
  } catch (error) {
    console.error('Resume save error:', error);
    return apiError('internal_error', 'Failed to save resume. Please try again.');
  }
}
