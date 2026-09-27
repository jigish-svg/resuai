'use client';

import Link from 'next/link';
import { ArrowRight, Shield, Target, FileText, Mic, Play, Chrome, CheckCircle, Zap, Users, Lock } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const steps = [
  {
    num: '01',
    title: 'Add a Job',
    desc: 'Paste a job description or let the Chrome extension detect it automatically on any job board.',
    color: 'bg-brand-periwinkle/20',
  },
  {
    num: '02',
    title: 'See Your Fit Score',
    desc: 'Evidence-based, multi-dimensional matching against your actual professional timeline. No hallucination.',
    color: 'bg-brand-sea-green/10',
  },
  {
    num: '03',
    title: 'Review the Evidence',
    desc: 'Every requirement is checked. Strong matches, partial matches, and honest gaps — all visible.',
    color: 'bg-brand-cream border border-ink/5',
  },
  {
    num: '04',
    title: 'Tailor Your Resume',
    desc: 'Edit your resume with AI suggestions. Truth Guard ensures you never fabricate experience.',
    color: 'bg-brand-aqua/10',
  },
  {
    num: '05',
    title: 'Prepare & Apply',
    desc: 'Targeted interview questions, cover letters, and a skill-gap learning plan built from your evidence.',
    color: 'bg-brand-periwinkle/10',
  },
];

