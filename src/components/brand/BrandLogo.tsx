/**
 * GetJobFit.in Brand Logo
 * Matches the official design: green briefcase + handshake + speech bubble.
 */

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'w-9 h-9' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="GetJobFit.in logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Briefcase body */}
      <rect x="10" y="36" width="80" height="54" rx="8" fill="#2D6A4F" />
      {/* Briefcase handle */}
      <path
        d="M36 36V28a6 6 0 0 1 6-6h16a6 6 0 0 1 6 6v8"
        fill="none"
        stroke="#1e4d39"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Center latch */}
      <rect x="42" y="56" width="16" height="10" rx="3" fill="rgba(255,255,255,0.25)" />
      {/* Left hand (darker skin) */}
      <path
        d="M18 66 Q28 52 40 60 L48 66"
        fill="none"
        stroke="#6B3A2A"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right hand (lighter skin) */}
      <path
        d="M82 66 Q72 52 60 60 L52 66"
        fill="none"
        stroke="#C68642"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Handshake clasp */}
      <ellipse cx="50" cy="66" rx="6" ry="5" fill="#8B4513" />
      {/* Speech bubble */}
      <circle cx="78" cy="24" r="14" fill="#EEF8F6" />
      {/* Bubble tail */}
      <path d="M70 34 L66 44 L78 36" fill="#EEF8F6" />
      {/* Dots inside bubble */}
      <circle cx="72" cy="24" r="2" fill="#2D6A4F" />
      <circle cx="78" cy="24" r="2" fill="#2D6A4F" />
      <circle cx="84" cy="24" r="2" fill="#2D6A4F" />
    </svg>
  );
}

interface BrandLogoProps {
  markClassName?: string;
  textClassName?: string;
}

export default function BrandLogo({
  markClassName = 'w-9 h-9',
  textClassName = 'text-xl',
}: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark className={markClassName} />
      <span
        className={`font-bold tracking-tight leading-none ${textClassName}`}
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: '#1C4A35',
        }}
      >
        GetJobFit
        <span style={{ color: '#8B3A2A' }}>.in</span>
      </span>
    </span>
  );
}
