-- Mock Interview Practice: a turn-based session tied to a job, reusing that
-- job's interview_prep question bank. Same session/status-machine shape as
-- skill_prep_plans.

create table if not exists public.mock_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  interview_prep_id uuid references public.interview_prep(id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  turns jsonb not null default '[]'::jsonb,
  current_index integer not null default 0,
  overall_feedback jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mock_interview_sessions_user_id_idx on public.mock_interview_sessions(user_id);
create index if not exists mock_interview_sessions_job_id_idx on public.mock_interview_sessions(job_id);

alter table public.mock_interview_sessions enable row level security;

create policy "mock_interview_sessions_select_own" on public.mock_interview_sessions for select using (auth.uid() = user_id);
create policy "mock_interview_sessions_insert_own" on public.mock_interview_sessions for insert with check (auth.uid() = user_id);
create policy "mock_interview_sessions_update_own" on public.mock_interview_sessions for update using (auth.uid() = user_id);
create policy "mock_interview_sessions_delete_own" on public.mock_interview_sessions for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.mock_interview_sessions;
create trigger set_updated_at before update on public.mock_interview_sessions
  for each row execute procedure public.set_updated_at();
