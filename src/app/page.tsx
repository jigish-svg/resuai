'use client';

import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const FLOW_STEPS = ['JOB', 'FIT', 'EVIDENCE', 'TAILOR', 'APPLY'];

const FEATURES = [
  {
    accent: 'bg-brand-sea-green/10',
    label: 'Fit Analysis',
    text: 'Evaluate requirements against your real timeline. Deterministic scoring, not AI guesses.',
  },
  {
    accent: 'bg-brand-aqua/10',
    label: 'Evidence Tracking',
    text: 'Every requirement mapped to actual documented achievements. No fabrication.',
  },
  {
    accent: 'bg-brand-periwinkle/20',
    label: 'Application Tailoring',
    text: 'Adjust your resume and cover letter per role. Truth Guard keeps it honest.',
  },
  {
    accent: 'bg-brand-cream',
    label: 'Interview Preparation',
    text: 'Structured talking points built from your specific gaps and strengths.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-ink overflow-x-hidden flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bg/90 backdrop-blur border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="GetJobFit.in home">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/features" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors hidden sm:block">
              Features
            </Link>
            <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-brand-sea-green hover:bg-opacity-90 text-white px-5 py-2 rounded transition-colors"
            >
              Start an application
            </Link>
          </div>
        </div>
      </nav>

      {/* Two-column layout */}
      <main className="flex-1 pt-28 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_340px] gap-16 items-start pt-8">

            {/* Left — headline, CTA, features */}
            <div className="space-y-14">
              <div>
                <h1 className="text-[44px] md:text-[52px] font-bold tracking-tight leading-[1.1] text-ink mb-5">
                  Build an application<br />you can stand behind.
                </h1>
                <p className="text-base text-ink-soft leading-relaxed max-w-lg">
                  A professional workspace for career decision support, evidence-based job matching, and intelligent tailoring — without fabrication.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white px-8 py-3.5 rounded font-semibold text-sm transition-colors"
                >
                  Start an application
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 bg-white border border-ink/10 hover:border-ink/20 text-ink px-6 py-3.5 rounded font-medium text-sm transition-colors"
                >
                  <PlayCircle className="w-4 h-4 text-brand-sea-green" />
                  See how it works
                </Link>
              </div>

              {/* Feature list — minimal, not heavy */}
              <div className="grid sm:grid-cols-2 gap-8">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex gap-4">
                    <div className={`w-9 h-9 rounded-lg shrink-0 ${f.accent} mt-0.5`} />
                    <div>
                      <p className="font-semibold text-sm text-ink mb-1">{f.label}</p>
                      <p className="text-sm text-ink-soft leading-relaxed">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Proof line */}
              <p className="text-xs text-ink-muted border-t border-ink/10 pt-6">
                No resume spam. No inflated claims. Built for people who apply with intention.{' '}
                <Link href="/features" className="underline hover:text-ink">
                  See all features →
                </Link>
              </p>
            </div>

            {/* Right — Your flow */}
            <div className="flex flex-col items-center pt-4 lg:pt-8">
              <h2 className="text-2xl font-bold text-ink mb-10 self-start lg:self-center">Your flow</h2>
              <div className="flex flex-col items-center gap-0">
                {FLOW_STEPS.map((step, idx) => (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`px-10 py-4 rounded-lg border text-xs font-bold tracking-[0.12em] min-w-[176px] text-center transition-colors ${
                        idx === 1 || idx === 3
                          ? 'bg-brand-periwinkle/20 border-brand-periwinkle/40 text-ink shadow-sm'
                          : 'bg-white border-ink/10 text-ink-soft'
                      }`}
                    >
                      {step}
                    </div>
                    {idx < FLOW_STEPS.length - 1 && (
                      <div className="h-10 w-px bg-ink/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink/5 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo markClassName="w-5 h-5" textClassName="text-sm" />
          <div className="flex gap-6 text-sm text-ink-muted">
            <Link href="/features" className="hover:text-ink">Features</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
