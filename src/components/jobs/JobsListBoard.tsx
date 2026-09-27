'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { JobStatus } from '@/types/job';

export interface ListJob {
  id: string;
  title: string;
  company: string | null;
  status: JobStatus;
  matchScore: number | null;
}

const STAGES: { status: JobStatus; label: string }[] = [
  { status: 'saved', label: 'Saved' },
  { status: 'tailoring', label: 'Tailoring' },
  { status: 'ready', label: 'Ready' },
  { status: 'applied', label: 'Applied' },
  { status: 'recruiter_screen', label: 'Recruiter Screen' },
  { status: 'interview', label: 'Interview' },
  { status: 'offer', label: 'Offer' },
];

export default function JobsListBoard({ initialJobs }: { initialJobs: ListJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;

    setUpdating(jobId);
    const prevStatus = job.status;
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed');
      }
    } catch (e) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: prevStatus } : j)));
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-8">
      {STAGES.map((stage) => {
        const stageJobs = jobs.filter(j => j.status === stage.status);
        if (stageJobs.length === 0) return null;
        
        return (
          <div key={stage.status} className="border border-ink/10 rounded bg-white">
            <div className="bg-brand-bg/50 px-4 py-2 border-b border-ink/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">{stage.label}</h3>
              <span className="text-xs text-ink-muted">{stageJobs.length}</span>
            </div>
            <div className="divide-y divide-ink/5">
              {stageJobs.map((job) => (
                <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-brand-bg/20 transition-colors">
                  <Link href={`/match/${job.id}`} className="flex-[2] min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{job.title}</p>
                    <p className="text-xs text-ink-soft truncate">{job.company}</p>
                  </Link>
                  <div className="flex-[1] mt-2 sm:mt-0 flex items-center gap-4">
                    {job.matchScore !== null && (
                      <span className="text-xs text-ink bg-brand-cream px-2 py-0.5 rounded">
                        Fit {job.matchScore}
                      </span>
                    )}
                  </div>
                  <div className="flex-[1] flex justify-end mt-2 sm:mt-0">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value as JobStatus)}
                      disabled={updating === job.id}
                      className="text-xs bg-brand-sea-green/10 text-brand-sea-green border-none rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-sea-green/50 appearance-none disabled:opacity-50 cursor-pointer"
                    >
                      {STAGES.map((s) => (
                        <option key={s.status} value={s.status}>
                          Move to {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
