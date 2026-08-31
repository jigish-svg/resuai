-- Minimal plan/tier scaffold. Real billing (Stripe checkout + webhooks) is a
-- separate follow-up — this just gives feature-gating something to check against.
-- For now, flip a user's plan manually via the Supabase table editor:
--   update public.profiles set plan = 'paid' where user_id = '<uuid>';

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'paid'));
