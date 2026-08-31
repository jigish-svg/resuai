-- Per-user rate limiting for every OpenAI-calling endpoint. Needed once this
-- app is deployed to Vercel: serverless functions are stateless and run as
-- many parallel instances, so an in-memory counter would not work — each
-- instance would have its own counter and the limit would be trivially
-- bypassed. This table + function is shared, persistent state instead.
--
-- The table itself has NO policies for the authenticated/anon roles — only
-- the SECURITY DEFINER function below (and the service role) can touch it.
-- If the table were directly writable by users, a malicious user could just
-- delete their own rows via the client SDK to reset their limit, the same
-- way the `plan` column issue in migration 012 let users bypass billing.

create table if not exists public.api_rate_limits (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_limits_lookup_idx on public.api_rate_limits (user_id, bucket, created_at);

alter table public.api_rate_limits enable row level security;
-- Intentionally no policies here — see note above.

create or replace function public.check_rate_limit(p_bucket text, p_max_requests int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Self-cleaning: drop this user's expired entries for this bucket
  delete from public.api_rate_limits
  where user_id = auth.uid()
    and bucket = p_bucket
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.api_rate_limits
  where user_id = auth.uid()
    and bucket = p_bucket
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max_requests then
    return false;
  end if;

  insert into public.api_rate_limits (user_id, bucket) values (auth.uid(), p_bucket);
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to authenticated;
