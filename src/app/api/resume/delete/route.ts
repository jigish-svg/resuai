import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { resumeId }: { resumeId: string } = await request.json();
  if (!resumeId) {
    return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });
  }

  try {
    const { data: resume } = await supabase
      .from('resumes')
      .select('id, is_master')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('resumes').delete().eq('id', resumeId);
    if (deleteError) throw deleteError;

    if (resume.is_master) {
      const { data: another } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (another) {
        await supabase.from('resumes').update({ is_master: true }).eq('id', another.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete resume error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
