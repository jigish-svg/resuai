'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DndContext, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import toast from 'react-hot-toast';
import { Building2, GripVertical } from 'lucide-react';
import { JobStatus } from '@/types/job';
import { getScoreColor } from '@/lib/utils';

export interface KanbanJob {
  id: string;
  title: string;
  company: string | null;
  status: JobStatus;
  matchScore: number | null;
}

const COLUMNS: { status: JobStatus; label: string; accent: string }[] = [
  { status: 'saved', label: 'Saved', accent: 'bg-gray-400' },
  { status: 'tailoring', label: 'Tailoring', accent: 'bg-brand-yellow' },
  { status: 'ready', label: 'Ready', accent: 'bg-sky-400' },
  { status: 'applied', label: 'Applied', accent: 'bg-blue-400' },
  { status: 'recruiter_screen', label: 'Recruiter Screen', accent: 'bg-amber-400' },
  { status: 'interview', label: 'Interview', accent: 'bg-emerald-400' },
  { status: 'offer', label: 'Offer', accent: 'bg-fuchsia-400' },
];

export default function JobsKanbanBoard({ initialJobs }: { initialJobs: KanbanJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const jobId = active.id as string;
    const newStatus = over.id as JobStatus;
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;

    const prevStatus = job.status;
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));

    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: prevStatus } : j)));
      toast.error('Failed to update status');
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} accent={col.accent} jobs={jobs.filter((j) => j.status === col.status)} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ status, label, accent, jobs }: { status: JobStatus; label: string; accent: string; jobs: KanbanJob[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-2xl p-3 border transition-all ${
        isOver ? 'border-brand-green/50 bg-brand-green/[0.07] shadow-[0_0_20px_rgba(0,155,77,0.12)]' : 'border-black/[0.06] bg-black/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${accent}`} />
          {label}
        </h3>
        <span className="text-xs text-gray-400 bg-black/[0.03] px-1.5 py-0.5 rounded-md">{jobs.length}</span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, accent }: { job: KanbanJob; accent: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group glass rounded-xl p-3 border border-black/[0.06] hover:border-black/[0.12] hover:shadow-lg hover:shadow-black/20 transition-all relative overflow-hidden ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${accent} opacity-60`} />
      <div className="flex items-start gap-2">
        <button {...listeners} {...attributes} className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </button>
        <Link href={`/match/${job.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{job.title}</p>
          {job.company && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
              <Building2 className="w-3 h-3 shrink-0" /> {job.company}
            </p>
          )}
          {job.matchScore !== null && (
            <p className={`text-xs font-bold mt-1.5 ${getScoreColor(job.matchScore)}`}>{job.matchScore}% match</p>
          )}
        </Link>
      </div>
    </div>
  );
}
