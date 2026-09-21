'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Target,
  ChevronRight,
  ChevronDown,
  FileText,
  Zap,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  BookOpen,
  MessageCircleQuestion,
  Mic,
  Award,
  Mail,
  Wand2,
} from 'lucide-react';

// Cleaner two-tone green gradient for the landing page only — the shared
// .gradient-text utility (green→yellow) is used across the whole app, so it's
// left alone rather than changed globally.
const gradientText = 'bg-gradient-to-r from-brand-green via-emerald-500 to-teal-500 bg-clip-text text-transparent';

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
      'Multiple professional templates optimized for ATS. Download instantly, apply with confidence.',
    color: 'from-sky-400 to-blue-500',
  },
];

const resources = [
  { icon: Target, title: 'Evidence Library', description: 'Every achievement you\'ve ever had, extracted once and reused for every job you apply to.' },
  { icon: Wand2, title: 'JD-Specific Tailoring', description: 'Approve-or-reject resume changes proposed against one exact job description.' },
  { icon: MessageCircleQuestion, title: 'Interview Prep', description: 'Likely questions, a skill-gap study plan, and smart questions to ask them back.' },
  { icon: Mic, title: 'Mock Interview', description: 'A live, real-time voice interview with an AI interviewer — then an honest readiness report.' },
  { icon: Award, title: 'Certifications & Evidence', description: 'Free course links for skill gaps, plus a place to upload certificates and project files.' },
  { icon: Mail, title: 'Cover Letters', description: 'AI-written and evidence-based, built around your strongest real achievements for this job.' },
];

