'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Loader2,
  Sparkles,
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
import { getScoreColor } from '@/lib/utils';

interface Requirement {
  id: string;
  requirement_text: string;
  category: string;
  importance: string;
}

interface MatchSummary {
  overall_score: number;
  skill_score: number;
  responsibility_score: number;
  experience_score: number;
  education_score: number;
  semantic_score: number;
  ats_score: number;
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

export default function TailorEditor({ jobId, jobTitle, jobCompany, requirements, match, initialSections, template }: TailorEditorProps) {
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
      if (!res.ok) throw new Error(data.error || 'Rewrite failed');

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
      if (!res.ok) throw new Error(data.error || 'ATS optimization failed');
      setSections(data.sections);
      setOptimizeResult({ keywords_added: data.keywords_added, keywords_still_missing: data.keywords_still_missing });
      if (data.keywords_added.length > 0) {
        toast.success(`Added ${data.keywords_added.length} keyword${data.keywords_added.length !== 1 ? 's' : ''} using your real experience`);
      } else {
        toast('No new keywords could be honestly added', { icon: 'ℹ️' });
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
      if (!res.ok) throw new Error(data.error || 'Failed to save');
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
      if (!res.ok) throw new Error(data.error || 'Truth Guard check failed');
      setTruthResult(data);
      if (data.passed) {
        toast.success('Truth Guard passed — no unsupported claims found');
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
        // Built in the browser (same renderer as the live preview): rendering it inside a
        // server route breaks under Next's server React build.
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
        throw new Error(data.error || 'Failed to export DOCX');
      }
      downloadBlob(await res.blob(), `${baseName}.docx`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="grid grid-cols-[220px_1fr_300px] gap-6 -m-8 p-8 min-h-[calc(100vh-4rem)]">
      {/* Left: navigation */}
      <div className="space-y-4 animate-fade-up">
        <Link href={`/match/${jobId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to match
        </Link>
        <div className="glass rounded-2xl p-4 border border-black/[0.06] sticky top-24">
          <p className="text-xs text-gray-500 mb-1">{jobCompany}</p>
          <p className="font-semibold text-sm mb-4">{jobTitle}</p>
          <nav className="space-y-1 text-sm">
            {[
              { id: 'header', icon: User },
              { id: 'summary', icon: FileText },
              { id: 'experience', icon: Briefcase },
              { id: 'skills', icon: Wrench },
              { id: 'education', icon: GraduationCap },
              { id: 'certifications', icon: Award },
            ].map(({ id, icon: Icon }) => (
              <a key={id} href={`#section-${id}`} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-gray-500 hover:text-brand-primary-dark hover:bg-brand-primary/[0.08] transition-colors capitalize">
                <Icon className="w-3.5 h-3.5" />
                {id}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Center: editor */}
      <div className="space-y-6 max-w-2xl">
        <section id="section-header" className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors">
          <SectionHeading icon={<User className="w-3.5 h-3.5" />}>Header</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Name" value={header.name} onChange={(v) => setSections(setContent(sections, 'header', { ...header, name: v }))} />
            <TextInput label="Email" value={header.email} onChange={(v) => setSections(setContent(sections, 'header', { ...header, email: v }))} />
            <TextInput label="Phone" value={header.phone ?? ''} onChange={(v) => setSections(setContent(sections, 'header', { ...header, phone: v }))} />
            <TextInput label="Location" value={header.location ?? ''} onChange={(v) => setSections(setContent(sections, 'header', { ...header, location: v }))} />
          </div>
        </section>

        <section id="section-summary" className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors" style={{ animationDelay: '0.05s' }}>
          <SectionHeading icon={<FileText className="w-3.5 h-3.5" />}>Summary</SectionHeading>
          <textarea
            value={summary.text}
            onChange={(e) => setSections(setContent(sections, 'summary', { text: e.target.value }))}
            rows={3}
            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors resize-none"
          />
        </section>

        <section id="section-experience" className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors" style={{ animationDelay: '0.1s' }}>
          <SectionHeading icon={<Briefcase className="w-3.5 h-3.5" />}>Experience</SectionHeading>
          <div className="space-y-5">
            {experienceContent.experiences.map((exp, expIndex) => (
              <div key={expIndex} className="bg-black/[0.02] border border-black/[0.06] hover:border-black/[0.1] transition-colors rounded-xl p-4">
                <p className="font-medium text-sm">{exp.job_title}</p>
                <p className="text-xs text-gray-500 mb-3">{exp.company}</p>
                <div className="space-y-3">
                  {exp.bullets.map((bullet, bulletIndex) => {
                    const key = `${expIndex}-${bulletIndex}`;
                    return (
                      <div key={bulletIndex} className="space-y-1.5">
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
                            className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-brand-primary/60"
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
                            className="text-gray-400 hover:text-red-600 transition-colors mt-2"
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
                          className="text-xs bg-black/[0.03] border border-black/[0.08] rounded-lg px-2 py-1 text-brand-primary-dark"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            {rewritingKey === key ? 'Rewriting…' : '✨ Rewrite for requirement…'}
                          </option>
                          {requirements.map((r) => (
                            <option key={r.id} value={r.requirement_text}>
                              {r.requirement_text.slice(0, 60)}
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
                    className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-dark"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add bullet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="section-skills" className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors" style={{ animationDelay: '0.15s' }}>
          <SectionHeading icon={<Wrench className="w-3.5 h-3.5" />}>Skills</SectionHeading>
          <textarea
            value={skillsContent.skills.join(', ')}
            onChange={(e) => setSections(setContent(sections, 'skills', { skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
            rows={2}
            className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors"
          />
        </section>

        <section id="section-education" className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors" style={{ animationDelay: '0.2s' }}>
          <SectionHeading icon={<GraduationCap className="w-3.5 h-3.5" />}>Education</SectionHeading>
          <div className="space-y-2 text-sm text-gray-700">
            {educationContent.items.map((edu, i) => (
              <p key={i}>{edu.degree}{edu.field ? `, ${edu.field}` : ''} — {edu.institution}</p>
            ))}
          </div>
        </section>

        <section id="section-certifications" className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] hover:border-black/[0.1] transition-colors" style={{ animationDelay: '0.25s' }}>
          <SectionHeading icon={<Award className="w-3.5 h-3.5" />}>Certifications</SectionHeading>
          <div className="space-y-2 text-sm text-gray-700">
            {certsContent.items.map((cert, i) => (
              <p key={i}>{cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}</p>
            ))}
            {certsContent.items.length === 0 && <p className="text-gray-400">None</p>}
          </div>
        </section>
      </div>

      {/* Right: score + actions */}
      <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass rounded-2xl p-5 border border-black/[0.06] sticky top-24 space-y-5 relative overflow-hidden">
          {match && (
            <div className="relative">
              <p className="text-xs text-gray-500 mb-2">Match Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(match.overall_score)}`}>{match.overall_score}%</p>
            </div>
          )}

          <button
            onClick={handleOptimizeATS}
            disabled={optimizing}
            className="relative w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 transition-all px-4 py-2.5 rounded-full font-medium text-sm shadow-lg"
          >
            {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {optimizing ? 'Optimizing…' : 'Optimize for ATS'}
          </button>
          {optimizeResult && (
            <div className="relative -mt-2 text-xs space-y-2">
              {optimizeResult.keywords_added.length > 0 && (
                <div className="bg-success/10 text-success-dark rounded-lg p-2.5">
                  <p className="font-medium mb-1">Added ({optimizeResult.keywords_added.length}):</p>
                  <p>{optimizeResult.keywords_added.join(', ')}</p>
                </div>
              )}
              {optimizeResult.keywords_still_missing.length > 0 && (
                <div className="bg-brand-tertiary-light text-amber-800 rounded-lg p-2.5">
                  <p className="font-medium mb-1">Can&apos;t honestly add — no evidence in your resume:</p>
                  <p>{optimizeResult.keywords_still_missing.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="relative w-full flex items-center justify-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save draft
          </button>

          <div className="relative">
            <button
              onClick={handleTruthGuard}
              disabled={checkingTruth}
              className="w-full flex items-center justify-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-60"
            >
              {checkingTruth ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-success" />}
              Run Truth Guard
            </button>
            {truthResult && (
              <div className={`mt-2 text-xs rounded-lg p-3 ${truthResult.passed ? 'bg-success/10 text-success-dark' : 'bg-red-50 text-red-700'}`}>
                {truthResult.passed ? (
                  <p className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> No unsupported claims found</p>
                ) : (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1 font-medium"><ShieldAlert className="w-3.5 h-3.5" /> {truthResult.flags.length} issue(s) found</p>
                    {truthResult.flags.map((flag, i) => (
                      <p key={i} className="text-gray-700">&ldquo;{flag.text}&rdquo; — {flag.reason}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-60"
            >
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Export PDF
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm disabled:opacity-60"
            >
              {exporting === 'docx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export DOCX
            </button>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-400 pt-2 border-t border-black/[0.06]">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Rewrites only ever use facts and metrics from your master resume.
          </div>
        </div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
      <span className="w-6 h-6 rounded-md bg-brand-primary/15 text-brand-primary flex items-center justify-center">{icon}</span>
      {children}
    </h3>
  );
}
