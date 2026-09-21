import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ResumeWorkspace from '@/components/resume/ResumeWorkspace';
import EvidenceUploads from '@/components/resume/EvidenceUploads';
import { getCertificationCourseLink } from '@/lib/certifications/course-links';

const SIGNED_URL_EXPIRY_SECONDS = 3600;

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

  const { data: sections } = await supabase
    .from('resume_sections')
    .select('section_type, content')
    .eq('resume_id', resume.id)
    .in('section_type', ['skills', 'certifications']);

  const skills = (sections?.find((s) => s.section_type === 'skills')?.content as { skills?: string[] } | undefined)?.skills ?? [];
  const certifications = (sections?.find((s) => s.section_type === 'certifications')?.content as { items?: { name: string }[] } | undefined)?.items ?? [];

  const certificationNames = certifications.map((c) => c.name.toLowerCase());
  const uncoveredSkills = skills.filter(
    (skill) => !certificationNames.some((certName) => certName.includes(skill.toLowerCase()) || skill.toLowerCase().includes(certName))
  );

  const { data: uploadRows } = await supabase
    .from('evidence_uploads')
    .select('id, file_path, file_name, description, created_at')
    .eq('resume_id', resume.id)
    .order('created_at', { ascending: false });

  const uploads = await Promise.all(
    (uploadRows ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from('evidence-files')
        .createSignedUrl(row.file_path, SIGNED_URL_EXPIRY_SECONDS);
      return {
        id: row.id,
        fileName: row.file_name,
        description: row.description,
        createdAt: row.created_at,
        viewUrl: signed?.signedUrl ?? null,
      };
    })
  );

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

      {uncoveredSkills.length > 0 && (
        <div className="animate-fade-up glass rounded-2xl p-6 border border-black/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4.5 h-4.5 text-brand-green" />
            <h2 className="font-semibold">Suggested Certifications</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            These skills are on your resume but don&apos;t have a matching certification yet — a free course can help back them up.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {uncoveredSkills.map((skill) => {
              const { url } = getCertificationCourseLink(skill);
              return (
                <a
                  key={skill}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 glass glass-hover rounded-xl px-4 py-3 text-sm"
                >
                  <span className="font-medium text-gray-800">{skill}</span>
                  <span className="flex items-center gap-1 text-brand-green text-xs shrink-0">
                    Free course <ExternalLink className="w-3 h-3" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <EvidenceUploads resumeId={resume.id} initialUploads={uploads} />
    </div>
  );
}
