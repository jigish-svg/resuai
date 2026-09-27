import JobIntakeWorkspace from '@/components/jobs/JobIntakeWorkspace';

export default function NewJobPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Add an Application</h1>
        <p className="text-sm text-ink-soft">Paste or upload a job description. We&apos;ll extract requirements and run a match against your resume.</p>
      </div>
      <JobIntakeWorkspace />
    </div>
  );
}
