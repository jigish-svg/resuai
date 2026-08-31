import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ResumeWorkspace from '@/components/resume/ResumeWorkspace';

export default async function EditResumePage({ params }: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: resume } = await supabase
    .from('resumes')
    .select('id, name, updated_at')
    .eq('id', resumeId)
    .eq('user_id', user!.id)
    .maybeSingle();
  if (!resume) notFound();

  const { count } = await supabase.from('achievements').select('id', { count: 'exact', head: true }).eq('resume_id', resume.id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <Link href="/resume" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to your resumes
        </Link>
        <h1 className="text-3xl font-bold mb-1">{resume.name}</h1>
        <p className="text-gray-500">Every achievement becomes searchable evidence for matching against jobs.</p>
      </div>

      <ResumeWorkspace
        existingResume={{ id: resume.id, name: resume.name, updatedAt: resume.updated_at, achievementCount: count ?? 0 }}
        resumeId={resume.id}
      />
    </div>
  );
}
