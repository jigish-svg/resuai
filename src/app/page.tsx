'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Target,
  ChevronRight,
  FileText,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  TrendingUp,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const features = [
  {
    icon: Target,
    title: 'Evidence Matching',
    description:
      'Every requirement mapped to real achievements from your career. No guessing, no fabrication.',
    color: 'from-brand-green to-brand-green-dark',
  },
  {
    icon: Shield,
    title: 'Truth Guard™',
    description:
      'Our AI fact-checker flags any unsupported claim before it reaches your resume. Your integrity, protected.',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    icon: Zap,
    title: 'Instant ATS Check',
    description:
      'Deterministic ATS scoring — not a vague "pass/fail." Real checks, real scores, real improvements.',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: FileText,
    title: 'PDF & DOCX Export',
    description:
      '3 professional templates optimized for ATS. Download instantly, apply with confidence.',
    color: 'from-sky-400 to-blue-500',
  },
];

const steps = [
  {
    num: '01',
    title: 'Upload Your Master Resume',
    desc: 'Upload PDF, DOCX, or paste text. Our AI extracts every achievement into your personal Evidence Library.',
    icon: FileText,
  },
  {
    num: '02',
    title: 'Add the Job Description',
    desc: 'Paste any JD and we\'ll extract requirements, assign importance levels (Critical → Low), and build a match plan.',
    icon: Target,
  },
  {
    num: '03',
    title: 'Get Evidence-Based Analysis',
    desc: 'Every requirement matched to real evidence from your career. See exactly what\'s strong, what\'s partial, what\'s missing.',
    icon: Sparkles,
  },
  {
    num: '04',
    title: 'Tailor, Guard & Export',
    desc: 'Rewrite bullets with AI — Truth Guard ensures no fabrication. ATS check, then download PDF or DOCX.',
    icon: Shield,
  },
];

const stats = [
  { value: '94%', label: 'Match Accuracy' },
  { value: '3x', label: 'Interview Rate' },
  { value: '0', label: 'Fabricated Claims' },
  { value: '< 5min', label: 'Per Application' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-hero-gradient overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">GetJobFit.ai</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-brand-green hover:bg-brand-green-dark text-white transition-colors px-4 py-2 rounded-lg font-medium shadow-sm shadow-brand-green/20"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 relative">
        {/* Background orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-green/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-brand-yellow/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-brand-green mb-8 border border-brand-green/20"
          >
            <Star className="w-3.5 h-3.5 fill-brand-green text-brand-green" />
            Evidence-based resume matching — not AI hallucination
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={0.1}
            variants={fadeUp}
            className="text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-gray-900"
          >
            Your best resume{' '}
            <span className="gradient-text">for every job.</span>
            <br />
            Built on real evidence.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={0.2}
            variants={fadeUp}
            className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            We don&apos;t invent a better candidate. We find and present the strongest evidence of
            the candidate you actually are — matched precisely to what every employer needs.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.3}
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="group flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white transition-all px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-brand-green/25 hover:shadow-brand-green/40"
            >
              Start for free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 glass glass-hover px-8 py-4 rounded-xl font-medium text-gray-700"
            >
              Sign in
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Hero stats */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.4}
            variants={fadeUp}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-6 text-center">
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Match UI Preview */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="glass rounded-3xl p-8 border border-black/[0.06] animate-glow"
          >
            {/* Mock match dashboard */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Senior Data Analyst · Acme Corp</p>
                <h3 className="text-xl font-semibold text-gray-900">Your Match Analysis</h3>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold gradient-text">82%</div>
                <div className="text-sm text-emerald-600 font-medium">Excellent Match</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Hard Skills', score: 92 },
                { label: 'Experience', score: 86 },
                { label: 'Responsibilities', score: 78 },
                { label: 'Education', score: 100 },
                { label: 'ATS Score', score: 91 },
                { label: 'Semantic Fit', score: 75 },
              ].map((item) => (
                <div key={item.label} className="bg-black/[0.02] rounded-xl p-3 border border-black/[0.04]">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={item.score >= 85 ? 'text-emerald-600' : item.score >= 70 ? 'text-green-600' : 'text-amber-600'}>
                      {item.score}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-yellow"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-emerald-600 font-medium mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strong
                </p>
                {['SQL', 'Python', 'Power BI', 'Stakeholder Mgmt'].map(s => (
                  <div key={s} className="text-gray-600 py-0.5">{s}</div>
                ))}
              </div>
              <div>
                <p className="text-amber-600 font-medium mb-2">⚡ Partial</p>
                {['Cloud Computing', 'Machine Learning'].map(s => (
                  <div key={s} className="text-gray-600 py-0.5">{s}</div>
                ))}
              </div>
              <div>
                <p className="text-rose-600 font-medium mb-2">✗ Missing</p>
                {['AWS', 'Tableau', 'Snowflake'].map(s => (
                  <div key={s} className="text-gray-600 py-0.5">{s}</div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Built different, <span className="gradient-text">by design</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Every feature is designed around one principle: present your real achievements in their strongest possible light.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass glass-hover rounded-2xl p-8 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              From resume to tailored in <span className="gradient-text">minutes</span>
            </h2>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 items-start glass rounded-2xl p-8"
              >
                <div className="text-4xl font-black gradient-text opacity-60 shrink-0 w-12">{step.num}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
                <step.icon className="w-8 h-8 text-brand-green shrink-0 mt-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 gradient-border"
          >
            <TrendingUp className="w-12 h-12 text-brand-green mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Ready to match with confidence?
            </h2>
            <p className="text-gray-600 mb-8 text-lg">
              Upload your resume, paste a job description, and see exactly where you stand — and how to improve it — in under 5 minutes.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white transition-all px-10 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-brand-green/25"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span>GetJobFit.ai</span>
          </div>
          <div className="flex items-center gap-6">
            <p>© 2026 GetJobFit.ai. Built with evidence, not hallucination.</p>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
