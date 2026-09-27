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

  const [fetchingUrl, setFetchingUrl] = useState(false);

  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) {
      toast.error('Paste a job URL first');
      return;
    }
    setFetchingUrl(true);
    try {
      const formData = new FormData();
      formData.append('url', sourceUrl.trim());
      const res = await fetch('/api/jobs/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to fetch job from URL'));
      // If we got a rawText back, pre-fill the textarea; if fully parsed go to review
      if (data.rawText) {
        setPastedText(data.rawText);
        toast.success('Job description fetched! Review and parse.');
      }
      if (data.parsed && data.requirements) {
        setParsed(data.parsed);
        setRequirements(data.requirements);
        setRawText(data.rawText);
        setMode('review');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not fetch from URL');
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleParseText = () => {
    if (pastedText.trim().length < 50) {
      toast.error('Paste the full job description first');
      return;
    }
    const formData = new FormData();
    formData.append('text', pastedText);
    if (sourceUrl) formData.append('url', sourceUrl);
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
          <div className="border border-ink/10 bg-white rounded p-16 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded bg-brand-sea-green flex items-center justify-center mb-4 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="font-medium text-ink">Extracting requirements…</p>
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
              <p className="font-medium text-ink mb-1">Drop a job description file here, or click to browse</p>
              <p className="text-sm text-ink-soft">PDF or DOCX</p>
            </div>

            <div className="flex items-center gap-4 text-ink-muted text-sm uppercase tracking-wider">
              <div className="flex-1 h-px bg-ink/10" />
              or paste text
              <div className="flex-1 h-px bg-ink/10" />
            </div>

            <div className="border border-ink/10 bg-white rounded p-6 space-y-4">
              {/* URL fetch row */}
              <div className="flex gap-2">
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Paste job URL (LinkedIn, Naukri, Indeed…) to auto-fetch"
                  className="flex-1 bg-white border border-ink/20 rounded px-4 py-2.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-brand-sea-green transition-colors"
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={fetchingUrl || !sourceUrl.trim()}
                  className="flex items-center gap-2 bg-brand-aqua hover:bg-opacity-90 disabled:opacity-40 text-white px-4 py-2.5 rounded text-sm font-medium whitespace-nowrap transition-colors"
                >
                  {fetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {fetchingUrl ? 'Fetching…' : 'Fetch JD'}
                </button>
              </div>
              <div className="flex items-center gap-3 text-ink-muted text-xs uppercase tracking-wider">
                <div className="flex-1 h-px bg-ink/10" /> or paste manually <div className="flex-1 h-px bg-ink/10" />
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={10}
                className="w-full bg-white border border-ink/20 rounded p-4 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-brand-sea-green transition-colors resize-none"
              />
              <button
                onClick={handleParseText}
                className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 transition-colors text-white px-5 py-2.5 rounded text-sm font-medium"
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
        <div className="border border-brand-sea-green/20 bg-brand-sea-green/5 rounded p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand-sea-green shrink-0" />
          <p className="text-sm text-ink">Review the extracted requirements before saving and running the match.</p>
        </div>

        <div className="border border-ink/10 bg-white rounded p-6">
          <h3 className="font-semibold text-lg text-ink mb-4 pb-2 border-b border-ink/10">Job Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Title" value={parsed.job_title} onChange={(v) => setParsed({ ...parsed, job_title: v })} />
            <TextField label="Company" value={parsed.company ?? ''} onChange={(v) => setParsed({ ...parsed, company: v })} />
            <TextField label="Location" value={parsed.location ?? ''} onChange={(v) => setParsed({ ...parsed, location: v })} />
            <TextField label="Seniority" value={parsed.seniority ?? ''} onChange={(v) => setParsed({ ...parsed, seniority: v })} />
          </div>
        </div>

        <div className="border border-ink/10 bg-white rounded p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-ink/10">
            <h3 className="font-semibold text-lg text-ink">
              Requirements ({requirements.length})
            </h3>
            <button
              onClick={() => setRequirements([...requirements, { requirement_text: '', category: 'hard_skill', importance: 'medium' }])}
              className="flex items-center gap-1 text-sm text-brand-aqua hover:underline font-medium"
            >
              <Plus className="w-4 h-4" /> Add requirement
            </button>
          </div>
          <div className="space-y-3">
            {requirements.map((req, i) => (
              <div key={i} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-brand-bg/50 border border-ink/10 rounded p-3">
                <input
                  value={req.requirement_text}
                  onChange={(e) => {
                    const list = [...requirements];
                    list[i] = { ...req, requirement_text: e.target.value };
                    setRequirements(list);
                  }}
                  className="flex-1 min-w-[200px] bg-white border border-ink/20 rounded px-2 py-1 text-sm text-ink focus:outline-none focus:border-brand-sea-green"
                />
                
                <select
                  value={req.category}
                  onChange={(e) => {
                    const list = [...requirements];
                    list[i] = { ...req, category: e.target.value as RequirementCategory };
                    setRequirements(list);
                  }}
                  className="w-32 bg-white border border-ink/20 rounded px-2 py-1 text-sm text-ink focus:outline-none"
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
                  className="w-24 bg-white border border-ink/20 rounded px-2 py-1 text-sm text-ink focus:outline-none"
                >
                  {IMPORTANCE.map((imp) => (
                    <option key={imp} value={imp}>{imp}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => setRequirements(requirements.filter((_, j) => j !== i))}
                  className="w-8 flex justify-center text-ink-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-sea-green hover:bg-opacity-90 disabled:opacity-60 transition-colors text-white px-6 py-2.5 rounded text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Save & run match
          </button>
          <button onClick={() => setMode('input')} className="text-sm text-ink-soft hover:text-ink transition-colors">
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
      <label className="block text-xs text-ink-soft mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-ink/20 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-sea-green transition-colors"
      />
    </div>
  );
}
