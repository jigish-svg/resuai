-- CRITICAL FIX: public.profiles has RLS policy "profiles_update_own" which
-- lets any authenticated user UPDATE any column on their own row, including
-- `plan`. RLS is row-level only — it doesn't restrict which columns a policy
-- covers. That means any signed-in user could open their browser console and
-- run, using nothing but the already-public anon key and their own session:
--
--   supabase.from('profiles').update({ plan: 'paid' }).eq('user_id', '<self>')
--
-- ...and it would succeed, unlocking every paid feature for free. No app
-- code needs to have a bug for this — it's a gap in the database grants
-- themselves. `plan` must only ever be changed by trusted server-side code
-- using the service role key (which bypasses RLS/grants entirely), never by
-- a user's own session.
--
-- Fix: explicitly re-grant UPDATE on profiles to only the columns a user
-- should be able to change themselves, omitting `plan` (and identity/system
-- columns) entirely. The service role is unaffected — it already bypasses
-- this.

revoke update on public.profiles from authenticated;

grant update (full_name, email, phone, location, linkedin_url, website)
  on public.profiles to authenticated;
