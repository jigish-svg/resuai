import JobIntakeWorkspace from '@/components/jobs/JobIntakeWorkspace';

export default function NewJobPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Add a <span className="gradient-text">Job</span></h1>
        <p className="text-gray-500">Paste or upload a job description. We&apos;ll extract requirements and run a match against your resume.</p>
      </div>
      <JobIntakeWorkspace />
    </div>
  );
}
