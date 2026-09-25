import { NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api/errors';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return unauthorized();
  }

  try {
    // Deleting the auth user cascades to every table referencing it
    // (profiles, resumes, jobs, matches, cover letters, interview prep,
    // skill prep plans, rate-limit records, etc.) via `on delete cascade`.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return apiError('internal_error', 'Failed to delete account. Please try again.');
  }
}
