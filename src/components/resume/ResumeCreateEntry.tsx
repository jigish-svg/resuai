'use client';

import { useState } from 'react';
import { UploadCloud, LayoutTemplate, ArrowLeft, ArrowRight } from 'lucide-react';
import ResumeWorkspace from './ResumeWorkspace';
import ResumeBuilderWizard from './ResumeBuilderWizard';

interface ResumeCreateEntryProps {
  redirectOnSaveTo?: string;
}

type Mode = 'choose' | 'upload' | 'build';

export default function ResumeCreateEntry({ redirectOnSaveTo }: ResumeCreateEntryProps) {
  const [mode, setMode] = useState<Mode>('choose');

  if (mode === 'upload') {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setMode('choose')} />
        <ResumeWorkspace existingResume={null} redirectOnSaveTo={redirectOnSaveTo} />
      </div>
    );
  }

  if (mode === 'build') {
    return (
      <div className="space-y-4">
        <BackLink onClick={() => setMode('choose')} />
        <ResumeBuilderWizard redirectOnSaveTo={redirectOnSaveTo} />
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <EntryCard
        icon={<UploadCloud className="w-6 h-6" />}
        title="Upload or Paste a Resume"
        description="Already have a resume? Upload a PDF/DOCX or paste the text — AI extracts everything into your Evidence Library."
        onClick={() => setMode('upload')}
      />
      <EntryCard
        icon={<LayoutTemplate className="w-6 h-6" />}
        title="Build from a Template"
        description="Starting from scratch? Pick a proven, ATS-friendly template and fill it in step by step, with AI help polishing your wording."
        onClick={() => setMode('build')}
        highlight
      />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
      <ArrowLeft className="w-3.5 h-3.5" /> Choose a different way to start
    </button>
  );
}

function EntryCard({
  icon,
  title,
  description,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-2xl p-6 border transition-all card-hover flex flex-col ${
        highlight
          ? 'bg-brand-primary/10 border-brand-primary/25'
          : 'glass border-black/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            highlight ? 'bg-brand-primary text-white' : 'bg-black/[0.04] text-brand-primary'
          }`}
        >
          {icon}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </button>
  );
}
