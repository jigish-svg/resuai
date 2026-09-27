-- Versioning + autosave (Resume Builder Product Contract, Step 8).
--
-- A version is a meaningful saved state (upload, manual save, tailoring
-- acceptance, restore) -- never one row per keystroke. Autosave is a
-- completely separate, single-row-per-resume table that protects in-progress
-- work and is never promoted to a version automatically.

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  label text not null,
  snapshot jsonb not null,
  created_by_action text not null check (created_by_action in ('upload', 'manual_save', 'tailor_accept', 'restore')),
  created_at timestamptz not null default now()
);

create index if not exists resume_versions_resume_id_idx on public.resume_versions(resume_id, created_at desc);

alter table public.resume_versions enable row level security;

create policy "resume_versions_select_own" on public.resume_versions for select using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "resume_versions_insert_own" on public.resume_versions for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);

create table if not exists public.resume_autosave_state (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null unique references public.resumes(id) on delete cascade,
  draft jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.resume_autosave_state enable row level security;

create policy "resume_autosave_state_select_own" on public.resume_autosave_state for select using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "resume_autosave_state_insert_own" on public.resume_autosave_state for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "resume_autosave_state_update_own" on public.resume_autosave_state for update using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);

drop trigger if exists set_updated_at on public.resume_autosave_state;
create trigger set_updated_at before update on public.resume_autosave_state
  for each row execute procedure public.set_updated_at();
