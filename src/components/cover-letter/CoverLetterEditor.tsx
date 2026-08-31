'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Sparkles, Save, Download, Copy, RotateCcw } from 'lucide-react';

interface CoverLetterEditorProps {
  jobId: string;
  candidateName: string;
  initialContent: string;
}

export default function CoverLetterEditor({ jobId, candidateName, initialContent }: CoverLetterEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate cover letter');
      setContent(data.coverLetter.content);
      toast.success('Cover letter generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/cover-letter/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fileName: `${candidateName.replace(/\s+/g, '_')}_Cover_Letter` }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to export');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidateName.replace(/\s+/g, '_')}_Cover_Letter.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  if (!content) {
    return (
      <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-green/[0.06] rounded-full blur-3xl pointer-events-none" />
        <p className="text-gray-600 mb-6 max-w-md mx-auto relative">
          Generate a cover letter built entirely from your real achievements, focused on this job&apos;s top requirements.
        </p>
        <div className="relative flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white disabled:opacity-60 transition-all px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-green/20"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Writing…' : 'Generate Cover Letter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl p-4 text-sm leading-relaxed focus:outline-none focus:border-brand-green/60 focus:bg-white transition-colors resize-y"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white disabled:opacity-60 transition-all px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-brand-green/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
        <button onClick={handleCopy} className="flex items-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm text-gray-700">
          <Copy className="w-4 h-4" /> Copy
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 glass glass-hover px-4 py-2.5 rounded-xl font-medium text-sm text-gray-700 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export DOCX
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors px-2 disabled:opacity-60"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Regenerate
        </button>
      </div>
    </div>
  );
}
