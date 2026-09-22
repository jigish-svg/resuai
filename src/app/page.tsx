'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  Lock,
  Mail,
  MessageCircleQuestion,
  Mic,
  Shield,
  Target,
  Wand2,
  Zap,
} from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

const heroChecks = [
  { icon: Check, text: 'Evidence-backed: every match cites your actual accomplishments.' },
  { icon: Shield, text: 'Truth Guard™ fact-checks every AI suggestion against your own resume.' },
  { icon: Lock, text: '80% fit gate: reach it to unlock a real-time voice mock interview.' },
];

const auditBars = [
  { label: 'Hard Technical Skills', score: 92, strong: true },
  { label: 'Core Responsibilities', score: 86, strong: true },
  { label: 'Domain & Business Context', score: 80, strong: false },
  { label: 'ATS Structure & Headers', score: 98, strong: true },
  { label: 'Semantic Expression Match', score: 85, strong: false },
];

const integrityStats = [
  { big: 'Cited', label: 'Every match', desc: 'Each requirement links to the exact achievement that supports it, or is marked missing.', icon: Shield, tone: 'primary' },
  { big: '6-Dim', label: 'Evidence score', desc: 'Hard skills, responsibilities, experience, education, semantic fit and ATS quality.', icon: Target, tone: 'gold' },
  { big: '80%', label: 'Unlock gate', desc: 'Voice mock interviews open when your match reaches 80%.', icon: Mic, tone: 'primary' },
  { big: '1-Click', label: 'PDF & DOCX export', desc: 'Clean, readable documents tailored to the role.', icon: FileText, tone: 'neutral' },
] as const;

const capabilities = [
  {
    icon: Target,
    tone: 'primary',
    tags: ['Audit engine', 'Cited evidence'],
    title: 'Evidence-Based Matching',
    desc: 'We extract every requirement in the job description and cross-examine it against your career timeline. You see the supporting achievement behind every Strong, Partial or Missing result.',
  },
  {
    icon: Shield,
    tone: 'gold',
    tags: ['Anti-fabrication'],
    title: 'Truth Guard™ Integrity System',
    desc: 'Generic AI tools love flattering exaggeration. Truth Guard acts as an uncompromising editor: if a claim is not backed by your own resume, it is flagged before it can reach your application.',
  },
  {
    icon: Zap,
    tone: 'neutral',
    tags: ['Screening checks'],
    title: 'Instant ATS Check',
    desc: 'Checks contact details, standard section headings, keyword coverage, dates and length against the job’s key terms, so formatting problems surface before you hit apply.',
  },
  {
    icon: FileText,
    tone: 'primary',
    tags: ['Clean output'],
    title: 'Lossless PDF & DOCX Export',
    desc: 'Export clean, human-readable documents tailored to the position, with the typographic hierarchy hiring managers expect.',
  },
] as const;

const steps = [
  { num: '01', tag: 'Foundation', title: 'Upload Resume Once', desc: 'Upload a PDF or Word document, or paste your text. We turn your achievements, scope and metrics into a private Evidence Library.' },
  { num: '02', tag: 'Targeting', title: 'Paste the Job Description', desc: 'Paste the posting text. We break it into requirements ranked Critical, High, Medium or Low.' },
  { num: '03', tag: 'Diagnosis', title: 'Inspect Your Evidence Score', desc: 'Review a 6-dimension alignment score. Missing credentials come with links to free courses so you can close real gaps.' },
  { num: '04', tag: 'Execution', title: 'Tailor, Practice & Apply', desc: 'Generate truth-bound tailored drafts, rehearse hard questions in a live voice interview once you reach 80%, and export clean documents.' },
];

