import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchRequirementsToAchievements } from '@/lib/openai/evidence-matcher';
import { calculateMatchScore } from '@/lib/openai/match-scorer';
import { runATSCheck } from '@/lib/openai/ats-checker';
import { MatchStatus, MatchConfidence } from '@/types/match';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.match))) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { jobId } = await request.json();
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { data: requirements, error: reqError } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_id', jobId)
      .order('sort_order');
    if (reqError) throw reqError;
    if (!requirements || requirements.length === 0) {
      return NextResponse.json({ error: 'This job has no extracted requirements' }, { status: 400 });
    }

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    if (!resume) {
      return NextResponse.json({ error: 'Upload your master resume before running a match' }, { status: 400 });
    }

    const { data: achievements, error: achError } = await supabase
      .from('achievements')
      .select('id, company, job_title, achievement_text, skills, metrics')
      .eq('resume_id', resume.id);
    if (achError) throw achError;
    if (!achievements || achievements.length === 0) {
      return NextResponse.json({ error: 'Your master resume has no extracted achievements' }, { status: 400 });
    }

    const { data: resumeSections } = await supabase
      .from('resume_sections')
      .select('section_type, content')
      .eq('resume_id', resume.id);

    // Evidence matching (AI)
    const { matches: aiMatches } = await matchRequirementsToAchievements(
      requirements.map((r) => ({ id: r.id, requirement_text: r.requirement_text, category: r.category, importance: r.importance })),
      achievements,
      resume.candidate_name || 'Candidate'
    );

    const achievementById = new Map(achievements.map((a) => [a.id, a]));
    const aiMatchByRequirement = new Map(aiMatches.map((m) => [m.requirement_id, m]));

    const scoredItems = requirements.map((requirement) => {
      const aiMatch = aiMatchByRequirement.get(requirement.id);
      const status: MatchStatus = aiMatch?.status ?? 'no_evidence';
      const confidence: MatchConfidence = aiMatch?.confidence ?? 'low';
      const achievement = aiMatch?.achievement_id ? achievementById.get(aiMatch.achievement_id) : undefined;

      return {
        requirement,
        item: {
          requirement_id: requirement.id,
          achievement_id: achievement?.id,
          status,
          confidence,
          evidence_text: aiMatch?.evidence_text,
          explanation: aiMatch?.explanation ?? 'No matching evidence was found in the master resume.',
        },
      };
    });

    // Deterministic ATS check
    const atsResult = runATSCheck({
      candidateName: resume.candidate_name || '',
      contactInfo: {
        email: resume.candidate_email ?? undefined,
        phone: resume.candidate_phone ?? undefined,
        linkedin: resume.candidate_linkedin ?? undefined,
      },
      sections: (resumeSections ?? []).map((s) => ({ type: s.section_type, content: JSON.stringify(s.content) })),
      targetKeywords: job.keywords ?? [],
      text: resume.raw_text ?? '',
    });

    const scores = calculateMatchScore(
      scoredItems.map(({ item, requirement }) => ({ item: { ...item, id: '', match_id: '' }, requirement })),
      atsResult.score
    );

    // Persist match + match items (replace any previous match for this job)
    await supabase.from('matches').delete().eq('job_id', jobId).eq('user_id', user.id);

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        user_id: user.id,
        job_id: jobId,
        resume_id: resume.id,
        overall_score: scores.overall,
        skill_score: scores.skill_score,
        responsibility_score: scores.responsibility_score,
        experience_score: scores.experience_score,
        education_score: scores.education_score,
        semantic_score: scores.semantic_score,
        ats_score: scores.ats_score,
      })
      .select('id')
      .single();
    if (matchError) throw matchError;

    const matchItemRows = scoredItems.map(({ item }) => ({
      match_id: match.id,
      requirement_id: item.requirement_id,
      achievement_id: item.achievement_id,
      status: item.status,
      confidence: item.confidence,
      evidence_text: item.evidence_text,
      explanation: item.explanation,
    }));
    const { error: itemsError } = await supabase.from('match_items').insert(matchItemRows);
    if (itemsError) throw itemsError;

    await supabase.from('jobs').update({ status: job.status === 'saved' ? 'tailoring' : job.status }).eq('id', jobId);

    return NextResponse.json({ matchId: match.id, scores, atsResult });
  } catch (error) {
    console.error('Match error:', error);
    const message = error instanceof Error ? error.message : 'Failed to run match analysis';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
