create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists cover_letters_user_id_idx on public.cover_letters(user_id);
create index if not exists cover_letters_job_id_idx on public.cover_letters(job_id);

alter table public.cover_letters enable row level security;

create policy "cover_letters_select_own" on public.cover_letters for select using (auth.uid() = user_id);
create policy "cover_letters_insert_own" on public.cover_letters for insert with check (auth.uid() = user_id);
create policy "cover_letters_update_own" on public.cover_letters for update using (auth.uid() = user_id);
create policy "cover_letters_delete_own" on public.cover_letters for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.cover_letters;
create trigger set_updated_at before update on public.cover_letters
  for each row execute procedure public.set_updated_at();
