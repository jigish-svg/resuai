import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { parseJsonBody } from '@/lib/api/parse-body';
import { ResumeIdBody } from '@/lib/api/schemas/common';
import { createClient } from '@/lib/supabase/server';
import { loadConceptDictionary } from '@/lib/concepts/dictionary';
import { normalizeConcept } from '@/lib/concepts/normalize';

export const runtime = 'nodejs';

interface ContentGap {
  type: 'missing_metrics' | 'thin_project';
  message: string;
  refId: string;
}

/**
 * Read-only self-assessment of one resume — no new AI call. Reuses concept
 * ids already computed at save time (Phase B / Step 3) and Step 4's already-
 * persisted suggestions; nothing here re-normalizes text or calls OpenAI.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  const body = await parseJsonBody(request, ResumeIdBody);
  if (!body.ok) return body.response;
  const { resumeId } = body.data;

  try {
    const { data: resume } = await supabase.from('resumes').select('id').eq('id', resumeId).eq('user_id', user.id).maybeSingle();
    if (!resume) {
      return apiError('not_found', 'Resume not found.');
    }

    const [{ data: achievements }, { data: projects }, { data: sections }, { data: suggestions }] = await Promise.all([
      supabase.from('achievements').select('id, metrics, concept_ids').eq('resume_id', resumeId),
      supabase.from('projects').select('id, description, technologies, concept_ids').eq('resume_id', resumeId),
      supabase.from('resume_sections').select('section_type, content').eq('resume_id', resumeId),
      supabase.from('ai_suggestions').select('id, suggestion_type, content').eq('resume_id', resumeId).eq('status', 'pending'),
    ]);

    const dictionary = await loadConceptDictionary(supabase);

    const demonstratedIds = new Set<string>();
    for (const a of achievements ?? []) for (const cid of a.concept_ids ?? []) demonstratedIds.add(cid);
    for (const p of projects ?? []) for (const cid of p.concept_ids ?? []) demonstratedIds.add(cid);
    const demonstrated = [...demonstratedIds].map((cid) => dictionary.conceptIdToName.get(cid)).filter((n): n is string => !!n);

    const skillsSection = (sections ?? []).find((s) => s.section_type === 'skills');
    const listedSkills: string[] = (skillsSection?.content as { skills?: string[] } | undefined)?.skills ?? [];
    const weaklyDemonstrated = listedSkills.filter((skill) => {
      const concept = normalizeConcept(dictionary, skill);
      return !concept || !demonstratedIds.has(concept.conceptId);
    });

    const contentGaps: ContentGap[] = [
      ...(achievements ?? [])
        .filter((a) => (a.metrics ?? []).length === 0)
        .map((a) => ({ type: 'missing_metrics' as const, message: 'This achievement has no measurable outcome.', refId: a.id })),
      ...(projects ?? [])
        .filter((p) => (p.technologies ?? []).length === 0 || (p.description ?? '').length < 20)
        .map((p) => ({ type: 'thin_project' as const, message: 'This project is missing technologies or a fuller description.', refId: p.id })),
    ];

    return NextResponse.json({
      demonstrated,
      weaklyDemonstrated,
      contentGaps,
      recommendations: (suggestions ?? []).map((s) => ({ id: s.id, type: s.suggestion_type, content: s.content })),
    });
  } catch (error) {
    console.error('Resume gap analysis error:', error);
    return apiError('internal_error', 'Failed to load gap analysis. Please try again.');
  }
}
