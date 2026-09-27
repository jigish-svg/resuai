import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Pencil, MessageCircleQuestion, Target, Mail, Lock, Mic } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import RunMatchButton from '@/components/match/RunMatchButton';
import { MatchItemWithDetails } from '@/types/match';
import { isPaidUser } from '@/lib/plan';
import { computeFitScore } from '@/lib/score/fit-score';
import { SCORE_CONFIG_V1 } from '@/lib/score/config';
import { fromLegacyMatch } from '@/lib/score/legacy-adapter';

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
        requirement:job_requirements(requirement_text, category, importance, is_implied),
        achievement:achievements(achievement_text, company, job_title)
      `)
      .eq('match_id', match.id);
    items = (rawItems ?? []) as unknown as MatchItemWithDetails[];
  }

  const importanceRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortByImportance = (a: MatchItemWithDetails, b: MatchItemWithDetails) =>
    (importanceRank[a.requirement.importance] ?? 9) - (importanceRank[b.requirement.importance] ?? 9);

  const strongMatches = items.filter((i) => i.status === 'matched').sort(sortByImportance);
  const partialMatches = items.filter((i) => i.status === 'partial').sort(sortByImportance);
  const missingItems = items.filter((i) => i.status === 'no_evidence').sort(sortByImportance);

  const isCurrentScore = match?.score_config_version != null;

  const fit = match && isCurrentScore
    ? computeFitScore(
        items.map((i) =>
          fromLegacyMatch(
            { id: i.requirement_id, category: i.requirement.category, importance: i.requirement.importance, is_implied: i.requirement.is_implied },
            i
          )
        ),
        SCORE_CONFIG_V1
      )
    : null;

  const breakdown = (fit?.dimensions ?? []).map((d) => ({
    label: d.name,
    weight: `${Math.round(d.effectiveWeight * 100)}%`,
    score: Math.round(d.score * 100),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-1">{job.company || 'Unknown Company'}</p>
          <h1 className="text-2xl font-bold text-ink">{job.title}</h1>
        </div>
      </div>

      {!match ? (
        <div className="border border-ink/10 bg-white rounded p-16 text-center">
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            Run an evidence-based match analysis to see exactly how your master resume stacks up against this job.
          </p>
          <div className="flex justify-center">
            <RunMatchButton jobId={jobId} />
          </div>
        </div>
      ) : (
        <>
          {/* Fit Score Area */}
          <div className="border border-ink/10 bg-white rounded p-8 flex flex-col md:flex-row items-center gap-12">
            <div className="text-center min-w-[200px]">
              {!isCurrentScore ? (
                <p className="text-sm text-ink-soft max-w-[200px]">
                  This score was calculated with an older method. Re-run analysis.
                </p>
              ) : match.overall_score === null || match.label === null ? (
                <p className="text-lg font-semibold text-ink-soft max-w-[200px]">Not enough to score.</p>
              ) : (
                <div>
                  <div className="text-6xl font-bold text-ink mb-1">{match.overall_score}<span className="text-3xl text-ink-muted">%</span></div>
                  <div className="text-sm font-medium text-brand-sea-green">{match.label}</div>
                </div>
              )}
              {isCurrentScore && match.scored_total !== null && (
                <p className="text-xs text-ink-muted mt-3">
                  {match.evaluated_count} of {match.scored_total} requirements checked
                </p>
              )}
            </div>
            
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {breakdown.map((b) => (
                <div key={b.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-ink">{b.label}</span>
                    <span className="text-ink-soft">{b.score}%</span>
                  </div>
                  <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-sea-green"
                      style={{ width: `${b.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-muted">{b.weight} weight</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <RunMatchButton jobId={jobId} label="Re-run analysis" />
          </div>

          {/* Evidence Columns */}
          <div className="grid md:grid-cols-3 gap-6">
            <EvidenceColumn
              title="Strong Matches"
              icon={<CheckCircle2 className="w-4 h-4" />}
              color="text-brand-sea-green"
              bg="bg-brand-sea-green/5"
              borderColor="border-brand-sea-green/20"
              items={strongMatches}
            />
            <EvidenceColumn
              title="Partial Matches"
              icon={<AlertTriangle className="w-4 h-4" />}
              color="text-brand-aqua"
              bg="bg-brand-aqua/5"
              borderColor="border-brand-aqua/20"
              items={partialMatches}
            />
            <EvidenceColumn
              title="Missing Evidence"
              icon={<XCircle className="w-4 h-4" />}
              color="text-brand-brandy"
              bg="bg-brand-brandy/5"
              borderColor="border-brand-brandy/20"
              items={missingItems}
            />
          </div>

          {/* Next Steps */}
          <div className="space-y-6 pt-8 border-t border-ink/10">
            <h2 className="text-lg font-semibold text-ink">What do you want to do next?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <FeatureCard
                href={paid ? `/jd-tailoring/${jobId}` : '/account/upgrade'}
                icon={paid ? <Target className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                title="JD Tailoring"
                locked={!paid}
                points={['Approve/reject changes', 'Keyword matching']}
              />
              <FeatureCard
                href={`/tailor/${jobId}`}
                icon={<Pencil className="w-4 h-4" />}
                title="Tailor Resume"
                points={['Full manual editor', 'Optimize for ATS', 'Export PDF/DOCX']}
              />
              <FeatureCard
                href={paid ? `/interview-prep/${jobId}` : '/account/upgrade'}
                icon={paid ? <MessageCircleQuestion className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                title="Interview Prep"
                locked={!paid}
                points={['Practice questions', 'Study plan']}
              />
              <FeatureCard
                href={paid ? `/cover-letter/${jobId}` : '/account/upgrade'}
                icon={paid ? <Mail className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                title="Cover Letter"
                locked={!paid}
                points={['AI-written', 'Evidence-based']}
              />
              <FeatureCard
                href={paid ? `/mock-interview/${jobId}` : '/account/upgrade'}
                icon={paid ? <Mic className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                title="Mock Interview"
                locked={!paid}
                points={['Live voice interview', 'Readiness report']}
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
  bg,
  borderColor,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  borderColor: string;
  items: MatchItemWithDetails[];
}) {
  return (
    <div className={`rounded p-5 border ${borderColor} ${bg}`}>
      <h3 className={`flex items-center gap-2 font-semibold mb-6 ${color}`}>
        {icon} {title} <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">{items.length}</span>
      </h3>
      <div className="space-y-4">
        {items.length === 0 && <p className="text-sm text-ink-muted">Nothing here.</p>}
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-ink/10 rounded p-4 shadow-sm">
            <p className="text-sm font-medium text-ink leading-snug">{item.requirement.requirement_text}</p>
            <div className="mt-2 mb-3">
              <span className="inline-block text-[10px] uppercase tracking-wider text-ink-soft bg-brand-bg px-2 py-1 rounded">
                {item.requirement.importance}
              </span>
            </div>
            {item.achievement && (
              <div className="text-xs text-ink-soft mt-3 pt-3 border-t border-ink/5">
                <p className="italic">&ldquo;{item.achievement.achievement_text}&rdquo;</p>
                <p className="mt-1 text-ink-muted">
                  — {item.achievement.job_title}, {item.achievement.company}
                </p>
              </div>
            )}
            {!item.achievement && item.explanation && (
              <p className="text-xs text-ink-muted mt-3 pt-3 border-t border-ink/5">{item.explanation}</p>
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
  locked,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  points: string[];
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded p-4 border transition-colors ${
        locked
          ? 'bg-ink/5 border-ink/10 text-ink-muted'
          : 'bg-white border-ink/10 hover:border-brand-sea-green hover:bg-brand-sea-green/5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`w-8 h-8 rounded flex items-center justify-center ${
            locked ? 'bg-ink/10 text-ink-soft' : 'bg-brand-sea-green/10 text-brand-sea-green'
          }`}
        >
          {icon}
        </span>
        <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-ink-soft transition-colors" />
      </div>
      <h3 className="font-semibold text-sm text-ink mb-2 flex items-center gap-2">
        {title}
        {locked && <span className="text-[10px] uppercase tracking-wider bg-brand-brandy/10 text-brand-brandy px-1.5 py-0.5 rounded font-medium">Paid</span>}
      </h3>
      <ul className="space-y-1.5 mt-auto">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-ink-soft">
            <span className="text-ink-muted mt-0.5">•</span>
            {point}
          </li>
        ))}
      </ul>
    </Link>
  );
}
