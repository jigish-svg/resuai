import Link from 'next/link';
import { Mail, Lock, Sparkles, FileText, Code, BarChart2, Stethoscope, Building2, GraduationCap, Megaphone, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isPaidUser } from '@/lib/plan';
import JobPickerHub from '@/components/jobs/JobPickerHub';

const TEMPLATES = [
  {
    id: 'tech',
    icon: Code,
    label: 'Technology & Engineering',
    desc: 'Leads with technical impact, metrics, and stack depth. Best for SWE, DevOps, Data.',
    accent: 'bg-brand-aqua/10 text-brand-aqua',
  },
  {
    id: 'finance',
    icon: BarChart2,
    label: 'Finance & Banking',
    desc: 'Formal tone, quantitative outcomes, risk-aware framing. Best for banking, VC, PE, fintech.',
    accent: 'bg-brand-periwinkle/20 text-ink',
  },
  {
    id: 'healthcare',
    icon: Stethoscope,
    label: 'Healthcare & Life Sciences',
    desc: 'Patient-first narrative, compliance-aware, evidence-grounded. Best for clinical & research roles.',
    accent: 'bg-brand-sea-green/10 text-brand-sea-green',
  },
  {
    id: 'consulting',
    icon: Building2,
    label: 'Consulting & Strategy',
    desc: 'Problem → impact structure, MECE reasoning, stakeholder influence. Best for MBB, Big4.',
    accent: 'bg-brand-cream text-ink',
  },
  {
    id: 'marketing',
    icon: Megaphone,
    label: 'Marketing & Growth',
    desc: 'Story-led, brand-aware, data-backed. Best for growth, content, brand, and product marketing.',
    accent: 'bg-brand-brandy/10 text-brand-brandy',
  },
  {
    id: 'academia',
    icon: GraduationCap,
    label: 'Research & Academia',
    desc: 'Publication-led, methodology-focused, scholarly tone. Best for PhD, postdoc, faculty, lab roles.',
    accent: 'bg-brand-periwinkle/20 text-ink',
  },
  {
    id: 'operations',
    icon: Wrench,
    label: 'Operations & Supply Chain',
    desc: 'Process-driven, efficiency metrics, vendor management. Best for ops, logistics, manufacturing.',
    accent: 'bg-brand-sea-green/10 text-brand-sea-green',
  },
  {
    id: 'general',
    icon: FileText,
    label: 'General Purpose',
    desc: 'Balanced, versatile template that adapts to any industry and seniority level.',
    accent: 'bg-ink/5 text-ink',
  },
];

export default async function CoverLetterHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const paid = await isPaidUser(supabase, user!.id);

  if (!paid) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="border border-ink/10 rounded bg-white p-8 text-center">
          <div className="w-12 h-12 rounded bg-brand-cream flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-ink" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-ink">Cover Letters are a paid feature</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
            Upgrade to generate an AI-written, evidence-based cover letter for every job you&apos;re tracking — with domain-specific templates.
          </p>
          <div className="flex justify-center">
            <Link
              href="/account/upgrade"
              className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 text-white transition-colors px-6 py-2.5 rounded text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Paid
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, status')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink mb-1">Cover Letters</h1>
        <p className="text-sm text-ink-soft">Evidence-based letters, written from your actual match results. Pick a job and a template.</p>
      </div>

      {/* Templates */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-4">Choose a template style</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-ink/10 rounded-lg p-5 hover:border-brand-sea-green/30 hover:shadow-sm transition-all cursor-default"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${t.accent}`}>
                <t.icon className="w-4.5 h-4.5" />
              </div>
              <p className="font-semibold text-sm text-ink mb-1">{t.label}</p>
              <p className="text-xs text-ink-soft leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-3">Template is applied when you select a job below. The AI uses your match evidence regardless of template.</p>
      </div>

      {/* Job picker */}
      <div>
        <h2 className="text-base font-semibold text-ink mb-4">Select a job to write for</h2>
        <JobPickerHub
          title=""
          description="Pick a job to generate a tailored cover letter."
          icon={<Mail className="w-4 h-4" />}
          jobs={jobs ?? []}
          hrefPrefix="/cover-letter"
          emptyMessage="No jobs yet. Add one to generate a cover letter."
        />
      </div>
    </div>
  );
}
