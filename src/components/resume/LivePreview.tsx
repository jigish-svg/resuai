'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { ResumeDocument } from '@/types/export';
import { ResumePDF } from '@/lib/export/pdf-generator';

const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((mod) => mod.PDFViewer), {
  ssr: false,
  loading: () => <PreviewLoading />,
});

function PreviewLoading() {
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}

export default function LivePreview({ doc }: { doc: ResumeDocument }) {
  return (
    <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
      <ResumePDF doc={doc} />
    </PDFViewer>
  );
}
