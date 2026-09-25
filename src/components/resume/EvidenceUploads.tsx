'use client';

import { useRef, useState } from 'react';
import { Paperclip, Loader2, Trash2, ExternalLink, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/api/client';

interface UploadItem {
  id: string;
  fileName: string;
  description: string;
  createdAt: string;
  viewUrl: string | null;
}

interface EvidenceUploadsProps {
  resumeId: string;
  initialUploads: UploadItem[];
}

export default function EvidenceUploads({ resumeId, initialUploads }: EvidenceUploadsProps) {
  const [uploads, setUploads] = useState<UploadItem[]>(initialUploads);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resumeId', resumeId);
      formData.append('description', description);

      const res = await fetch('/api/evidence-uploads', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to upload file'));

      setUploads((prev) => [data.upload, ...prev]);
      setDescription('');
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/evidence-uploads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to delete file'));
      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]">
      <div className="flex items-center gap-2 mb-1">
        <Paperclip className="w-4.5 h-4.5 text-brand-primary" />
        <h2 className="font-semibold">Certificates & Project Files</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Upload certificates or project writeups to keep as supporting evidence alongside this resume.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          className="flex-1 bg-black/[0.02] border border-black/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary/60 focus:bg-white transition-colors"
        />
        <label className="flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark transition-all px-4 py-2.5 rounded-full font-medium text-sm text-white cursor-pointer shrink-0">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          Upload file
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {uploads.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No files uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center justify-between gap-3 glass rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{upload.fileName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {upload.description ? `${upload.description} · ` : ''}
                  {formatDate(upload.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {upload.viewUrl && (
                  <a
                    href={upload.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-primary hover:text-brand-primary-dark transition-colors"
                    title="View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(upload.id)}
                  disabled={deletingId === upload.id}
                  className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  {deletingId === upload.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