const faqs = [
  {
    q: 'Is GetJobFit.ai free to use?',
    a: 'Yes — you can upload a resume, track jobs, and run evidence-based match analysis for free. Paid plans unlock JD-specific tailoring, interview prep, mock interviews, and cover letters.',
  },
  {
    q: 'What is Truth Guard™?',
    a: 'It\'s our built-in fact-checker: every AI-generated suggestion is checked against what\'s actually in your resume and Evidence Library. If a rewrite would claim something you haven\'t documented, it gets flagged instead of silently added.',
  },
  {
    q: 'Will this make up experience I don\'t have?',
    a: 'No — that\'s the entire premise of the product. We only ever present evidence you actually provided, matched and framed as strongly as it honestly supports.',
  },
  {
    q: 'Is my resume data private?',
    a: 'Every table in our database is protected by row-level security, so only your account can ever read your data. See our Privacy Policy for the full details on what we collect and why.',
  },
  {
    q: 'Can I cancel my paid plan anytime?',
    a: 'Yes, anytime from Account Settings — no lock-in.',
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            <a href="#resources" className="hover:text-gray-900 transition-colors">Resources</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
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
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Fading dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,80,40,0.16) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 25%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 25%, black 30%, transparent 100%)',
          }}
        />
        {/* Soft spotlight glow behind the headline */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[46rem] h-[30rem] bg-brand-green/[0.13] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-72 -right-24 w-80 h-80 bg-brand-yellow/[0.16] rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <motion.div
              initial="hidden"
              animate="visible"
              custom={0}
              variants={fadeUp}
              className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-brand-green mb-8 border border-brand-green/20"
            >
              <Shield className="w-3.5 h-3.5" />
              Evidence-based resume matching — not AI hallucination
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              custom={0.1}
              variants={fadeUp}
              className="text-5xl md:text-6xl font-bold leading-[1.08] tracking-tight mb-6 text-gray-900"
            >
              The biggest reason you&apos;re not getting interviews isn&apos;t missing skills.
              <br />
              <span className={gradientText}>It&apos;s how they&apos;re presented.</span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={0.2}
              variants={fadeUp}
              className="text-xl text-gray-600 max-w-xl mb-8 leading-relaxed"
            >
              We don&apos;t invent a better candidate. We find and present the strongest evidence of
              the candidate you actually are — matched precisely to what every employer needs.
            </motion.p>

            <motion.ul
              initial="hidden"
              animate="visible"
              custom={0.28}
              variants={fadeUp}
              className="space-y-2.5 mb-10"
            >
              {[
                'Every requirement matched to real evidence from your career',
                'Truth Guard™ fact-checks every AI suggestion before it reaches your resume',
                'Real ATS scoring — not a vague pass/fail',
                'A live, real-time voice mock interview with instant feedback',
                'Free to start — no credit card required',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
                  {point}
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial="hidden"
              animate="visible"
              custom={0.36}
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4"
            >
              <Link
                href="/signup"
                className="group flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white transition-all px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-brand-green/30 hover:scale-[1.02] active:scale-[0.98] hover:shadow-brand-green/40"
              >
                Start matching — it&apos;s free
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
          </div>

          {/* Mock match dashboard, framed like a browser window */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="rounded-3xl bg-white border border-black/[0.08] shadow-2xl shadow-brand-green/10 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3 bg-black/[0.03] border-b border-black/[0.06]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 flex-1 max-w-xs text-[11px] text-gray-400 bg-white border border-black/[0.06] rounded-md px-3 py-1 truncate">
                getjobfit.ai/match/senior-data-analyst
              </span>
            </div>
            <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Senior Data Analyst · Acme Corp</p>
                <h3 className="text-xl font-semibold text-gray-900">Your Match Analysis</h3>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${gradientText}`}>82%</div>
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
            </div>
          </motion.div>
        </div>

        {/* Hero stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.44}
          variants={fadeUp}
          className="max-w-7xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 relative"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white border border-black/[0.08] rounded-2xl p-6 text-center shadow-sm hover:shadow-lg hover:shadow-brand-green/10 transition-shadow">
              <div className={`text-3xl font-bold ${gradientText} mb-1`}>{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Repeated CTA banner */}
      <section className="py-4 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white transition-all px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-brand-green/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            See your real match score
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-3">Free to start — upgrade only when you need more.</p>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white border-y border-black/[0.06]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Built different, <span className={gradientText}>by design</span>
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
                className="relative overflow-hidden bg-white border border-black/[0.08] hover:border-brand-green/30 hover:shadow-xl hover:shadow-brand-green/10 transition-all rounded-2xl p-8 group"
              >
                <span className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-green to-emerald-400 opacity-70" />
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
              From resume to tailored in <span className={gradientText}>minutes</span>
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
                className="flex gap-6 items-start bg-white border border-black/[0.08] rounded-2xl p-8 shadow-sm hover:shadow-lg hover:shadow-brand-green/10 transition-shadow"
              >
                <div className={`text-4xl font-black ${gradientText} opacity-60 shrink-0 w-12`}>{step.num}</div>
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

      {/* Resources */}
      <section id="resources" className="py-24 px-6 bg-white border-y border-black/[0.06]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Everything you need, <span className={gradientText}>in one place</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-green" />
              A full toolkit for every stage of applying — all built on the same evidence.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden bg-white border border-black/[0.08] hover:border-brand-green/30 hover:shadow-xl hover:shadow-brand-green/10 transition-all rounded-2xl p-6"
              >
                <span className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-green to-emerald-400 opacity-70" />
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center mb-4 shadow-md">
                  <r.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{r.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{r.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Frequently asked <span className={gradientText}>questions</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <motion.div
                  key={item.q}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-medium text-gray-900">{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">{item.a}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-br from-brand-green-dark via-brand-green to-emerald-600">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, black 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, black 20%, transparent 100%)',
          }}
        />
        <div className="absolute -bottom-24 right-10 w-80 h-80 bg-brand-yellow/25 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <TrendingUp className="w-12 h-12 text-brand-yellow mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Ready to match with confidence?
            </h2>
            <p className="text-white/80 mb-10 text-lg max-w-xl mx-auto">
              Upload your resume, paste a job description, and see exactly where you stand — and how to improve it — in under 5 minutes.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-brand-green-dark hover:bg-brand-yellow hover:text-gray-900 transition-all px-10 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-black/20 hover:scale-[1.03] active:scale-[0.98]"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-medium">GetJobFit.ai</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <p>© 2026 GetJobFit.ai. Built with evidence, not hallucination.</p>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
