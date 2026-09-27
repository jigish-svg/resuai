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
  resumeId?: string;
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
      <div className="border border-ink/10 bg-white rounded p-8 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded bg-brand-sea-green/10 text-brand-sea-green flex items-center justify-center mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-ink">{existingResume.name}</h2>
        <p className="text-sm text-ink-soft mt-2 mb-6 max-w-sm">
          {existingResume.achievementCount} achievements extracted. 
          Upload a new file to rebuild your library.
        </p>
        <button
          onClick={() => setMode('input')}
          className="flex items-center gap-2 border border-ink/10 hover:bg-ink/5 px-4 py-2 rounded text-sm font-medium transition-colors text-ink"
        >
          <Pencil className="w-4 h-4" />
          Replace resume content
        </button>
      </div>
    );
  }

  if (mode === 'input') {
    return (
      <div className="space-y-6">
        {parsing ? (
          <div className="border border-ink/10 bg-white rounded p-16 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded bg-brand-sea-green flex items-center justify-center mb-4 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="font-medium text-ink">Extracting your achievements…</p>
            <p className="text-sm text-ink-soft mt-1">This usually takes 10–20 seconds</p>
          </div>
        ) : (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded p-12 transition-all cursor-pointer text-center ${
                isDragActive ? 'border-brand-sea-green bg-brand-sea-green/5' : 'border-ink/20 hover:border-brand-sea-green/40 hover:bg-ink/5 bg-white'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded bg-brand-sea-green/10 flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-6 h-6 text-brand-sea-green" />
              </div>
              <p className="font-medium text-ink mb-1">Drop your resume here, or click to browse</p>
              <p className="text-sm text-ink-soft">PDF or DOCX</p>
            </div>

            <div className="flex items-center gap-4 text-ink-muted text-sm uppercase tracking-wider">
              <div className="flex-1 h-px bg-ink/10" />
              or paste text
              <div className="flex-1 h-px bg-ink/10" />
            </div>

            <div className="border border-ink/10 bg-white rounded p-6">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your full resume text here…"
                rows={8}
                className="w-full bg-white border border-ink/20 rounded p-4 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-brand-sea-green transition-colors resize-none"
              />
              <button
                onClick={handleParseText}
                className="mt-4 flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 transition-colors text-white px-5 py-2 rounded text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Parse with AI
              </button>
            </div>

            {existingResume && (
              <button onClick={() => setMode('view')} className="text-sm text-ink-soft hover:text-ink transition-colors">
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
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to load skill suggestions'));
        setSuggestedSkills(data.suggestions ?? []);
      })
      .catch((err) => {
        setSuggestedSkills([]);
        toast.error(err instanceof Error ? err.message : 'Failed to load skill suggestions');
      })
      .finally(() => setLoadingSuggestions(false));
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
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Left Navigation */}
      <div className="w-full md:w-48 shrink-0 flex flex-col gap-1 sticky top-8">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted px-2">Sections</div>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-sea-green text-white' : 'text-ink-soft hover:bg-ink/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </div>
              {'count' in tab && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20' : 'bg-ink/10 text-ink-muted'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
        
        <div className="mt-8 px-2 space-y-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand-sea-green hover:bg-opacity-90 disabled:opacity-60 transition-colors text-white px-4 py-2 rounded text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Resume
          </button>
          <button onClick={onBack} className="w-full text-center text-sm text-ink-soft hover:text-ink transition-colors">
            Start over
          </button>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 bg-white border border-ink/10 rounded p-8 min-h-[500px]">
        {activeTab === 'contact' && (
          <Section title="Contact Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={parsed.candidate.name} onChange={(v) => update('candidate', { ...parsed.candidate, name: v })} />
              <Field label="Email" value={parsed.candidate.email} onChange={(v) => update('candidate', { ...parsed.candidate, email: v })} />
              <Field label="Phone" value={parsed.candidate.phone ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, phone: v })} />
              <Field label="Location" value={parsed.candidate.location ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, location: v })} />
              <Field label="LinkedIn" value={parsed.candidate.linkedin ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, linkedin: v })} />
              <Field label="Website" value={parsed.candidate.website ?? ''} onChange={(v) => update('candidate', { ...parsed.candidate, website: v })} />
            </div>
          </Section>
        )}

        {activeTab === 'summary' && (
          <Section title="Professional Summary">
            <textarea
              value={parsed.summary ?? ''}
              onChange={(e) => update('summary', e.target.value)}
              rows={5}
              className="w-full bg-white border border-ink/20 rounded p-3 text-sm text-ink focus:outline-none focus:border-brand-sea-green resize-none"
            />
          </Section>
        )}

        {activeTab === 'experience' && (
          <Section
            title="Experience & Achievements"
            action={
              <button
                onClick={() => update('experience', [...parsed.experience, emptyExperience()])}
                className="flex items-center gap-1 text-xs text-brand-aqua hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add role
              </button>
            }
          >
            <div className="space-y-6">
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

        {activeTab === 'skills' && (
          <Section title="Skills">
            <textarea
              value={parsed.skills.join(', ')}
              onChange={(e) => update('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              rows={4}
              placeholder="Comma-separated skills"
              className="w-full bg-white border border-ink/20 rounded p-3 text-sm text-ink focus:outline-none focus:border-brand-sea-green resize-none"
            />
            {loadingSuggestions && (
              <p className="text-xs text-ink-muted mt-3 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Looking up common skills for your role…
              </p>
            )}
            {!loadingSuggestions && visibleSuggestions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-ink-soft mb-2">
                  Common for your role — click any you <span className="font-medium text-ink">genuinely</span> have:
                </p>
                <div className="flex flex-wrap gap-2">
                  {visibleSuggestions.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addSuggestedSkill(skill)}
                      className="flex items-center gap-1 text-xs border border-brand-sea-green/20 text-brand-sea-green bg-brand-sea-green/5 hover:bg-brand-sea-green/10 px-2.5 py-1 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" /> {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {activeTab === 'education' && (
          <Section
            title="Education"
            action={
              <button
                onClick={() => update('education', [...parsed.education, { institution: '', degree: '' }])}
                className="flex items-center gap-1 text-xs text-brand-aqua hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }
          >
            <div className="space-y-4">
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

        {activeTab === 'certifications' && (
          <Section
            title="Certifications"
            action={
              <button
                onClick={() => update('certifications', [...parsed.certifications, { name: '' }])}
                className="flex items-center gap-1 text-xs text-brand-aqua hover:underline font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }
          >
            <div className="space-y-4">
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
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-ink/10">
        <h3 className="font-semibold text-lg text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-ink-soft mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-ink/20 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-sea-green transition-colors"
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
    <div className="bg-brand-bg/50 border border-ink/10 rounded p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Job title" value={exp.job_title} onChange={(v) => onChange({ ...exp, job_title: v })} />
        <Field label="Company" value={exp.company} onChange={(v) => onChange({ ...exp, company: v })} />
        <Field label="Start date" value={exp.start_date} onChange={(v) => onChange({ ...exp, start_date: v })} />
        <Field
          label="End date"
          value={exp.is_current ? 'Present' : exp.end_date ?? ''}
          onChange={(v) => onChange({ ...exp, end_date: v })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-ink-soft mb-4">
        <input type="checkbox" checked={exp.is_current} onChange={(e) => onChange({ ...exp, is_current: e.target.checked })} />
        Current role
      </label>

      <div className="space-y-3">
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
              className="flex-1 bg-white border border-ink/20 rounded p-2 text-sm text-ink resize-none focus:outline-none focus:border-brand-sea-green"
            />
            <button
              onClick={() => onChange({ ...exp, achievements: exp.achievements.filter((_, j) => j !== i) })}
              className="text-ink-muted hover:text-red-500 transition-colors mt-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange({ ...exp, achievements: [...exp.achievements, { text: '', skills: [], metrics: [] }] })}
          className="flex items-center gap-1 text-xs text-brand-aqua hover:underline font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add achievement
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-ink/10 flex justify-end">
        <button onClick={onRemove} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
          <Trash2 className="w-3.5 h-3.5" /> Remove role
        </button>
      </div>
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
    <div className="bg-brand-bg/50 border border-ink/10 rounded p-4 grid grid-cols-2 gap-4">
      <Field label="Institution" value={edu.institution} onChange={(v) => onChange({ ...edu, institution: v })} />
      <Field label="Degree" value={edu.degree} onChange={(v) => onChange({ ...edu, degree: v })} />
      <Field label="Field" value={edu.field ?? ''} onChange={(v) => onChange({ ...edu, field: v })} />
      <Field label="Graduation" value={edu.graduation_date ?? ''} onChange={(v) => onChange({ ...edu, graduation_date: v })} />
      <div className="col-span-2 pt-2 flex justify-end">
        <button onClick={onRemove} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
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
    <div className="bg-brand-bg/50 border border-ink/10 rounded p-4 grid grid-cols-2 gap-4">
      <Field label="Name" value={cert.name} onChange={(v) => onChange({ ...cert, name: v })} />
      <Field label="Issuer" value={cert.issuer ?? ''} onChange={(v) => onChange({ ...cert, issuer: v })} />
      <div className="col-span-2 pt-2 flex justify-end">
        <button onClick={onRemove} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}
