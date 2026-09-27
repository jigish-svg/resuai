-- Recommendation isolation (Resume Builder Product Contract, Step 4).
--
-- A recommendation ("consider learning Docker") is never candidate data and
-- must never silently become one. Today's one suggestion generator
-- (suggestRoleSkills, src/lib/openai/skill-suggestions.ts) returns an
-- ephemeral list with nothing persisted and nothing distinguishing it from
-- candidate-provided content. This table gives recommendations their own
-- home, entirely separate from achievements/projects/resume_sections.
--
-- `matched_by_later_fact` is purely informational: it is set only when the
-- user independently saves a resume whose own skills[] now include the
-- suggested skill. It never itself writes to achievements or any candidate
-- data table -- see resume/save/route.ts.

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  suggestion_type text not null check (suggestion_type in ('skill', 'project', 'certification', 'formatting')),
  content jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'matched_by_later_fact')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_suggestions_resume_lookup_idx on public.ai_suggestions(resume_id, suggestion_type, status);

alter table public.ai_suggestions enable row level security;

create policy "ai_suggestions_select_own" on public.ai_suggestions for select using (auth.uid() = user_id);
create policy "ai_suggestions_insert_own" on public.ai_suggestions for insert with check (auth.uid() = user_id);
create policy "ai_suggestions_update_own" on public.ai_suggestions for update using (auth.uid() = user_id);
create policy "ai_suggestions_delete_own" on public.ai_suggestions for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.ai_suggestions;
create trigger set_updated_at before update on public.ai_suggestions
  for each row execute procedure public.set_updated_at();
