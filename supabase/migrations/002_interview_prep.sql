-- Interview Prep feature — one generated prep sheet per job

create table if not exists public.interview_prep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  questions_to_ask jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists interview_prep_user_id_idx on public.interview_prep(user_id);
create index if not exists interview_prep_job_id_idx on public.interview_prep(job_id);

alter table public.interview_prep enable row level security;

create policy "interview_prep_select_own" on public.interview_prep for select using (auth.uid() = user_id);
create policy "interview_prep_insert_own" on public.interview_prep for insert with check (auth.uid() = user_id);
create policy "interview_prep_update_own" on public.interview_prep for update using (auth.uid() = user_id);
create policy "interview_prep_delete_own" on public.interview_prep for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.interview_prep;
create trigger set_updated_at before update on public.interview_prep
  for each row execute procedure public.set_updated_at();
