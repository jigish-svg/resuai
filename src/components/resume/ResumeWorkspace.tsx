'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  UploadCloud,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Pencil,
  User,
  FileText,
  Briefcase,
  Wrench,
  GraduationCap,
  Award,
} from 'lucide-react';
import { ParsedResume, ParsedExperience, ParsedEducation, ParsedCertification } from '@/types/resume';
import { apiErrorMessage } from '@/lib/api/client';

interface ResumeWorkspaceProps {
  existingResume: {
    id: string;
    name: string;
    updatedAt: string;
    achievementCount: number;
  } | null;
  /** When editing a specific existing profile, its id — saves update this resume in place. */
  resumeId?: string;
  /** Where to navigate after a successful save. Omit to stay and refresh in place. */
  redirectOnSaveTo?: string;
}

type Mode = 'view' | 'input' | 'review';

function emptyExperience(): ParsedExperience {
  return { company: '', job_title: '', start_date: '', end_date: '', is_current: false, achievements: [] };
}

export default function ResumeWorkspace({ existingResume, resumeId, redirectOnSaveTo }: ResumeWorkspaceProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(existingResume ? 'view' : 'input');
  const [pastedText, setPastedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [rawText, setRawText] = useState('');

  const parseFromFormData = async (formData: FormData) => {
    setParsing(true);
    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to parse resume'));
      setParsed(data.parsed);
      setRawText(data.rawText);
      setMode('review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse resume');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    parseFromFormData(formData);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const handleParseText = () => {
    if (pastedText.trim().length < 50) {
      toast.error('Paste your full resume text first');
      return;
    }
    const formData = new FormData();
    formData.append('text', pastedText);
    parseFromFormData(formData);
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/resume/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed, rawText, resumeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to save resume'));
      toast.success('Resume saved — Evidence Library is ready');
      if (redirectOnSaveTo) {
        router.push(redirectOnSaveTo);
      } else {
        router.refresh();
        setMode('view');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'view' && existingResume) {
    return (
      <div className="animate-fade-up glass rounded-2xl p-8 border border-black/[0.06] relative overflow-hidden">
        <div className="flex items-center gap-4 mb-6 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{existingResume.name}</h2>
            <p className="text-gray-500 text-sm">
              {existingResume.achievementCount} achievements in your Evidence Library · Updated{' '}
              {new Date(existingResume.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <p className="text-gray-700 mb-6 relative">
          This resume is set up. Re-upload or re-paste to replace it — the Evidence Library will be rebuilt from
          the new content.
        </p>
        <button
          onClick={() => setMode('input')}
          className="relative flex items-center gap-2 glass glass-hover px-5 py-2.5 rounded-xl text-sm font-medium"
        >
          <Pencil className="w-4 h-4" />
          Replace this resume
        </button>
      </div>
    );
  }

  if (mode === 'input') {
    return (
      <div className="space-y-6">
        {parsing ? (
          <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
            <div className="relative w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center mb-5 shadow-lg">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
            <p className="font-medium relative">Extracting your achievements…</p>
            <p className="text-sm text-gray-500 mt-1 relative">This usually takes 10–20 seconds</p>
          </div>
        ) : (
          <>
            <div
              {...getRootProps()}
              className={`animate-fade-up glass rounded-2xl p-12 border-2 border-dashed transition-all cursor-pointer text-center ${
                isDragActive ? 'border-brand-primary bg-brand-primary/5 scale-[1.01]' : 'border-black/[0.1] hover:border-brand-primary/40 hover:bg-black/[0.02]'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 border border-brand-primary/20 flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-7 h-7 text-brand-primary" />
              </div>
              <p className="font-medium mb-1">Drop your resume here, or click to browse</p>
              <p className="text-sm text-gray-500">PDF or DOCX</p>
            </div>

            <div className="flex items-center gap-4 text-gray-400 text-sm animate-fade-up" style={{ animationDelay: '0.08s' }}>
              <div className="flex-1 h-px bg-black/[0.08]" />
              or paste text
              <div className="flex-1 h-px bg-black/[0.08]" />
            </div>

            <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]" style={{ animationDelay: '0.14s' }}>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your full resume text here…"
                rows={10}
                className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-4 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors resize-none"
              />
              <button
                onClick={handleParseText}
                className="mt-4 flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Parse with AI
              </button>
            </div>

            {existingResume && (
              <button onClick={() => setMode('view')} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                ← Cancel
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  if (mode === 'review' && parsed) {
    return (
      <ReviewEditor
        parsed={parsed}
        setParsed={setParsed}
        saving={saving}
        onSave={handleSave}
        onBack={() => setMode('input')}
      />
    );
  }

  return null;
}

function ReviewEditor({
  parsed,
  setParsed,
  saving,
  onSave,
  onBack,
}: {
  parsed: ParsedResume;
  setParsed: (p: ParsedResume) => void;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  const update = <K extends keyof ParsedResume>(key: K, value: ParsedResume[K]) => {
    setParsed({ ...parsed, [key]: value });
  };

  const updateExperience = (index: number, exp: ParsedExperience) => {
    const next = [...parsed.experience];
    next[index] = exp;
    update('experience', next);
  };

  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const jobTitles = Array.from(new Set(parsed.experience.map((e) => e.job_title).filter(Boolean)));
    if (jobTitles.length === 0) return;

    setLoadingSuggestions(true);
    fetch('/api/resume/suggest-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitles, currentSkills: parsed.skills }),
    })
      .then((res) => res.json())
      .then((data) => setSuggestedSkills(data.suggestions ?? []))
      .catch(() => setSuggestedSkills([]))
      .finally(() => setLoadingSuggestions(false));
    // Only fetch once when the reviewer first loads, based on the initially-parsed titles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSuggestedSkill = (skill: string) => {
    update('skills', [...parsed.skills, skill]);
    setSuggestedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const visibleSuggestions = suggestedSkills.filter(
    (s) => !parsed.skills.some((existing) => existing.toLowerCase() === s.toLowerCase())
  );

  const TABS = [
    { id: 'contact', label: 'Contact', icon: User },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'experience', label: 'Experience', icon: Briefcase, count: parsed.experience.length },
    { id: 'skills', label: 'Skills', icon: Wrench, count: parsed.skills.length },
    { id: 'education', label: 'Education', icon: GraduationCap, count: parsed.education.length },
    { id: 'certifications', label: 'Certifications', icon: Award, count: parsed.certifications.length },
  ] as const;
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('contact');

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4 border border-brand-primary/20 bg-brand-primary/5 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-brand-primary shrink-0" />
        <p className="text-sm text-gray-700">
          Review what the AI extracted before saving. Fix anything that&apos;s wrong — this becomes your Evidence Library.
        </p>
      </div>

      {/* Section tabs */}
      <div className="glass rounded-2xl p-1.5 border border-black/[0.06] flex flex-wrap gap-1 sticky top-4 z-10">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-primary text-white shadow-md' : 'text-gray-600 hover:bg-black/[0.04]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {'count' in tab && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-black/[0.06] text-gray-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Candidate info */}
      {activeTab === 'contact' && (
        <Section title="Contact Information">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={parsed.candidate.name} onChange={(v) => update('candidate', { ...parsed.candidate, name: v })} />
            <Field label="Email" value={parsed.candidate.email} onChange={(v) => update('candidate', { ...parsed.candidate, email: v })} />
            <Field label="Phone" value={parsed.candidate.phone ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, phone: v })} />
            <Field label="Location" value={parsed.candidate.location ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, location: v })} />
            <Field label="LinkedIn" value={parsed.candidate.linkedin ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, linkedin: v })} />
            <Field label="Website" value={parsed.candidate.website ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, website: v })} />
          </div>
        </Section>
      )}

      {/* Summary */}
      {activeTab === 'summary' && (
        <Section title="Professional Summary">
          <textarea
            value={parsed.summary ?? ''}
            onChange={(e) => update('summary', e.target.value)}
            rows={3}
            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary/60 resize-none"
          />
        </Section>
      )}

      {/* Experience */}
      {activeTab === 'experience' && (
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
          <div className="space-y-4">
            {parsed.experience.map((exp, i) => (
              <ExperienceEditor
                key={i}
                exp={exp}
                onChange={(next) => updateExperience(i, next)}
                onRemove={() => update('experience', parsed.experience.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Skills */}
      {activeTab === 'skills' && (
        <Section title="Skills">
          <textarea
            value={parsed.skills.join(', ')}
            onChange={(e) => update('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            rows={2}
            placeholder="Comma-separated skills"
            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary/60 resize-none"
          />
          {loadingSuggestions && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Looking up common skills for your role…
            </p>
          )}
          {!loadingSuggestions && visibleSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">
                Common for your role — click any you <span className="font-medium">genuinely</span> have to add it:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleSuggestions.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSuggestedSkill(skill)}
                    className="flex items-center gap-1 text-xs border border-dashed border-brand-primary/40 text-brand-primary-dark bg-brand-primary/5 hover:bg-brand-primary/10 px-2.5 py-1 rounded-full transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Education */}
      {activeTab === 'education' && (
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

      {/* Certifications */}
      {activeTab === 'certifications' && (
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

      <div className="flex items-center gap-3 sticky bottom-4 glass rounded-2xl p-3 border border-black/[0.08] shadow-2xl shadow-black/40 w-fit">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save master resume
        </button>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4">
          Start over
        </button>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors">
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
}: {
  exp: ParsedExperience;
  onChange: (exp: ParsedExperience) => void;
  onRemove: () => void;
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

      <div className="space-y-2">
        {exp.achievements.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea
              value={a.text}
              onChange={(e) => {
                const list = [...exp.achievements];
                list[i] = { ...a, text: e.target.value };
                onChange({ ...exp, achievements: list });
              }}
              rows={2}
              className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-brand-primary/60"
            />
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
