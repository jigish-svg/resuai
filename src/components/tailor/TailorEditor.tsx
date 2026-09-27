'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Loader2,
  Save,
  Download,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  ArrowLeft,
  User,
  Briefcase,
  Wrench,
  GraduationCap,
  Award,
  Target,
} from 'lucide-react';
import { TailoredSection, TruthGuardFlag } from '@/types/match';
import { ParsedEducation, ParsedCertification, ResumeTemplate } from '@/types/resume';
import { ResumeDocumentExperience } from '@/types/export';
import { apiErrorMessage } from '@/lib/api/client';

interface Requirement {
  id: string;
  requirement_text: string;
  category: string;
  importance: string;
}

interface MatchSummary {
  overall_score: number | null;
  label: string | null;
  score_config_version: number | null;
}

interface HeaderContent {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
}

interface TailorEditorProps {
  jobId: string;
  jobTitle: string;
  jobCompany: string | null;
  requirements: Requirement[];
  match: MatchSummary | null;
  initialSections: TailoredSection[];
  template?: ResumeTemplate;
}

function getContent<T>(sections: TailoredSection[], type: string, fallback: T): T {
  return (sections.find((s) => s.section_type === type)?.content as T) ?? fallback;
}

function setContent(sections: TailoredSection[], type: string, content: unknown): TailoredSection[] {
  const exists = sections.some((s) => s.section_type === type);
  if (exists) {
    return sections.map((s) => (s.section_type === type ? { ...s, content } : s));
  }
  return [...sections, { section_type: type, content, sort_order: sections.length }];
}

