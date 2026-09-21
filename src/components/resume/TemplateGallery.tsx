import { Check } from 'lucide-react';
import { ResumeTemplate } from '@/types/resume';

const TEMPLATES: { id: ResumeTemplate; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Centered serif header, traditional layout — the safe, timeless choice.' },
  { id: 'modern', name: 'Modern', description: 'Clean sans-serif with a brand accent color on headings.' },
  { id: 'minimal', name: 'Minimal ATS-Safe', description: 'Plain black & white, zero styling flourishes — maximum ATS compatibility.' },
  { id: 'compact', name: 'Compact', description: 'Tighter spacing and smaller type to fit more content on one page.' },
];

interface TemplateGalleryProps {
  selected: ResumeTemplate | null;
  onSelect: (template: ResumeTemplate) => void;
}

export default function TemplateGallery({ selected, onSelect }: TemplateGalleryProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`group text-left rounded-2xl border p-4 transition-all card-hover ${
            selected === t.id
              ? 'border-brand-primary/50 bg-brand-primary/5 shadow-lg'
              : 'glass border-black/[0.06] hover:border-black/[0.14]'
          }`}
        >
          <div className="relative rounded-xl bg-white border border-black/[0.08] p-3 mb-3 aspect-[3/4] overflow-hidden">
            {selected === t.id && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}
            <TemplateThumbnail template={t.id} />
          </div>
          <p className="font-semibold text-sm text-gray-900">{t.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.description}</p>
        </button>
      ))}
    </div>
  );
}

function TemplateThumbnail({ template }: { template: ResumeTemplate }) {
  const line = (widthPct: number, opts?: { color?: string; h?: number }) => (
    <div
      className="rounded-sm"
      style={{ width: `${widthPct}%`, height: opts?.h ?? 3, background: opts?.color ?? '#d4d4d8' }}
    />
  );

  if (template === 'modern') {
    return (
      <div className="flex flex-col gap-1.5 h-full">
        <div className="flex flex-col gap-1 mb-1.5">
          {line(55, { color: '#009B4D', h: 5 })}
          {line(75, { h: 2 })}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1 mb-1">
            <div className="flex items-center gap-1">
              <div style={{ width: 3, height: 10, background: '#009B4D' }} />
              {line(40, { color: '#009B4D' })}
            </div>
            {line(90)}
            {line(80)}
            {line(70)}
          </div>
        ))}
      </div>
    );
  }

  if (template === 'minimal') {
    return (
      <div className="flex flex-col gap-1.5 h-full">
        <div className="flex flex-col gap-1 mb-1.5">
          {line(50, { color: '#18181b', h: 5 })}
          {line(70, { h: 2 })}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1 mb-1.5">
            {line(35, { color: '#18181b', h: 3 })}
            {line(90)}
            {line(80)}
            {line(65)}
          </div>
        ))}
      </div>
    );
  }

  if (template === 'compact') {
    return (
      <div className="flex flex-col gap-1 h-full">
        <div className="flex flex-col gap-0.5 mb-1">
          {line(45, { color: '#18181b', h: 4 })}
          {line(65, { h: 1.5 })}
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-0.5 mb-0.5">
            {line(30, { color: '#18181b', h: 2 })}
            {line(85, { h: 1.5 })}
            {line(75, { h: 1.5 })}
          </div>
        ))}
      </div>
    );
  }

  // classic
  return (
    <div className="flex flex-col items-center gap-1.5 h-full">
      <div className="flex flex-col items-center gap-1 mb-1.5">
        {line(50, { color: '#18181b', h: 5 })}
        {line(60, { h: 2 })}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1 mb-1 w-full">
          <div className="w-full border-b border-black/20 mb-0.5" />
          {line(90)}
          {line(80)}
          {line(70)}
        </div>
      ))}
    </div>
  );
}
