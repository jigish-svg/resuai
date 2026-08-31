-- Guided skill-gap learning journey: plan -> study materials -> quiz -> pass -> add to resume

create table if not exists public.skill_prep_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  skill text not null,
  what_it_involves text not null default '',
  study_materials jsonb not null default '[]'::jsonb,
  quiz_questions jsonb not null default '[]'::jsonb,
  status text not null default 'not_started' check (status in (
    'not_started', 'studying', 'quiz', 'passed', 'failed', 'added_to_resume'
  )),
  quiz_score integer,
  quiz_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id, skill)
);

create index if not exists skill_prep_plans_user_id_idx on public.skill_prep_plans(user_id);
create index if not exists skill_prep_plans_job_id_idx on public.skill_prep_plans(job_id);

alter table public.skill_prep_plans enable row level security;

create policy "skill_prep_plans_select_own" on public.skill_prep_plans for select using (auth.uid() = user_id);
create policy "skill_prep_plans_insert_own" on public.skill_prep_plans for insert with check (auth.uid() = user_id);
create policy "skill_prep_plans_update_own" on public.skill_prep_plans for update using (auth.uid() = user_id);
create policy "skill_prep_plans_delete_own" on public.skill_prep_plans for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.skill_prep_plans;
create trigger set_updated_at before update on public.skill_prep_plans
  for each row execute procedure public.set_updated_at();
