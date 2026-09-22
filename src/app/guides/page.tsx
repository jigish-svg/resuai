import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Resume & Job Search Guides',
  description:
    'Practical, evidence-based guides on resume tailoring, ATS optimization, and using AI honestly in your job search.',
  alternates: { canonical: '/guides' },
};

const GUIDES = [
  {
    href: '/guides/is-ai-resume-tailoring-safe',
    title: 'Is It Safe to Use AI to Tailor Your Resume?',
    dek: 'What can go wrong with AI resume tools, and how to use one without misrepresenting yourself to employers.',
  },
  {
    href: '/guides/ats-resume-checklist',
    title: 'ATS Resume Checklist: What Applicant Tracking Systems Actually Check',
    dek: 'The specific formatting and content rules ATS software checks for, and how to pass them without keyword-stuffing.',
  },
  {
    href: '/guides/how-to-tailor-your-resume-for-each-job',
    title: 'How to Tailor Your Resume for Each Job Application',
    dek: 'A step-by-step process for adjusting your resume per job posting without rewriting it from scratch every time.',
  },
];

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-hero-gradient">
      <nav className="border-b border-black/[0.06] glass">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo markClassName="w-8 h-8" textClassName="text-lg" />
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-3 text-gray-900 tracking-tight">Guides</h1>
        <p className="text-lg text-gray-500 mb-12 leading-relaxed">
          Practical answers on resume tailoring, ATS systems, and using AI honestly in a job search.
        </p>

        <div className="space-y-4">
          {GUIDES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="group block glass rounded-2xl p-6 border border-black/[0.06] hover:border-brand-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">{g.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">{g.dek}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-brand-primary shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
