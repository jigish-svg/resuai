-- Lets a candidate upload supporting files (certificates, project writeups)
-- as evidence, stored privately per-user in Storage. Objects are keyed
-- "{user_id}/{resume_id}/{uuid}-{filename}" so storage policies can scope
-- access the same way every table here scopes rows to auth.uid().

insert into storage.buckets (id, name, public)
values ('evidence-files', 'evidence-files', false)
on conflict (id) do nothing;

create policy "evidence_files_select_own" on storage.objects for select
  using (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence_files_insert_own" on storage.objects for insert
  with check (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence_files_delete_own" on storage.objects for delete
  using (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.evidence_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  description text not null default '',
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists evidence_uploads_user_id_idx on public.evidence_uploads(user_id);
create index if not exists evidence_uploads_resume_id_idx on public.evidence_uploads(resume_id);

alter table public.evidence_uploads enable row level security;

create policy "evidence_uploads_select_own" on public.evidence_uploads for select using (auth.uid() = user_id);
create policy "evidence_uploads_insert_own" on public.evidence_uploads for insert with check (auth.uid() = user_id);
create policy "evidence_uploads_delete_own" on public.evidence_uploads for delete using (auth.uid() = user_id);
