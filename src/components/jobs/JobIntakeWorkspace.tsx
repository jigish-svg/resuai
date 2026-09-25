'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { UploadCloud, Loader2, Sparkles, Plus, Trash2, ArrowRight } from 'lucide-react';
import { ParsedJobDescription, RequirementCategory, RequirementImportance } from '@/types/job';
import { apiErrorMessage } from '@/lib/api/client';

interface Requirement {
  requirement_text: string;
  category: RequirementCategory;
  importance: RequirementImportance;
  is_implied?: boolean;
}

const CATEGORIES: RequirementCategory[] = [
  'hard_skill', 'soft_skill', 'responsibility', 'experience', 'education', 'certification', 'technology',
];
const IMPORTANCE: RequirementImportance[] = ['critical', 'high', 'medium', 'low'];

const IMPORTANCE_COLORS: Record<RequirementImportance, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-500',
};

export default function JobIntakeWorkspace() {
  const router = useRouter();
  const [mode, setMode] = useState<'input' | 'review'>('input');
  const [pastedText, setPastedText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedJobDescription | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [rawText, setRawText] = useState('');

  const runParse = async (formData: FormData) => {
    setParsing(true);
    try {
      const res = await fetch('/api/jobs/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to parse job description'));
      setParsed(data.parsed);
      setRequirements(data.requirements);
      setRawText(data.rawText);
      setMode('review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse job description');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    runParse(formData);
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
      toast.error('Paste the full job description first');
      return;
    }
    const formData = new FormData();
    formData.append('text', pastedText);
    runParse(formData);
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const res = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed, requirements, rawText, sourceUrl: sourceUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to save job'));
      toast.success('Job saved — running match analysis…');
      router.push(`/match/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save job');
      setSaving(false);
    }
  };

  if (mode === 'input') {
    return (
      <div className="space-y-6">
        {parsing ? (
          <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
            <div className="relative w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center mb-5 shadow-lg">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
            <p className="font-medium relative">Extracting requirements…</p>
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
              <p className="font-medium mb-1">Drop a job description file here, or click to browse</p>
              <p className="text-sm text-gray-500">PDF or DOCX</p>
            </div>

            <div className="flex items-center gap-4 text-gray-400 text-sm animate-fade-up" style={{ animationDelay: '0.08s' }}>
              <div className="flex-1 h-px bg-black/[0.08]" />
              or paste text
              <div className="flex-1 h-px bg-black/[0.08]" />
            </div>

            <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06] space-y-4" style={{ animationDelay: '0.14s' }}>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Job posting URL (optional)"
                className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors"
              />
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={10}
                className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl p-4 text-sm placeholder-gray-400 focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors resize-none"
              />
              <button
                onClick={handleParseText}
                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-5 py-2.5 rounded-full font-medium text-sm shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Parse with AI
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (mode === 'review' && parsed) {
    return (
      <div className="space-y-6">
        <div className="animate-fade-up glass rounded-2xl p-4 border border-brand-primary/20 bg-brand-primary/5 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand-primary shrink-0" />
          <p className="text-sm text-gray-700">Review the extracted requirements before saving and running the match.</p>
        </div>

        <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]" style={{ animationDelay: '0.06s' }}>
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
            <span className="w-1 h-3.5 rounded-full bg-brand-primary" />
            Job Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" value={parsed.job_title} onChange={(v) => setParsed({ ...parsed, job_title: v })} />
            <TextField label="Company" value={parsed.company ?? ''} onChange={(v) => setParsed({ ...parsed, company: v })} />
            <TextField label="Location" value={parsed.location ?? ''} onChange={(v) => setParsed({ ...parsed, location: v })} />
            <TextField label="Seniority" value={parsed.seniority ?? ''} onChange={(v) => setParsed({ ...parsed, seniority: v })} />
          </div>
        </div>

        <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full bg-brand-primary" />
              Requirements ({requirements.length})
            </h3>
            <button
              onClick={() => setRequirements([...requirements, { requirement_text: '', category: 'hard_skill', importance: 'medium' }])}
              className="flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary-dark"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {requirements.map((req, i) => (
              <div key={i} className="group flex items-center gap-2 bg-black/[0.02] border border-black/[0.06] hover:border-black/[0.1] hover:bg-black/[0.02] transition-colors rounded-xl p-3 relative overflow-hidden">
                <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${IMPORTANCE_COLORS[req.importance]}`} />
                <input
                  value={req.requirement_text}
                  onChange={(e) => {
                    const list = [...requirements];
                    list[i] = { ...req, requirement_text: e.target.value };
                    setRequirements(list);
                  }}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
                {req.is_implied && (
                  <span
                    title="Not explicitly stated in the JD — commonly expected for this role, so ATS systems often scan for it anyway"
                    className="shrink-0 text-[10px] uppercase tracking-wide bg-brand-tertiary-light text-amber-700 px-1.5 py-0.5 rounded-md font-medium"
                  >
                    Commonly expected
                  </span>
                )}
                <select
                  value={req.category}
                  onChange={(e) => {
                    const list = [...requirements];
                    list[i] = { ...req, category: e.target.value as RequirementCategory };
                    setRequirements(list);
                  }}
                  className="bg-black/[0.03] border border-black/[0.08] rounded-lg px-2 py-1 text-xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
                <select
                  value={req.importance}
                  onChange={(e) => {
                    const list = [...requirements];
                    list[i] = { ...req, importance: e.target.value as RequirementImportance };
                    setRequirements(list);
                  }}
                  className="bg-black/[0.03] border border-black/[0.08] rounded-lg px-2 py-1 text-xs"
                >
                  {IMPORTANCE.map((imp) => (
                    <option key={imp} value={imp}>{imp}</option>
                  ))}
                </select>
                <button
                  onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 transition-all px-6 py-3 rounded-full font-semibold shadow-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Save & run match
          </button>
          <button onClick={() => setMode('input')} className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4">
            Start over
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary/60"
      />
    </div>
  );
}