export default function TailorEditor({ jobId, jobTitle, jobCompany, requirements, initialSections, template }: TailorEditorProps) {
  const [sections, setSections] = useState<TailoredSection[]>(initialSections);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [checkingTruth, setCheckingTruth] = useState(false);
  const [truthResult, setTruthResult] = useState<{ flags: TruthGuardFlag[]; passed: boolean } | null>(null);
  const [rewritingKey, setRewritingKey] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{ keywords_added: string[]; keywords_still_missing: string[] } | null>(null);

  const header = getContent<HeaderContent>(sections, 'header', { name: '', email: '' });
  const summary = getContent<{ text: string }>(sections, 'summary', { text: '' });
  const experienceContent = getContent<{ experiences: ResumeDocumentExperience[] }>(sections, 'experience', { experiences: [] });
  const skillsContent = getContent<{ skills: string[] }>(sections, 'skills', { skills: [] });
  const educationContent = getContent<{ items: ParsedEducation[] }>(sections, 'education', { items: [] });
  const certsContent = getContent<{ items: ParsedCertification[] }>(sections, 'certifications', { items: [] });

  const updateExperiences = (experiences: ResumeDocumentExperience[]) => {
    setSections((prev) => setContent(prev, 'experience', { experiences }));
  };

  const handleRewrite = async (expIndex: number, bulletIndex: number, requirementText: string) => {
    const key = `${expIndex}-${bulletIndex}`;
    setRewritingKey(key);
    try {
      const originalText = experienceContent.experiences[expIndex].bullets[bulletIndex];
      const res = await fetch('/api/tailor/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText, requirementText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Rewrite failed'));

      const experiences = [...experienceContent.experiences];
      const bullets = [...experiences[expIndex].bullets];
      bullets[bulletIndex] = data.rewritten;
      experiences[expIndex] = { ...experiences[expIndex], bullets };
      updateExperiences(experiences);
      toast.success('Bullet rewritten');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rewrite failed');
    } finally {
      setRewritingKey(null);
    }
  };

  const handleOptimizeATS = async () => {
    setOptimizing(true);
    try {
      const res = await fetch('/api/tailor/optimize-ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, sections }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'ATS optimization failed'));
      setSections(data.sections);
      setOptimizeResult({ keywords_added: data.keywords_added, keywords_still_missing: data.keywords_still_missing });
      if (data.keywords_added.length > 0) {
        toast.success(`Added ${data.keywords_added.length} keywords`);
      } else {
        toast('No new keywords could be honestly added');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ATS optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tailor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, sections, name: `${jobTitle} — Tailored` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to save'));
      toast.success('Tailored resume saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTruthGuard = async () => {
    setCheckingTruth(true);
    try {
      const fullText = [
        header.name,
        summary.text,
        ...experienceContent.experiences.flatMap((e) => e.bullets),
        skillsContent.skills.join(', '),
      ].join('\n');

      const res = await fetch('/api/tailor/truth-guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredText: fullText, jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Truth Guard check failed'));
      setTruthResult(data);
      if (data.passed) {
        toast.success('Truth Guard passed');
      } else {
        toast.error(`Truth Guard flagged ${data.flags.length} issue(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Truth Guard check failed');
    } finally {
      setCheckingTruth(false);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    setExporting(format);
    const baseName = header.name.replace(/\s+/g, '_') || 'resume';
    try {
      if (format === 'pdf') {
        const [{ pdf }, { ResumePDF }, { buildResumeDocumentFromSections }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('@/lib/export/pdf-generator'),
          import('@/lib/export/build-document'),
        ]);
        const doc = buildResumeDocumentFromSections(sections, template);
        const blob = await pdf(<ResumePDF doc={doc} />).toBlob();
        downloadBlob(blob, `${baseName}.pdf`);
        return;
      }

      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, jobId, fileName: baseName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(apiErrorMessage(data, 'Failed to export DOCX'));
      }
      downloadBlob(await res.blob(), `${baseName}.docx`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start py-8">
      {/* Left Navigation */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-1 sticky top-8">
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to match
        </Link>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">{jobCompany}</p>
          <p className="text-sm font-semibold text-ink leading-tight">{jobTitle}</p>
        </div>
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">Sections</div>
        {[
          { id: 'header', icon: User },
          { id: 'summary', icon: FileText },
          { id: 'experience', icon: Briefcase },
          { id: 'skills', icon: Wrench },
          { id: 'education', icon: GraduationCap },
          { id: 'certifications', icon: Award },
        ].map(({ id, icon: Icon }) => (
          <a key={id} href={`#section-${id}`} className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors capitalize">
            <Icon className="w-4 h-4" />
            {id}
          </a>
        ))}
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 max-w-3xl space-y-8">
        <section id="section-header" className="bg-white border border-ink/10 rounded p-8">
          <SectionHeading>Header</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Name" value={header.name} onChange={(v) => setSections(setContent(sections, 'header', { ...header, name: v }))} />
            <TextInput label="Email" value={header.email} onChange={(v) => setSections(setContent(sections, 'header', { ...header, email: v }))} />
            <TextInput label="Phone" value={header.phone ?? ''} onChange={(v) => setSections(setContent(sections, 'header', { ...header, phone: v }))} />
            <TextInput label="Location" value={header.location ?? ''} onChange={(v) => setSections(setContent(sections, 'header', { ...header, location: v }))} />
          </div>
        </section>

        <section id="section-summary" className="bg-white border border-ink/10 rounded p-8">
          <SectionHeading>Summary</SectionHeading>
          <textarea
            value={summary.text}
            onChange={(e) => setSections(setContent(sections, 'summary', { text: e.target.value }))}
            rows={4}
            className="w-full bg-white border border-ink/20 rounded p-3 text-sm text-ink focus:outline-none focus:border-brand-sea-green transition-colors resize-none"
          />
        </section>

        <section id="section-experience" className="bg-white border border-ink/10 rounded p-8">
          <SectionHeading>Experience</SectionHeading>
          <div className="space-y-6">
            {experienceContent.experiences.map((exp, expIndex) => (
              <div key={expIndex} className="bg-brand-bg/50 border border-ink/10 rounded p-4">
                <p className="font-semibold text-sm text-ink">{exp.job_title}</p>
                <p className="text-xs text-ink-soft mb-4">{exp.company}</p>
                <div className="space-y-4">
                  {exp.bullets.map((bullet, bulletIndex) => {
                    const key = `${expIndex}-${bulletIndex}`;
                    return (
                      <div key={bulletIndex} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <textarea
                            value={bullet}
                            onChange={(e) => {
                              const experiences = [...experienceContent.experiences];
                              const bullets = [...experiences[expIndex].bullets];
                              bullets[bulletIndex] = e.target.value;
                              experiences[expIndex] = { ...experiences[expIndex], bullets };
                              updateExperiences(experiences);
                            }}
                            rows={2}
                            className="flex-1 bg-white border border-ink/20 rounded p-2 text-sm text-ink resize-none focus:outline-none focus:border-brand-sea-green"
                          />
                          <button
                            onClick={() => {
                              const experiences = [...experienceContent.experiences];
                              experiences[expIndex] = {
                                ...experiences[expIndex],
                                bullets: experiences[expIndex].bullets.filter((_, j) => j !== bulletIndex),
                              };
                              updateExperiences(experiences);
                            }}
                            className="text-ink-muted hover:text-red-500 transition-colors mt-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <select
                          disabled={rewritingKey === key}
                          onChange={(e) => {
                            if (e.target.value) handleRewrite(expIndex, bulletIndex, e.target.value);
                            e.target.value = '';
                          }}
                          className="w-full sm:w-auto text-xs bg-white border border-ink/20 rounded px-2 py-1 text-brand-sea-green outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            {rewritingKey === key ? 'Rewriting…' : '✨ Rewrite for requirement…'}
                          </option>
                          {requirements.map((r) => (
                            <option key={r.id} value={r.requirement_text}>
                              {r.requirement_text.slice(0, 60)}...
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      const experiences = [...experienceContent.experiences];
                      experiences[expIndex] = { ...experiences[expIndex], bullets: [...experiences[expIndex].bullets, ''] };
                      updateExperiences(experiences);
                    }}
                    className="flex items-center gap-1 text-xs text-brand-aqua hover:underline font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="section-skills" className="bg-white border border-ink/10 rounded p-8">
          <SectionHeading>Skills</SectionHeading>
          <textarea
            value={skillsContent.skills.join(', ')}
            onChange={(e) => setSections(setContent(sections, 'skills', { skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
            rows={3}
            className="w-full bg-white border border-ink/20 rounded p-3 text-sm text-ink focus:outline-none focus:border-brand-sea-green transition-colors resize-none"
          />
        </section>

        <section id="section-education" className="bg-white border border-ink/10 rounded p-8">
          <SectionHeading>Education</SectionHeading>
          <div className="space-y-2 text-sm text-ink">
            {educationContent.items.map((edu, i) => (
              <p key={i}>{edu.degree}{edu.field ? `, ${edu.field}` : ''} — {edu.institution}</p>
            ))}
          </div>
        </section>

        <section id="section-certifications" className="bg-white border border-ink/10 rounded p-8">
          <SectionHeading>Certifications</SectionHeading>
          <div className="space-y-2 text-sm text-ink">
            {certsContent.items.map((cert, i) => (
              <p key={i}>{cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}</p>
            ))}
            {certsContent.items.length === 0 && <p className="text-ink-muted">None</p>}
          </div>
        </section>
      </div>

      {/* Right Navigation / Actions */}
      <div className="w-full md:w-64 shrink-0 space-y-4 sticky top-8">
        <div className="bg-white border border-ink/10 rounded p-5 space-y-4">
          <button
            onClick={handleOptimizeATS}
            disabled={optimizing}
            className="w-full flex items-center justify-center gap-2 bg-brand-sea-green hover:bg-opacity-90 disabled:opacity-60 transition-colors text-white px-4 py-2 rounded text-sm font-medium"
          >
            {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {optimizing ? 'Optimizing…' : 'Optimize for ATS'}
          </button>
          
          {optimizeResult && (
            <div className="text-xs space-y-2 pt-2">
              {optimizeResult.keywords_added.length > 0 && (
                <div className="bg-brand-sea-green/10 text-brand-sea-green rounded p-2">
                  <p className="font-medium mb-1">Added:</p>
                  <p>{optimizeResult.keywords_added.join(', ')}</p>
                </div>
              )}
              {optimizeResult.keywords_still_missing.length > 0 && (
                <div className="bg-brand-brandy/10 text-brand-brandy rounded p-2">
                  <p className="font-medium mb-1">No evidence for:</p>
                  <p>{optimizeResult.keywords_still_missing.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleTruthGuard}
            disabled={checkingTruth}
            className="w-full flex items-center justify-center gap-2 border border-ink/10 hover:bg-ink/5 disabled:opacity-60 transition-colors text-ink px-4 py-2 rounded text-sm font-medium"
          >
            {checkingTruth ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-brand-sea-green" />}
            Run Truth Guard
          </button>
          
          {truthResult && (
            <div className={`text-xs rounded p-2.5 ${truthResult.passed ? 'bg-brand-sea-green/10 text-brand-sea-green' : 'bg-brand-brandy/10 text-brand-brandy'}`}>
              {truthResult.passed ? (
                <p className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Checked: Valid</p>
              ) : (
                <div className="space-y-1">
                  <p className="flex items-center gap-1 font-medium"><ShieldAlert className="w-3.5 h-3.5" /> {truthResult.flags.length} issues</p>
                  {truthResult.flags.map((flag, i) => (
                    <p key={i} className="opacity-90">&ldquo;{flag.text}&rdquo;</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <hr className="border-ink/10" />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 border border-ink/10 hover:bg-ink/5 disabled:opacity-60 transition-colors text-ink px-4 py-2 rounded text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save draft
          </button>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-center gap-2 bg-ink/5 hover:bg-ink/10 disabled:opacity-60 transition-colors text-ink px-4 py-2 rounded text-sm font-medium"
            >
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Export PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-center gap-2 bg-ink/5 hover:bg-ink/10 disabled:opacity-60 transition-colors text-ink px-4 py-2 rounded text-sm font-medium"
            >
              {exporting === 'docx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export DOCX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-lg text-ink mb-6 pb-2 border-b border-ink/10">
      {children}
    </h3>
  );
}
