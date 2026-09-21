import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Pencil, ListChecks, MessageCircleQuestion, Target, Mail, Lock, Mic } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ScoreRing from '@/components/match/ScoreRing';
import RunMatchButton from '@/components/match/RunMatchButton';
import ReadinessJourney, { MOCK_INTERVIEW_UNLOCK_SCORE } from '@/components/match/ReadinessJourney';
import { getScoreColor } from '@/lib/utils';
import { MatchItemWithDetails, ATSCheckResult } from '@/types/match';
import { runATSCheck } from '@/lib/openai/ats-checker';
import { isPaidUser } from '@/lib/plan';
import { getResumeForJob } from '@/lib/resume/get-resume-for-job';

export default async function MatchPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).eq('user_id', user!.id).single();
  if (!job) notFound();

  const paid = await isPaidUser(supabase, user!.id);

  const { data: match } = await supabase.from('matches').select('*').eq('job_id', jobId).eq('user_id', user!.id).maybeSingle();

  let items: MatchItemWithDetails[] = [];
  if (match) {
    const { data: rawItems } = await supabase
      .from('match_items')
      .select(`
        id, match_id, requirement_id, achievement_id, status, confidence, evidence_text, explanation,
        requirement:job_requirements(requirement_text, category, importance),
        achievement:achievements(achievement_text, company, job_title)
      `)
      .eq('match_id', match.id);
    items = (rawItems ?? []) as unknown as MatchItemWithDetails[];
  }

  let atsResult: ATSCheckResult | null = null;
  const resume = await getResumeForJob(supabase, user!.id, job.resume_id);
  if (resume) {
    const { data: resumeSections } = await supabase
      .from('resume_sections')
      .select('section_type, content')
      .eq('resume_id', resume.id);

    atsResult = runATSCheck({
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
  }

  const { data: latestMockSession } = await supabase
    .from('mock_interview_sessions')
    .select('overall_feedback')
    .eq('job_id', jobId)
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const mockInterviewScore = (latestMockSession?.overall_feedback as { readiness_score?: number } | null)?.readiness_score ?? null;
  const finalScore = match && mockInterviewScore !== null
    ? Math.round(match.overall_score * 0.6 + mockInterviewScore * 0.4)
    : null;

  const mockInterviewUnlocked = paid && (match?.overall_score ?? 0) >= MOCK_INTERVIEW_UNLOCK_SCORE;

  const importanceRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortByImportance = (a: MatchItemWithDetails, b: MatchItemWithDetails) =>
    (importanceRank[a.requirement.importance] ?? 9) - (importanceRank[b.requirement.importance] ?? 9);

  const strongMatches = items.filter((i) => i.status === 'matched').sort(sortByImportance);
  const partialMatches = items.filter((i) => i.status === 'partial').sort(sortByImportance);
  const missingItems = items.filter((i) => i.status === 'no_evidence').sort(sortByImportance);

  const breakdown = match
    ? [
        { label: 'Hard Skills', weight: '35%', score: match.skill_score },
        { label: 'Responsibilities', weight: '25%', score: match.responsibility_score },
        { label: 'Experience', weight: '15%', score: match.experience_score },
        { label: 'Education & Certs', weight: '10%', score: match.education_score },
        { label: 'Semantic Fit', weight: '5%', score: match.semantic_score },
        { label: 'ATS Quality', weight: '5%', score: match.ats_score },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <p className="text-sm text-gray-500 mb-1">{job.company || 'Job'}</p>
          <h1 className="text-3xl font-bold">{job.title}</h1>
        </div>
      </div>

      {atsResult && (
        <ReadinessJourney preliminaryScore={atsResult.score} matchScore={match?.overall_score ?? null} finalScore={finalScore} />
      )}

      {!match ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] text-center relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <p className="text-gray-700 mb-6 max-w-md mx-auto relative">
            Run an evidence-based match analysis to see exactly how your master resume stacks up against this job.
          </p>
          <div className="relative flex justify-center">
            <RunMatchButton jobId={jobId} />
          </div>
        </div>
      ) : (
        <>
          <div className="animate-fade-up glass rounded-2xl p-8 border border-black/[0.06] flex flex-col md:flex-row items-center gap-10 relative overflow-hidden" style={{ animationDelay: '0.06s' }}>
            <div className="relative">
              <ScoreRing score={match.overall_score} size={160} />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 w-full relative">
              {breakdown.map((b) => (
                <div key={b.label} className="bg-black/[0.02] hover:bg-black/[0.03] transition-colors rounded-xl p-3 border border-black/[0.04]">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">{b.label}</span>
                    <span className={getScoreColor(b.score)}>{b.score}%</span>
                  </div>
                  <div className="h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-primary transition-all duration-700"
                      style={{ width: `${b.score}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{b.weight} of overall score</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <RunMatchButton jobId={jobId} label="Re-run analysis" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <EvidenceColumn
              title="Strong Matches"
              icon={<CheckCircle2 className="w-4 h-4" />}
              color="text-success"
              accent="from-success to-emerald-600"
              items={strongMatches}
              delay={0.12}
            />
            <EvidenceColumn
              title="Partial Matches"
              icon={<AlertTriangle className="w-4 h-4" />}
              color="text-amber-600"
              accent="from-brand-secondary to-amber-500"
              items={partialMatches}
              delay={0.18}
            />
            <EvidenceColumn
              title="Missing Evidence"
              icon={<XCircle className="w-4 h-4" />}
              color="text-red-600"
              accent="from-red-500 to-red-500"
              items={missingItems}
              delay={0.24}
            />
          </div>

          {atsResult && (
            <div className="animate-fade-up glass rounded-2xl p-5 border border-black/[0.06]" style={{ animationDelay: '0.3s' }}>
              <h3 className="flex items-center gap-2 font-semibold mb-4 text-sky-600">
                <ListChecks className="w-4 h-4" /> ATS Checklist ({atsResult.score}%)
              </h3>
              <div className="grid md:grid-cols-2 gap-2">
                {atsResult.checks.map((check, i) => (
                  <div key={i} className={`flex items-start gap-2 text-sm rounded-lg p-2 -mx-2 ${check.passed ? '' : 'bg-orange-500/[0.06]'}`}>
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-gray-700">{check.label}</p>
                      {check.message && <p className="text-xs text-gray-400">{check.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="animate-fade-up space-y-4" style={{ animationDelay: '0.36s' }}>
            <h2 className="font-semibold text-gray-800">What do you want to do next?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FeatureCard
                href={paid ? `/jd-tailoring/${jobId}` : '/account/upgrade'}
                icon={paid ? <Target className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                title="JD-Specific Tailoring"
                highlight={paid}
                locked={!paid}
                points={[
                  'Proposes specific, approve-or-reject changes for this job',
                  "Rewords bullets to match the JD's exact terminology — only where you already have the evidence",
                  paid ? 'Trims your skills list to just what this job actually cares about' : 'Paid feature — upgrade to unlock',
                ]}
              />
              <FeatureCard
                href={`/tailor/${jobId}`}
                icon={<Pencil className="w-5 h-5" />}
                title="Tailor Resume"
                points={[
                  'Full manual editor for this job\'s resume version',
                  'Rewrite any bullet on demand, edit every section freely',
                  'One-click "Optimize for ATS," then export to PDF or DOCX',
                ]}
              />
              <FeatureCard
                href={paid ? `/interview-prep/${jobId}` : '/account/upgrade'}
                icon={paid ? <MessageCircleQuestion className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                title="Interview Prep"
                locked={!paid}
                points={[
                  "Likely interview questions built from this job's requirements",
                  'A full study plan + 10-question quiz for any skill gaps before you claim them',
                  paid ? 'Smart questions to ask the interviewer' : 'Paid feature — upgrade to unlock',
                ]}
              />
              <FeatureCard
                href={paid ? `/cover-letter/${jobId}` : '/account/upgrade'}
                icon={paid ? <Mail className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                title="Cover Letter"
                locked={!paid}
                points={[
                  'AI-written, evidence-based cover letter for this exact job',
                  'Built around your 2-3 strongest, most relevant real achievements',
                  paid ? 'Editable, with DOCX export' : 'Paid feature — upgrade to unlock',
                ]}
              />
              <FeatureCard
                href={mockInterviewUnlocked ? `/mock-interview/${jobId}` : paid ? `/match/${jobId}` : '/account/upgrade'}
                icon={mockInterviewUnlocked ? <Mic className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                title="Mock Interview"
                locked={!mockInterviewUnlocked}
                points={[
                  'A live, real-time voice interview grounded in this job and your evidence',
                  !paid
                    ? 'Paid feature — upgrade to unlock'
                    : mockInterviewUnlocked
                    ? 'Ends in an AI-generated readiness report'
                    : `Reach ${MOCK_INTERVIEW_UNLOCK_SCORE}% match score to unlock (currently ${match?.overall_score ?? 0}%)`,
                ]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EvidenceColumn({
  title,
  icon,
  color,
  accent,
  items,
  delay,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
  items: MatchItemWithDetails[];
  delay: number;
}) {
  return (
    <div className="animate-fade-up glass rounded-2xl p-5 border border-black/[0.06] relative overflow-hidden" style={{ animationDelay: `${delay}s` }}>
      <span className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent} opacity-60`} />
      <h3 className={`flex items-center gap-2 font-semibold mb-4 ${color}`}>
        {icon} {title} ({items.length})
      </h3>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-gray-400">Nothing here.</p>}
        {items.map((item) => (
          <div key={item.id} className="bg-black/[0.02] border border-black/[0.06] hover:border-black/[0.1] hover:bg-black/[0.02] transition-colors rounded-xl p-3">
            <p className="text-sm font-medium mb-1">{item.requirement.requirement_text}</p>
            <span className="inline-block text-[10px] uppercase tracking-wide text-gray-500 bg-black/[0.03] px-1.5 py-0.5 rounded-md">
              {item.requirement.importance}
            </span>
            {item.achievement && (
              <p className="text-xs text-gray-500 mt-2 border-l-2 border-black/10 pl-2">
                &ldquo;{item.achievement.achievement_text}&rdquo;
                <span className="block text-gray-400 mt-0.5">
                  — {item.achievement.job_title}, {item.achievement.company}
                </span>
              </p>
            )}
            {!item.achievement && item.explanation && (
              <p className="text-xs text-gray-400 mt-2">{item.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  points,
  highlight,
  locked,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  points: string[];
  highlight?: boolean;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl p-5 border transition-all card-hover hover:shadow-xl hover:shadow-black/10 ${
        locked
          ? 'bg-black/[0.02] border-dashed border-black/[0.12]'
          : highlight
          ? 'bg-brand-primary/10 border-brand-primary/25'
          : 'glass border-black/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            locked ? 'bg-brand-secondary/20 text-amber-700' : highlight ? 'bg-brand-primary text-white' : 'bg-black/[0.04] text-brand-primary'
          }`}
        >
          {icon}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
        {title}
        {locked && <span className="text-[10px] uppercase tracking-wide bg-brand-secondary-light text-amber-700 px-1.5 py-0.5 rounded-md font-medium">Paid</span>}
      </h3>
      <ul className="space-y-1.5">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500 leading-relaxed">
            <span className="text-brand-primary mt-0.5">•</span>
            {point}
          </li>
        ))}
      </ul>
    </Link>
  );
}
