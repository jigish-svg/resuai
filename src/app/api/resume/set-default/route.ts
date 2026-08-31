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
    const { data: resume } = await supabase.from('resumes').select('id').eq('id', resumeId).eq('user_id', user.id).maybeSingle();
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const { error: clearError } = await supabase.from('resumes').update({ is_master: false }).eq('user_id', user.id);
    if (clearError) throw clearError;

    const { error: setError } = await supabase.from('resumes').update({ is_master: true }).eq('id', resumeId);
    if (setError) throw setError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default resume error:', error);
    const message = error instanceof Error ? error.message : 'Failed to set default resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
