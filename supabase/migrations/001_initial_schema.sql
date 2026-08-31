-- AI Resume Matcher — initial schema
-- Enables RLS on every table; each user can only ever see their own rows.

create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  website text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- resumes
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Master Resume',
  source_file text,
  raw_text text,
  version integer not null default 1,
  is_master boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);

alter table public.resumes enable row level security;

create policy "resumes_select_own" on public.resumes for select using (auth.uid() = user_id);
create policy "resumes_insert_own" on public.resumes for insert with check (auth.uid() = user_id);
create policy "resumes_update_own" on public.resumes for update using (auth.uid() = user_id);
create policy "resumes_delete_own" on public.resumes for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- resume_sections
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.resume_sections (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  section_type text not null check (section_type in ('summary', 'experience', 'skills', 'education', 'certifications', 'custom')),
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create index if not exists resume_sections_resume_id_idx on public.resume_sections(resume_id);

alter table public.resume_sections enable row level security;

create policy "resume_sections_select_own" on public.resume_sections for select using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "resume_sections_insert_own" on public.resume_sections for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "resume_sections_update_own" on public.resume_sections for update using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "resume_sections_delete_own" on public.resume_sections for delete using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- achievements  (the "Evidence Library")
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  company text not null default '',
  job_title text not null default '',
  achievement_text text not null,
  skills text[] not null default '{}',
  metrics text[] not null default '{}',
  dates text,
  source text not null default 'ai_parsed' check (source in ('upload', 'manual', 'ai_parsed')),
  confidence numeric not null default 1,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists achievements_resume_id_idx on public.achievements(resume_id);
create index if not exists achievements_embedding_idx on public.achievements
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.achievements enable row level security;

create policy "achievements_select_own" on public.achievements for select using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "achievements_insert_own" on public.achievements for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "achievements_update_own" on public.achievements for update using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "achievements_delete_own" on public.achievements for delete using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- jobs
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text,
  location text,
  job_type text,
  seniority text,
  raw_text text not null,
  source_url text,
  keywords text[] not null default '{}',
  status text not null default 'saved' check (status in (
    'saved', 'tailoring', 'ready', 'applied', 'recruiter_screen', 'interview', 'offer', 'rejected', 'withdrawn'
  )),
  deadline timestamptz,
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_status_idx on public.jobs(status);

alter table public.jobs enable row level security;

create policy "jobs_select_own" on public.jobs for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs for update using (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- job_requirements
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  requirement_text text not null,
  category text not null check (category in (
    'hard_skill', 'soft_skill', 'responsibility', 'experience', 'education', 'certification', 'technology'
  )),
  importance text not null check (importance in ('critical', 'high', 'medium', 'low')),
  sort_order integer not null default 0
);

create index if not exists job_requirements_job_id_idx on public.job_requirements(job_id);

alter table public.job_requirements enable row level security;

create policy "job_requirements_select_own" on public.job_requirements for select using (
  exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
);
create policy "job_requirements_insert_own" on public.job_requirements for insert with check (
  exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
);
create policy "job_requirements_update_own" on public.job_requirements for update using (
  exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
);
create policy "job_requirements_delete_own" on public.job_requirements for delete using (
  exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- matches
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  overall_score integer not null default 0,
  skill_score integer not null default 0,
  responsibility_score integer not null default 0,
  experience_score integer not null default 0,
  education_score integer not null default 0,
  semantic_score integer not null default 0,
  ats_score integer not null default 0,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_user_id_idx on public.matches(user_id);
create index if not exists matches_job_id_idx on public.matches(job_id);

alter table public.matches enable row level security;

create policy "matches_select_own" on public.matches for select using (auth.uid() = user_id);
create policy "matches_insert_own" on public.matches for insert with check (auth.uid() = user_id);
create policy "matches_update_own" on public.matches for update using (auth.uid() = user_id);
create policy "matches_delete_own" on public.matches for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- match_items
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.match_items (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  requirement_id uuid not null references public.job_requirements(id) on delete cascade,
  achievement_id uuid references public.achievements(id) on delete set null,
  status text not null check (status in ('matched', 'partial', 'no_evidence')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  evidence_text text,
  explanation text
);

create index if not exists match_items_match_id_idx on public.match_items(match_id);

alter table public.match_items enable row level security;

create policy "match_items_select_own" on public.match_items for select using (
  exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "match_items_insert_own" on public.match_items for insert with check (
  exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "match_items_update_own" on public.match_items for update using (
  exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid())
);
create policy "match_items_delete_own" on public.match_items for delete using (
  exists (select 1 from public.matches m where m.id = match_id and m.user_id = auth.uid())
);

-- ─────────────────────────────────────────────────────────────────────────
-- tailored_resumes
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  base_resume_id uuid not null references public.resumes(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  name text not null default 'Tailored Resume',
  sections jsonb not null default '[]'::jsonb,
  selected_achievement_ids uuid[] not null default '{}',
  ats_score integer,
  truth_guard_passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tailored_resumes_user_id_idx on public.tailored_resumes(user_id);
create index if not exists tailored_resumes_job_id_idx on public.tailored_resumes(job_id);

alter table public.tailored_resumes enable row level security;

create policy "tailored_resumes_select_own" on public.tailored_resumes for select using (auth.uid() = user_id);
create policy "tailored_resumes_insert_own" on public.tailored_resumes for insert with check (auth.uid() = user_id);
create policy "tailored_resumes_update_own" on public.tailored_resumes for update using (auth.uid() = user_id);
create policy "tailored_resumes_delete_own" on public.tailored_resumes for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.resumes;
create trigger set_updated_at before update on public.resumes
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.jobs;
create trigger set_updated_at before update on public.jobs
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.matches;
create trigger set_updated_at before update on public.matches
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at on public.tailored_resumes;
create trigger set_updated_at before update on public.tailored_resumes
  for each row execute procedure public.set_updated_at();
