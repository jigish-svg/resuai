import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS entirely — never import this into
 * anything that runs in the browser, and never use it to act on data based
 * on unverified client input. Only for trusted server-side operations that
 * genuinely need to act outside a user's own row-level permissions, such as
 * deleting an auth.users row (which normal user sessions cannot do).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
