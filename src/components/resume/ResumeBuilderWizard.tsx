'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  User,
  FileText,
  Briefcase,
  Wrench,
  GraduationCap,
  Award,
  LayoutTemplate,
} from 'lucide-react';
import {
  ParsedResume,
  ParsedExperience,
  ParsedEducation,
  ParsedCertification,
  ResumeTemplate,
} from '@/types/resume';
import { buildResumeDocumentFromParsedResume } from '@/lib/export/build-document';
import TemplateGallery from './TemplateGallery';
import LivePreview from './LivePreview';

interface ResumeBuilderWizardProps {
  /** Where to navigate after a successful save. Omit to stay and refresh in place. */
  redirectOnSaveTo?: string;
}

function emptyParsedResume(): ParsedResume {
  return {
    candidate: { name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '',
    experience: [],
    skills: [],
    education: [],
    certifications: [],
  };
}

function emptyExperience(): ParsedExperience {
  return { company: '', job_title: '', start_date: '', end_date: '', is_current: false, achievements: [] };
}

function flattenToRawText(parsed: ParsedResume): string {
  const lines: string[] = [
    parsed.candidate.name,
    [parsed.candidate.email, parsed.candidate.phone, parsed.candidate.location].filter(Boolean).join(' | '),
    parsed.summary ?? '',
    '',
  ];
  for (const exp of parsed.experience) {
    lines.push(`${exp.job_title} — ${exp.company} (${exp.start_date} - ${exp.is_current ? 'Present' : exp.end_date ?? ''})`);
    for (const a of exp.achievements) lines.push(`- ${a.text}`);
    lines.push('');
  }
  if (parsed.skills.length > 0) lines.push('Skills: ' + parsed.skills.join(', '));
  for (const edu of parsed.education) {
    lines.push(`${edu.degree}${edu.field ? `, ${edu.field}` : ''} — ${edu.institution}`);
  }
  for (const cert of parsed.certifications) {
    lines.push(`${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}`);
  }
  return lines.filter(Boolean).join('\n');
}

const STEPS = [
  { id: 'template', label: 'Template', icon: LayoutTemplate },
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'certifications', label: 'Certifications', icon: Award },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const SKIPPABLE_STEPS = new Set<StepId>(['experience', 'education', 'certifications']);

export default function ResumeBuilderWizard({ redirectOnSaveTo }: ResumeBuilderWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [template, setTemplate] = useState<ResumeTemplate | null>(null);
  const [parsed, setParsed] = useState<ParsedResume>(emptyParsedResume());
  const [rewritingKey, setRewritingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(() => buildResumeDocumentFromParsedResume(emptyParsedResume(), 'classic'));

  const step = STEPS[stepIndex].id as StepId;

  useEffect(() => {
    const handle = setTimeout(() => {
      setPreviewDoc(buildResumeDocumentFromParsedResume(parsed, template ?? 'classic'));
    }, 500);
    return () => clearTimeout(handle);
  }, [parsed, template]);

  const update = <K extends keyof ParsedResume>(key: K, value: ParsedResume[K]) => {
    setParsed((prev) => ({ ...prev, [key]: value }));
  };

  const rewrite = async (key: string, text: string, fieldType: 'summary' | 'bullet', apply: (rewritten: string) => void) => {
    if (!text.trim()) {
      toast.error('Write something first, then I can polish it');
      return;
    }
    setRewritingKey(key);
    try {
      const jobTitle = parsed.experience[0]?.job_title;
      const company = parsed.experience[0]?.company;
      const res = await fetch('/api/resume/rewrite-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fieldType, jobTitle, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rewrite failed');
      apply(data.rewritten);
      toast.success('Rewritten with AI');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rewrite failed');
    } finally {
      setRewritingKey(null);
    }
  };

  const canGoNext = useMemo(() => {
    if (step === 'template') return !!template;
    return true;
  }, [step, template]);

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/resume/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed, rawText: flattenToRawText(parsed), template: template ?? 'classic' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save resume');
      toast.success('Resume saved — Evidence Library is ready');
      if (redirectOnSaveTo) {
        router.push(redirectOnSaveTo);
      } else {
        router.push('/resume');
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Step {stepIndex + 1} of {STEPS.length}
        </p>

        {/* Step tabs */}
        <div className="glass rounded-2xl p-1.5 border border-black/[0.06] flex flex-wrap gap-1">
          {STEPS.map((s, i) => {
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            return (
              <button
                key={s.id}
                onClick={() => setStepIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-md'
                    : isDone
                    ? 'text-brand-primary-dark hover:bg-black/[0.04]'
                    : 'text-gray-500 hover:bg-black/[0.04]'
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {step === 'template' && (
          <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]">
            <h3 className="font-semibold mb-1">Choose a template</h3>
            <p className="text-sm text-gray-500 mb-5">All four are single-column, so they parse cleanly through ATS software.</p>
            <TemplateGallery selected={template} onSelect={setTemplate} />
          </div>
        )}

        {step === 'contact' && (
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" value={parsed.candidate.name} onChange={(v) => update('candidate', { ...parsed.candidate, name: v })} />
              <Field label="Email" value={parsed.candidate.email} onChange={(v) => update('candidate', { ...parsed.candidate, email: v })} />
              <Field label="Phone" value={parsed.candidate.phone ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, phone: v })} />
              <Field label="Location" value={parsed.candidate.location ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, location: v })} />
              <Field label="LinkedIn" value={parsed.candidate.linkedin ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, linkedin: v })} />
              <Field label="Website" value={parsed.candidate.website ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, website: v })} />
            </div>
          </Section>
        )}

        {step === 'summary' && (
          <Section title="Professional Summary">
            <textarea
              value={parsed.summary ?? ''}
              onChange={(e) => update('summary', e.target.value)}
              rows={4}
              placeholder="Write 2-4 sentences about who you are professionally and what you bring…"
              className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary/60 resize-none"
            />
            <RewriteButton
              active={rewritingKey === 'summary'}
              onClick={() => rewrite('summary', parsed.summary ?? '', 'summary', (r) => update('summary', r))}
            />
          </Section>
        )}

        {step === 'experience' && (
          <Section
            title="Experience & Achievements"
            action={
              <button
                onClick={() => update('experience', [...parsed.experience, emptyExperience()])}
                className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-dark"
              >
                <Plus className="w-3.5 h-3.5" /> Add role
              </button>
            }
          >
            {parsed.experience.length === 0 && (
              <p className="text-sm text-gray-400 mb-3">No roles yet — add your first one.</p>
            )}
            <div className="space-y-4">
              {parsed.experience.map((exp, i) => (
                <ExperienceEditor
                  key={i}
                  exp={exp}
                  rewritingKey={rewritingKey}
                  onRewriteBullet={(j, text) =>
                    rewrite(`exp-${i}-${j}`, text, 'bullet', (r) => {
                      const list = [...exp.achievements];
                      list[j] = { ...list[j], text: r };
                      const next = [...parsed.experience];
                      next[i] = { ...exp, achievements: list };
                      update('experience', next);
                    })
                  }
                  rewriteKeyPrefix={`exp-${i}`}
                  onChange={(next) => {
                    const list = [...parsed.experience];
                    list[i] = next;
                    update('experience', list);
                  }}
                  onRemove={() => update('experience', parsed.experience.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 'skills' && (
          <Section title="Skills">
            <textarea
              value={parsed.skills.join(', ')}
              onChange={(e) => update('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              rows={3}
              placeholder="Comma-separated skills, e.g. Python, SQL, Project Management"
              className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary/60 resize-none"
            />
          </Section>
        )}

        {step === 'education' && (
          <Section
            title="Education"
            action={
              <button
                onClick={() => update('education', [...parsed.education, { institution: '', degree: '' }])}
                className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-dark"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }
          >
            {parsed.education.length === 0 && <p className="text-sm text-gray-400 mb-3">No education entries yet.</p>}
            <div className="space-y-3">
              {parsed.education.map((edu, i) => (
                <EducationEditor
                  key={i}
                  edu={edu}
                  onChange={(next) => {
                    const list = [...parsed.education];
                    list[i] = next;
                    update('education', list);
                  }}
                  onRemove={() => update('education', parsed.education.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 'certifications' && (
          <Section
            title="Certifications"
            action={
              <button
                onClick={() => update('certifications', [...parsed.certifications, { name: '' }])}
                className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-dark"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }
          >
            {parsed.certifications.length === 0 && <p className="text-sm text-gray-400 mb-3">No certifications yet.</p>}
            <div className="space-y-3">
              {parsed.certifications.map((cert, i) => (
                <CertificationEditor
                  key={i}
                  cert={cert}
                  onChange={(next) => {
                    const list = [...parsed.certifications];
                    list[i] = next;
                    update('certifications', list);
                  }}
                  onRemove={() => update('certifications', parsed.certifications.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {stepIndex < STEPS.length - 1 ? (
            <div className="flex items-center gap-3">
              {SKIPPABLE_STEPS.has(step) && (
                <button
                  onClick={goNext}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Skip for now — add later
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !parsed.candidate.name}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-50 transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save resume
            </button>
          )}
        </div>
        {stepIndex === STEPS.length - 1 && !parsed.candidate.name && (
          <p className="text-xs text-amber-600 text-right">Add your name in the Contact step before saving.</p>
        )}
      </div>

      {/* Live preview */}
      <div className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)] glass rounded-2xl border border-black/[0.06] overflow-hidden">
        <LivePreview doc={previewDoc} />
      </div>
    </div>
  );
}

function RewriteButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      type="button"
      className="mt-2 flex items-center gap-1.5 text-xs text-brand-primary hover:text-brand-primary-dark disabled:opacity-60 transition-colors"
    >
      {active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      Rewrite with AI
    </button>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <span className="w-1 h-3.5 rounded-full bg-brand-primary" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors"
      />
    </div>
  );
}

function ExperienceEditor({
  exp,
  onChange,
  onRemove,
  onRewriteBullet,
  rewritingKey,
  rewriteKeyPrefix,
}: {
  exp: ParsedExperience;
  onChange: (exp: ParsedExperience) => void;
  onRemove: () => void;
  onRewriteBullet: (bulletIndex: number, text: string) => void;
  rewritingKey: string | null;
  rewriteKeyPrefix: string;
}) {
  return (
    <div className="bg-black/[0.02] border border-black/[0.06] rounded-xl p-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Job title" value={exp.job_title} onChange={(v) => onChange({ ...exp, job_title: v })} />
        <Field label="Company" value={exp.company} onChange={(v) => onChange({ ...exp, company: v })} />
        <Field label="Start date" value={exp.start_date} onChange={(v) => onChange({ ...exp, start_date: v })} />
        <Field
          label="End date"
          value={exp.is_current ? 'Present' : exp.end_date ?? ''}
          onChange={(v) => onChange({ ...exp, end_date: v })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <input type="checkbox" checked={exp.is_current} onChange={(e) => onChange({ ...exp, is_current: e.target.checked })} />
        Current role
      </label>

      <div className="space-y-3">
        {exp.achievements.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <textarea
                value={a.text}
                onChange={(e) => {
                  const list = [...exp.achievements];
                  list[i] = { ...a, text: e.target.value };
                  onChange({ ...exp, achievements: list });
                }}
                rows={2}
                placeholder="Describe an achievement — start with an action verb…"
                className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-brand-primary/60"
              />
              <RewriteButton active={rewritingKey === `${rewriteKeyPrefix}-${i}`} onClick={() => onRewriteBullet(i, a.text)} />
            </div>
            <button
              onClick={() => onChange({ ...exp, achievements: exp.achievements.filter((_, j) => j !== i) })}
              className="text-gray-400 hover:text-red-600 transition-colors mt-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ ...exp, achievements: [...exp.achievements, { text: '', skills: [], metrics: [] }] })}
          className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-dark"
        >
          <Plus className="w-3.5 h-3.5" /> Add achievement
        </button>
      </div>

      <button onClick={onRemove} className="mt-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
        <Trash2 className="w-3.5 h-3.5" /> Remove role
      </button>
    </div>
  );
}

function EducationEditor({
  edu,
  onChange,
  onRemove,
}: {
  edu: ParsedEducation;
  onChange: (edu: ParsedEducation) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-black/[0.02] border border-black/[0.06] rounded-xl p-4 grid grid-cols-2 gap-3">
      <Field label="Institution" value={edu.institution} onChange={(v) => onChange({ ...edu, institution: v })} />
      <Field label="Degree" value={edu.degree} onChange={(v) => onChange({ ...edu, degree: v })} />
      <Field label="Field" value={edu.field ?? ''} onChange={(v) => onChange({ ...edu, field: v })} />
      <Field label="Graduation" value={edu.graduation_date ?? ''} onChange={(v) => onChange({ ...edu, graduation_date: v })} />
      <button onClick={onRemove} className="col-span-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 justify-end">
        <Trash2 className="w-3.5 h-3.5" /> Remove
      </button>
    </div>
  );
}

function CertificationEditor({
  cert,
  onChange,
  onRemove,
}: {
  cert: ParsedCertification;
  onChange: (cert: ParsedCertification) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-black/[0.02] border border-black/[0.06] rounded-xl p-4 grid grid-cols-2 gap-3">
      <Field label="Name" value={cert.name} onChange={(v) => onChange({ ...cert, name: v })} />
      <Field label="Issuer" value={cert.issuer ?? ''} onChange={(v) => onChange({ ...cert, issuer: v })} />
      <button onClick={onRemove} className="col-span-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-600 justify-end">
        <Trash2 className="w-3.5 h-3.5" /> Remove
      </button>
    </div>
  );
}
