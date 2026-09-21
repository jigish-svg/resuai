import { CheckCircle2, Lock } from 'lucide-react';
import { getScoreColor } from '@/lib/utils';

interface ReadinessJourneyProps {
  preliminaryScore: number;
  matchScore: number | null;
  finalScore: number | null;
}

export const MOCK_INTERVIEW_UNLOCK_SCORE = 80;

export default function ReadinessJourney({ preliminaryScore, matchScore, finalScore }: ReadinessJourneyProps) {
  const matchReached = matchScore !== null;
  const finalReached = finalScore !== null;
  const unlockedForMock = (matchScore ?? 0) >= MOCK_INTERVIEW_UNLOCK_SCORE;

  const stages: { label: string; score: number | null; reached: boolean; description: string }[] = [
    {
      label: 'Preliminary Check',
      score: preliminaryScore,
      reached: true,
      description: 'A quick keyword check against this job — run a full match for a real, evidence-based score.',
    },
    {
      label: 'Match Score',
      score: matchScore,
      reached: matchReached,
      description: matchReached
        ? 'Reflects your evidence, skills & certifications — re-run anytime after updating your resume.'
        : 'Run Match Analysis to unlock.',
    },
    {
      label: 'Final Score',
      score: finalScore,
      reached: finalReached,
      description: finalReached
        ? 'Combines your match score with real interview performance.'
        : unlockedForMock
        ? 'Complete a Mock Interview to get your precise final score.'
        : `Reach ${MOCK_INTERVIEW_UNLOCK_SCORE}% match score to unlock Mock Interview.`,
    },
  ];

  return (
    <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]">
      <h2 className="font-semibold text-gray-800 mb-4">Readiness Journey</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {stages.map((stage, i) => (
          <div
            key={stage.label}
            className={`relative rounded-xl p-4 border ${
              stage.reached ? 'bg-black/[0.02] border-black/[0.08]' : 'bg-black/[0.01] border-dashed border-black/[0.1]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Stage {i + 1} · {stage.label}
              </p>
              {stage.reached ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
            <p className={`text-2xl font-bold tabular-nums mb-1 ${stage.reached && stage.score !== null ? getScoreColor(stage.score) : 'text-gray-300'}`}>
              {stage.reached && stage.score !== null ? `${stage.score}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">{stage.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