const suite = [
  { icon: BookOpen, title: 'Evidence Library', desc: 'Stores structured metrics, tools and outcomes for reuse.' },
  { icon: Wand2, title: 'JD-Specific Tailoring', desc: 'Approve or reject changes proposed for each posting.' },
  { icon: MessageCircleQuestion, title: 'Interview Prep', desc: 'Likely questions and a study plan built from your gaps.' },
  { icon: Mic, title: 'Live Mock Practice', desc: 'A real-time voice interview, then an honest readiness report.' },
  { icon: GraduationCap, title: 'Free Certification Paths', desc: 'Course links to close legitimate skill gaps.' },
  { icon: Mail, title: 'Evidence Cover Letters', desc: 'Letters built around your strongest real achievements.' },
];

const faqs = [
  {
    q: 'How is this different from ChatGPT or other AI resume builders?',
    a: 'General AI tools will happily invent achievements to make a resume sound better. GetJobFit.ai only works from what you have documented: every match cites your evidence, and Truth Guard flags any suggestion your resume does not support.',
  },
  {
    q: 'Will this make up experience I don’t have?',
    a: 'No. That is the entire premise of the product. We only present evidence you actually provided, framed as strongly as it honestly supports.',
  },
  {
    q: 'Why does the Voice Mock Interview require an 80% match?',
    a: 'Practising against a job you are far from matching mostly rehearses gaps. Reaching 80% first means the interview drills the role you are genuinely competitive for. Your final score then blends your match score with your interview performance.',
  },
  {
    q: 'Is GetJobFit.ai free to start?',
    a: 'Yes. You can upload a resume, track jobs and run an evidence-based match for free. Paid plans unlock JD-specific tailoring, interview prep, mock interviews and cover letters.',
  },
  {
    q: 'What is Truth Guard™?',
    a: 'It is our built-in fact-checker. Every AI-generated suggestion is compared with what is actually in your resume and Evidence Library. If a rewrite would claim something you have not documented, it is flagged instead of silently added.',
  },
  {
    q: 'Is my resume data private?',
    a: 'Every table in our database is protected by row-level security, so only your account can read your data. See our Privacy Policy for what we collect and why.',
  },
  {
    q: 'Can I cancel my paid plan anytime?',
    a: 'Yes, anytime from Account Settings. There is no lock-in.',
  },
];

const chipTone = {
  primary: 'bg-brand-primary-light text-brand-primary',
  gold: 'bg-brand-secondary-light text-brand-secondary-dark',
  neutral: 'bg-canvas-chip text-ink-soft',
} as const;

const cardShadow = 'shadow-[0_1px_2px_rgba(22,28,24,0.05),0_8px_24px_-12px_rgba(22,28,24,0.1)]';

function ScoreRing({ score }: { score: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2ebe5" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#006d39"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink tabular-nums leading-none">{score}%</span>
        <span className="text-[10px] font-semibold tracking-wider text-ink-muted mt-1">FIT</span>
      </div>
    </div>
  );
}

const landingJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'GetJobFit.ai',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Evidence-based AI resume tailoring: match your resume to any job description, verify claims with Truth Guard, and optimize for ATS.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free plan: upload a resume, track jobs, and run evidence-based matches.',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
    {
      '@type': 'HowTo',
      name: 'How to tailor your resume with GetJobFit.ai',
      step: steps.map((s) => ({
        '@type': 'HowToStep',
        position: Number(s.num),
        name: s.title,
        text: s.desc,
      })),
    },
  ],
};

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-brand-ivory text-ink overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-ivory/95 backdrop-blur border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" aria-label="GetJobFit.ai home">
            <BrandLogo />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-soft">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#mock-interview" className="hover:text-ink transition-colors">Mock interview</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold bg-brand-primary hover:bg-brand-primary-dark text-white transition-colors px-5 py-2.5 rounded-full"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 sm:pt-36 sm:pb-20 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="text-center lg:text-left animate-fade-up">
            <span className="inline-flex items-center gap-2 bg-canvas-chip text-brand-primary text-xs sm:text-sm font-semibold px-4 py-2 rounded-full mb-7">
              <span className="w-2 h-2 rounded-full bg-brand-primary" />
              Truth Guard™ fact-checking on every suggestion
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-[-0.03em] mb-6">
              The biggest reason you’re not getting interviews isn’t missing skills.{' '}
              <span className="text-brand-primary">It’s how they’re presented.</span>
            </h1>

            <p className="text-lg text-ink-soft max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed">
              Match your resume to any job description using real, verified evidence from your career history.
              Honest fit scores, no invented claims.
            </p>

            <ul className={`bg-white rounded-2xl ${cardShadow} p-5 space-y-4 mb-8 text-left max-w-xl mx-auto lg:mx-0`}>
              {heroChecks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand-primary-light text-brand-primary flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-ink-soft leading-snug pt-1">{text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center lg:items-start gap-4 max-w-xl mx-auto lg:mx-0">
              <Link
                href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white transition-colors px-9 py-4 rounded-full font-semibold text-lg"
              >
                Start matching, it’s free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="text-sm font-semibold text-ink-soft hover:text-ink transition-colors">
                Already have an account? Sign in
              </Link>
            </div>
          </div>

          {/* Live audit canvas (sample data) */}
          <div className="bg-white rounded-3xl shadow-[0_1px_2px_rgba(22,28,24,0.05),0_20px_40px_-20px_rgba(22,28,24,0.18)] overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-6 py-3.5 bg-canvas-chip">
              <span className="flex items-center gap-2 eyebrow !text-ink">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                Live audit canvas
              </span>
              <span className="text-xs font-semibold text-ink-muted">Sample analysis</span>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="bg-canvas-band rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow mb-1">Target specification</p>
                  <p className="text-lg font-semibold truncate">Senior Data Analyst</p>
                  <p className="text-sm text-ink-soft truncate">Acme Corp · Hybrid</p>
                </div>
                <span className="text-xs font-semibold bg-brand-primary-light text-brand-primary px-3 py-1.5 rounded-full shrink-0">Parsed</span>
              </div>

              <div className="bg-brand-ivory border border-black/[0.05] rounded-2xl p-4 flex items-center gap-4">
                <ScoreRing score={84} />
                <div className="min-w-0">
                  <p className="font-semibold">Target readiness</p>
                  <p className="text-brand-primary font-semibold flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-brand-primary" /> Interview ready
                  </p>
                  <p className="text-sm text-ink-soft">Unlocks the voice mock lab</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {auditBars.map((b) => (
                  <div key={b.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-ink-soft">{b.label}</span>
                      <span className="font-semibold tabular-nums">{b.score}%</span>
                    </div>
                    <div className="h-2 bg-[#e6eee9] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.strong ? 'bg-brand-primary' : 'bg-brand-primary-light'}`}
                        style={{ width: `${b.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="eyebrow mb-3">Itemized evidence audit</p>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-black/[0.06] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-primary mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-primary" /> Strong match
                    </p>
                    <p className="font-semibold text-sm mb-2">Requirement: “Advanced SQL &amp; dimensional modeling”</p>
                    <p className="text-sm text-ink-soft bg-canvas-band rounded-xl p-3">
                      <span className="font-semibold text-brand-primary">Resume proof:</span> “Led migration to Snowflake, authoring 140+ star-schema tables.”
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/[0.06] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-secondary-dark mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-brand-secondary" /> Partial match
                    </p>
                    <p className="font-semibold text-sm mb-2">Requirement: “Tableau &amp; Looker visualizations”</p>
                    <p className="text-sm text-ink-soft bg-canvas-band rounded-xl p-3">
                      <span className="font-semibold text-brand-secondary-dark">Resume proof:</span> “Built 18 production Looker dashboards.”
                    </p>
                  </div>
                  <div className="rounded-2xl border border-black/[0.06] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-700" /> Missing evidence
                    </p>
                    <p className="font-semibold text-sm mb-2">Requirement: “dbt core orchestration”</p>
                    <p className="text-sm text-ink-soft bg-canvas-band rounded-xl p-3 flex items-center justify-between gap-3">
                      <span>Suggested: a free dbt Fundamentals course to close this gap.</span>
                      <GraduationCap className="w-5 h-5 text-brand-primary shrink-0" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Honest architecture */}
      <section className="bg-canvas-band py-16 sm:py-20 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="eyebrow mb-2">Uncompromising integrity</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Honest architecture, real results</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {integrityStats.map((s) => (
              <div key={s.big} className={`bg-white rounded-2xl p-5 sm:p-6 ${cardShadow}`}>
                <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-5 ${chipTone[s.tone]}`}>
                  <s.icon className="w-5 h-5" />
                </span>
                <p className={`text-3xl sm:text-4xl font-bold tracking-tight mb-1 ${s.tone === 'primary' ? 'text-brand-primary' : 'text-ink'}`}>{s.big}</p>
                <p className="font-semibold mb-1">{s.label}</p>
                <p className="text-sm text-ink-soft leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System capabilities */}
      <section id="features" className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="eyebrow mb-2">System capabilities</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl mb-10">Precision tools built for serious professionals</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {capabilities.map((c) => (
              <div key={c.title} className={`bg-white rounded-2xl p-6 sm:p-8 ${cardShadow}`}>
                <span className={`w-12 h-12 rounded-full flex items-center justify-center mb-5 ${chipTone[c.tone]}`}>
                  <c.icon className="w-5 h-5" />
                </span>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {c.tags.map((t, i) => (
                    <span
                      key={t}
                      className={i === 0 ? 'text-xs font-medium bg-canvas-chip text-ink-soft px-3 py-1 rounded-full' : 'text-xs font-semibold text-brand-primary'}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-2">{c.title}</h3>
                <p className="text-ink-soft leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four steps */}
      <section id="how-it-works" className="bg-canvas-band py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="eyebrow mb-2">Methodical process</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl mb-10">Four steps to verifiable application confidence</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s) => (
              <div key={s.num} className={`bg-white rounded-2xl p-6 ${cardShadow}`}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-3xl font-bold text-brand-primary tabular-nums">{s.num}</span>
                  <span className="text-sm text-ink-muted">{s.tag}</span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">{s.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice mock interview */}
      <section id="mock-interview" className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-secondary-dark mb-3">
              <Lock className="w-4 h-4" /> Earned at 80% fit readiness
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Live Voice Mock Interview Lab</h2>
            <p className="text-lg text-ink-soft leading-relaxed mb-6">
              When your resume reaches high alignment, the simulator unlocks. Practise answering difficult follow-ups out
              loud using your actual evidence, then get an honest readiness report built from the whole conversation.
            </p>
            <ul className="space-y-3">
              {['Talk naturally: the interviewer listens and responds in real time', 'Live captions of the whole conversation', 'A readiness report with strengths and focus areas'].map((t) => (
                <li key={t} className="flex items-start gap-3 text-ink-soft">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#29332b] text-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_40px_-20px_rgba(22,28,24,0.4)]">
            <div className="flex items-center justify-between mb-8">
              <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white/60">
                <span className="w-2 h-2 rounded-full bg-brand-primary-bright" /> VOICE SESSION
              </span>
              <span className="text-xs bg-white/10 px-3 py-1.5 rounded-full">Sample session</span>
            </div>
            <div className="flex justify-center mb-8">
              <span className="w-28 h-28 rounded-full border border-white/10 flex items-center justify-center">
                <span className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-brand-primary flex items-center justify-center">
                    <Mic className="w-6 h-6 text-white" />
                  </span>
                </span>
              </span>
            </div>
            <div className="space-y-3">
              <div className="bg-white/[0.08] rounded-2xl p-4">
                <p className="text-xs text-white/60 mb-1.5">Interviewer</p>
                <p className="text-sm leading-relaxed">“Tell me about a time you optimized a slow SQL pipeline under a tight deadline. How did you validate accuracy?”</p>
              </div>
              <div className="bg-white/[0.08] rounded-2xl p-4">
                <p className="flex justify-between text-xs text-white/60 mb-1.5"><span>Your answer</span><span>Live transcript</span></p>
                <p className="text-sm leading-relaxed italic text-white/90">“Our nightly ETL had ballooned to four hours. I partitioned the tables by date and refactored the subqueries into CTEs…”</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progression */}
      <section className="bg-canvas-band py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-2">The progression</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-10">Earn your readiness step by step</h2>
          <div className="space-y-4">
            {[
              { n: 'Phase 01', t: 'Preliminary Check', d: 'A quick keyword and core-requirement pass before you run the full analysis.' },
              { n: 'Phase 02', t: 'Deep Evidence Analysis', d: 'Every requirement is matched against your evidence across all six scoring dimensions.' },
            ].map((p) => (
              <div key={p.n} className={`bg-white rounded-2xl p-5 flex items-start gap-4 ${cardShadow}`}>
                <span className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs text-ink-muted">{p.n}</p>
                  <p className="font-semibold text-lg tracking-tight">{p.t}</p>
                  <p className="text-ink-soft text-sm leading-relaxed">{p.d}</p>
                </div>
              </div>
            ))}
            <div className={`bg-white rounded-2xl p-5 flex items-start gap-4 border-l-4 border-brand-secondary ${cardShadow}`}>
              <span className="w-11 h-11 rounded-full bg-brand-secondary text-brand-secondary-dark text-sm font-bold flex items-center justify-center shrink-0">80%</span>
              <div>
                <p className="text-xs font-semibold text-brand-secondary-dark">Milestone gate</p>
                <p className="font-semibold text-lg tracking-tight">Voice Mock Interview unlocked</p>
                <p className="text-ink-soft text-sm leading-relaxed">
                  Practise out loud with an AI interviewer, then see a final score that blends your match with your interview performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete suite */}
      <section id="resources" className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="eyebrow mb-2">Complete career suite</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl mb-10">Everything you need for genuine preparation</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {suite.map((s) => (
              <div key={s.title} className={`bg-white rounded-2xl p-5 sm:p-6 ${cardShadow}`}>
                <s.icon className="w-6 h-6 text-brand-primary mb-4" />
                <h3 className="font-semibold tracking-tight mb-1">{s.title}</h3>
                <p className="text-sm text-ink-soft leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-canvas-band py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-2">Clarity · direct answers</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q} className={`bg-white rounded-2xl ${cardShadow} overflow-hidden`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium">{item.q}</span>
                    <ChevronDown className={`w-5 h-5 text-ink-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <div className="px-6 pb-5 text-ink-soft leading-relaxed">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto bg-brand-primary rounded-3xl px-6 py-14 sm:px-14 sm:py-16 text-center text-white shadow-[0_20px_40px_-20px_rgba(0,109,57,0.5)]">
          <span className="inline-block eyebrow !text-white bg-white/15 px-4 py-1.5 rounded-full mb-6">Evidence over illusion</span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">Stop guessing why applications get ignored.</h2>
          <p className="text-white/85 text-lg max-w-xl mx-auto mb-9 leading-relaxed">
            Analyze your resume against a target role and see exactly which requirements are backed by real evidence.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-brand-ivory text-brand-primary hover:bg-white transition-colors px-9 py-4 rounded-full font-semibold text-lg"
          >
            Start matching, it’s free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="flex items-center justify-center gap-2 text-sm text-white/80 mt-6">
            <CheckCircle2 className="w-4 h-4" /> Free to start
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-canvas-band py-12 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <BrandLogo />
          <p className="text-ink-soft max-w-md mt-4 mb-8 leading-relaxed">
            Editorial-grade precision for career readiness, resume alignment and verifiable skill matching.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-ink-soft mb-8">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted">© 2026 GetJobFit.ai. Evidence over illusion.</p>
        </div>
      </footer>
    </div>
  );
}