const features = [
  {
    icon: Target,
    color: 'text-brand-sea-green bg-brand-sea-green/10',
    title: 'Fit Analysis',
    desc: 'Deterministic, multi-dimensional scoring against job requirements. No vague AI summaries — just facts.',
  },
  {
    icon: Shield,
    color: 'text-brand-aqua bg-brand-aqua/10',
    title: 'Truth Guard',
    desc: 'Every AI suggestion is checked against your documented achievements. It refuses to fabricate.',
  },
  {
    icon: FileText,
    color: 'text-ink bg-brand-periwinkle/20',
    title: 'Resume Tailoring',
    desc: 'Adjust bullet points intelligently per job without creating a fraudulent narrative.',
  },
  {
    icon: Mic,
    color: 'text-ink bg-brand-cream',
    title: 'Interview Prep',
    desc: 'Structured talking points from your real gaps and strengths, not generic STAR templates.',
  },
  {
    icon: Chrome,
    color: 'text-brand-sea-green bg-brand-sea-green/10',
    title: 'Chrome Extension',
    desc: 'Detect job postings on LinkedIn, Naukri, and any job site. One-click send to your workspace.',
  },
  {
    icon: Zap,
    color: 'text-brand-aqua bg-brand-aqua/10',
    title: 'Cover Letters',
    desc: 'Evidence-grounded cover letters written from your specific match results, not a template.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-ink flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bg/90 backdrop-blur border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="GetJobFit.in home">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-brand-sea-green hover:bg-opacity-90 text-white px-5 py-2 rounded transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-32 pb-24 px-6">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-sea-green border border-brand-sea-green/30 bg-brand-sea-green/5 px-3 py-1.5 rounded-full mb-6">
            Features & How It Works
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-ink mb-6 leading-tight">
            Everything you need to apply with confidence.
          </h1>
          <p className="text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            GetJobFit is a career intelligence workspace, not an AI resume spinner. Here&apos;s exactly what it does and how.
          </p>
        </div>

        {/* Demo Video Placeholder */}
        <div className="max-w-5xl mx-auto mb-28">
          <div className="relative bg-white border border-ink/10 rounded-xl overflow-hidden shadow-sm">
            <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-brand-bg via-brand-periwinkle/10 to-brand-cream/30">
              <div className="w-20 h-20 bg-brand-sea-green rounded-full flex items-center justify-center shadow-lg mb-6 cursor-pointer hover:scale-105 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <p className="text-lg font-semibold text-ink mb-2">Watch the 2-minute walkthrough</p>
              <p className="text-sm text-ink-soft">See how a real job application goes from paste to polished in minutes.</p>
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-ink/10">
              <div className="w-2 h-2 bg-brand-sea-green rounded-full" />
              <span className="text-xs font-medium text-ink">Demo: 2 min</span>
            </div>
          </div>
          <p className="text-center text-xs text-ink-muted mt-4">No signup required to watch. Demo uses a sample resume and a real software engineering job posting.</p>
        </div>

        {/* How It Works */}
        <div className="max-w-5xl mx-auto mb-28">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-ink mb-3">How it works</h2>
            <p className="text-sm text-ink-soft">Five steps from job discovery to confident application.</p>
          </div>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[28px] top-10 bottom-10 w-px bg-ink/10 hidden md:block" />
            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-6 items-start">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 relative z-10 ${step.color}`}>
                    <span className="text-xs font-bold tracking-wider text-ink">{step.num}</span>
                  </div>
                  <div className="flex-1 pt-3">
                    <h3 className="font-semibold text-ink mb-1">{step.title}</h3>
                    <p className="text-sm text-ink-soft leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto mb-28">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-ink mb-3">Every feature, explained honestly.</h2>
            <p className="text-sm text-ink-soft">No hype. What each tool actually does and why it exists.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-ink/10 rounded-xl p-6 hover:border-ink/20 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Paid vs Free */}
        <div className="max-w-3xl mx-auto mb-28">
          <div className="bg-white border border-ink/10 rounded-xl overflow-hidden">
            <div className="p-8 border-b border-ink/10">
              <h2 className="text-xl font-bold text-ink mb-2">Free vs. Paid</h2>
              <p className="text-sm text-ink-soft">The core workflow is free. Paid unlocks the intelligence layer.</p>
            </div>
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-ink/10">
              <div className="p-8">
                <p className="font-semibold text-ink mb-4">Free</p>
                <ul className="space-y-3">
                  {['Job tracking & Kanban board', 'Resume storage & management', 'Fit score & evidence matching', 'Resume tailoring editor', 'Chrome extension'].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                      <CheckCircle className="w-4 h-4 text-brand-sea-green shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-8 bg-brand-sea-green/5">
                <p className="font-semibold text-ink mb-4 flex items-center gap-2">
                  Paid
                  <span className="text-xs bg-brand-sea-green text-white px-2 py-0.5 rounded-full">Unlocks AI</span>
                </p>
                <ul className="space-y-3">
                  {['Interview prep with gap strategy', 'AI cover letter generation', 'JD-based tailoring suggestions', 'Mock interview practice', 'Skill gap learning plans'].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                      <Lock className="w-4 h-4 text-brand-brandy shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Chrome Extension callout */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="bg-white border border-ink/10 rounded-xl p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-brand-sea-green/10 rounded-xl flex items-center justify-center shrink-0">
              <Chrome className="w-8 h-8 text-brand-sea-green" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-ink mb-2">Chrome Extension</h2>
              <p className="text-sm text-ink-soft leading-relaxed">
                Browse jobs on LinkedIn, Naukri, Glassdoor, or any site. The extension detects the job posting and sends it to your GetJobFit workspace with one click. No copy-paste.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors"
              >
                Get early access
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Who it is for */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-ink mb-3">Built for serious job seekers.</h2>
            <p className="text-sm text-ink-soft">People who want to apply thoughtfully, not spray-and-pray.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Users, title: 'Experienced professionals', desc: 'Managing 5–15 active applications at once across different roles.' },
              { icon: Zap, title: 'Career changers', desc: 'Identifying where your transferable evidence lands across industries.' },
              { icon: CheckCircle, title: 'Integrity-first applicants', desc: "People who won't inflate their resume but still want to compete effectively." },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-ink/10 rounded-xl p-6">
                <item.icon className="w-5 h-5 text-brand-sea-green mb-3" />
                <h3 className="font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-ink mb-4">Ready to start?</h2>
          <p className="text-ink-soft mb-8">Free to use. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white px-10 py-4 rounded-lg font-semibold text-base transition-colors"
          >
            Create your workspace
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo markClassName="w-5 h-5" textClassName="text-sm" />
          <div className="flex gap-6 text-sm text-ink-muted">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/" className="hover:text-ink">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
