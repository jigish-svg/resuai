import type { FitLabel } from '@/lib/score/types';

// The label comes from the stored analysis, not from the number: a missing
// must-have caps it at Partial fit whatever the score says.
const LABEL_COLOR: Record<FitLabel, string> = {
  'Strong fit': '#34d399',
  'Good fit': '#4ade80',
  'Partial fit': '#facc15',
  'Weak fit': '#fb923c',
};

export default function ScoreRing({ score, label, size = 140 }: { score: number; label: FitLabel; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = LABEL_COLOR[label];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30"
          style={{ backgroundColor: color }}
        />
        <svg width={size} height={size} className="-rotate-90 relative">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold gradient-text tabular-nums">{score}%</span>
        </div>
      </div>
      <p className="text-sm mt-2 font-medium" style={{ color }}>{label}</p>
    </div>
  );
}
