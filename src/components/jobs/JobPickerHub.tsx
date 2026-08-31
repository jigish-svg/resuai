import Link from 'next/link';
import { ArrowRight, Building2, Briefcase } from 'lucide-react';

export interface HubJob {
  id: string;
  title: string;
  company: string | null;
  status: string;
}

interface JobPickerHubProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  jobs: HubJob[];
  hrefPrefix: string;
  emptyMessage: string;
}

export default function JobPickerHub({ title, description, icon, jobs, hrefPrefix, emptyMessage }: JobPickerHubProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-green to-brand-green-dark flex items-center justify-center text-white shadow-lg shadow-brand-green/25">
            {icon}
          </span>
          {title}
        </h1>
        <p className="text-gray-500">{description}</p>
      </div>

      {jobs.length === 0 ? (
        <div className="animate-fade-up glass rounded-2xl p-16 border border-black/[0.06] text-center relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-green/[0.06] rounded-full blur-3xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-black/[0.04] flex items-center justify-center mx-auto mb-5 relative">
            <Briefcase className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-6 max-w-md mx-auto relative">{emptyMessage}</p>
          <div className="relative flex justify-center">
            <Link
              href="/jobs/new"
              className="flex items-center gap-2 bg-gradient-to-r from-brand-green to-brand-green-dark hover:from-brand-green-dark hover:to-brand-green-dark text-white transition-all px-6 py-3 rounded-xl font-semibold shadow-lg shadow-brand-green/20"
            >
              Add a job
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: '0.06s' }}>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`${hrefPrefix}/${job.id}`}
              className="group flex items-center justify-between glass glass-hover rounded-2xl p-4 border border-black/[0.06]"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-black/[0.03] flex items-center justify-center shrink-0 group-hover:bg-brand-green/10 transition-colors">
                  <Briefcase className="w-5 h-5 text-brand-green" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{job.title}</p>
                  {job.company && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                      <Building2 className="w-3 h-3 shrink-0" /> {job.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-black/[0.04] text-gray-600 capitalize">
                  {job.status.replace('_', ' ')}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
