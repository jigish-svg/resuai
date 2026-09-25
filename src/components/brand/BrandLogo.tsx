// GetJobFit.ai logo, rebuilt as inline SVG from the Stitch logo asset:
// a green rounded square with a white check mark and a gold dot.
export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="GetJobFit.in">
      <rect width="48" height="48" rx="11" fill="#CA2E55" />
      <path d="M13.5 20l6.8 7L33.6 14" fill="none" stroke="#ffffff" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33.6" cy="32" r="4" fill="#BDB246" />
    </svg>
  );
}

interface BrandLogoProps {
  markClassName?: string;
  textClassName?: string;
}

export default function BrandLogo({ markClassName = 'w-8 h-8', textClassName = 'text-lg' }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark className={markClassName} />
      <span className={`font-bold tracking-tight text-ink ${textClassName}`}>
        GetJobFit<span className="text-[#CA2E55]">.in</span>
      </span>
    </span>
  );
}
