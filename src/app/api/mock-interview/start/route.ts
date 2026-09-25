import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { JobIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewPrep } from '@/lib/openai/interview-prep';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';
import { isPaidUser } from '@/lib/plan';
import { checkRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { InterviewQuestion } from '@/types/interview';
import { MockInterviewSessionQuestion } from '@/types/mock-interview';

export const runtime = 'nodejs';

const QUESTIONS_PER_SESSION = 5;
const REALTIME_MODEL = 'gpt-realtime';

function pickSessionQuestions(questions: InterviewQuestion[]): MockInterviewSessionQuestion[] {
  const gaps = questions.filter((q) => q.is_gap);
  const rest = questions.filter((q) => !q.is_gap);
  const picked = [...gaps, ...rest].slice(0, QUESTIONS_PER_SESSION);
  return picked.map((q) => ({ question: q.question, category: q.category, is_gap: q.is_gap }));
}

function buildInstructions(candidateName: string, jobTitle: string, company: string | null, questions: MockInterviewSessionQuestion[]): string {
  const questionList = questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n');
  return `You are a warm, professional interviewer conducting a live mock interview with ${candidateName} for a ${jobTitle}${company ? ` role at ${company}` : ' role'}.

Start by greeting them briefly and warmly, then ask the questions below ONE AT A TIME, in order. Don't read them robotically — phrase each one naturally, as a real interviewer would say it out loud.

QUESTIONS TO ASK, IN ORDER:
${questionList}

Behavior rules:
- After each answer, react briefly and naturally (a short acknowledgment or a one-line natural follow-up thought) before moving to the next question. Keep your responses conversational and not too long.
- Do NOT give the candidate a score, a critique, or a list of feedback during the conversation — this is a live practice run, not a review. Detailed feedback is generated separately after the call ends.
- After the final question's answer, thank them warmly for their time, let them know their full feedback and readiness score will be ready for them right after the call, and wrap up naturally.
- Stay in character as the interviewer the whole time. Keep the tone encouraging and professional, like a real early-stage interview.`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  if (!(await isPaidUser(supabase, user.id))) {
    return apiError('forbidden', 'Mock Interview Practice is a paid feature. Upgrade to unlock it.');
  }

  if (!(await checkRateLimit(supabase, RATE_LIMITS.mockInterviewStart))) {
    return apiError('rate_limited', RATE_LIMIT_MESSAGE);
  }

  const body = await parseJsonBody(request, JobIdBody);
  if (!body.ok) return body.response;
  const { jobId } = body.data;

  try {
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, company, resume_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    if (!job) {
      return apiError('not_found', 'Job not found.');
    }

    let { data: prep } = await supabase
      .from('interview_prep')
      .select('id, questions')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!prep || !prep.questions || (prep.questions as InterviewQuestion[]).length === 0) {
      const { data: requirements } = await supabase
        .from('job_requirements')
        .select('id, requirement_text, category, importance')
        .eq('job_id', jobId)
        .order('sort_order');
      if (!requirements || requirements.length === 0) {
        return apiError('conflict', 'This job has no requirements yet. Re-add the job description and try again.');
      }

      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .maybeSingle();

      let matchItemsForPrep: { requirement_text: string; status: 'matched' | 'partial' | 'no_evidence'; evidence_text?: string }[] = [];
      if (match) {
        const { data: matchItems } = await supabase
          .from('match_items')
          .select('status, evidence_text, requirement:job_requirements(requirement_text)')
          .eq('match_id', match.id);
        matchItemsForPrep = (matchItems ?? []).map((m) => ({
          requirement_text: (m.requirement as unknown as { requirement_text: string })?.requirement_text ?? '',
          status: m.status,
          evidence_text: m.evidence_text ?? undefined,
        }));
      }

      const resumeForPrep = await getResumeForJob(supabase, user.id, job.resume_id);
      if (!resumeForPrep) {
        return apiError('conflict', 'Upload your master resume before practising interviews.');
      }

      const { data: achievements } = await supabase
        .from('achievements')
        .select('company, job_title, achievement_text, skills, metrics')
        .eq('resume_id', resumeForPrep.id);

      const result = await generateInterviewPrep(
        job.title,
        job.company,
        requirements,
        matchItemsForPrep,
        achievements ?? [],
        resumeForPrep.candidate_name || 'Candidate'
      );

      if (prep) {
        const { data: updated, error } = await supabase
          .from('interview_prep')
          .update({
            match_id: match?.id,
            questions: result.questions,
            questions_to_ask: result.questions_to_ask,
            skill_gaps: result.skill_gaps,
          })
          .eq('id', prep.id)
          .select('id, questions')
          .single();
        if (error) throw error;
        prep = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('interview_prep')
          .insert({
            user_id: user.id,
            job_id: jobId,
            match_id: match?.id,
            questions: result.questions,
            questions_to_ask: result.questions_to_ask,
            skill_gaps: result.skill_gaps,
          })
          .select('id, questions')
          .single();
        if (error) throw error;
        prep = inserted;
      }
    }

    const sessionQuestions = pickSessionQuestions(prep.questions as InterviewQuestion[]);
    if (sessionQuestions.length === 0) {
      return apiError('conflict', 'Generate interview prep for this job first.');
    }

    const resume = await getResumeForJob(supabase, user.id, job.resume_id);
    const candidateName = resume?.candidate_name || 'the candidate';

    const instructions = buildInstructions(candidateName, job.title, job.company, sessionQuestions);

    const clientSecretResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': user.id,
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          instructions,
          audio: {
            output: { voice: 'alloy' },
            input: {
              turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 700, create_response: true },
              transcription: { model: 'whisper-1' },
            },
          },
        },
      }),
    });

    if (!clientSecretResponse.ok) {
      const detail = await clientSecretResponse.text();
      console.error('Realtime client secret error:', detail);
      return apiError('analysis_failed', 'Failed to start the live interview session. Please try again.');
    }

    const clientSecretData: { value: string } = await clientSecretResponse.json();

    const { data: session, error } = await supabase
      .from('mock_interview_sessions')
      .insert({
        user_id: user.id,
        job_id: jobId,
        interview_prep_id: prep.id,
        questions: sessionQuestions,
      })
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({
      sessionId: session.id,
      ephemeralKey: clientSecretData.value,
      questions: sessionQuestions,
    });
  } catch (error) {
    console.error('Mock interview start error:', error);
    return apiError('analysis_failed', 'Failed to start mock interview. Please try again.');
  }
}
