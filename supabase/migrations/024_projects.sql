-- Projects as first-class candidate evidence (Resume Builder Product Contract, Step 3).
--
-- The candidate is the source of truth for their own projects, same as any
-- other achievement -- no external verification is required. This table
-- mirrors `achievements` deliberately: same RLS pattern, same per-item
-- provenance model (source computed by the save route, not hardcoded here),
-- same concept_ids column feeding the existing Phase B evidence pipeline.
-- No new fit-score dimension is created; project evidence is surfaced to the
-- matcher the same way skills/certifications already are (see evidence-matcher.ts).

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text not null,
  description text not null default '',
  role text,
  technologies text[] not null default '{}',
  metrics text[] not null default '{}',
  start_date text,
  end_date text,
  link text,
  source text not null default 'ai_parsed' check (source in ('ai_parsed', 'user_stated', 'externally_verified')),
  concept_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_resume_id_idx on public.projects(resume_id);
create index if not exists projects_concept_ids_idx on public.projects using gin (concept_ids);

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects for select using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "projects_insert_own" on public.projects for insert with check (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "projects_update_own" on public.projects for update using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);
create policy "projects_delete_own" on public.projects for delete using (
  exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
);

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();

-- save_resume: adds p_projects, replacing the 4-arg version from migration 023.
drop function if exists public.save_resume(uuid, jsonb, jsonb, jsonb);

create or replace function public.save_resume(
  p_resume_id uuid,
  p_resume jsonb,
  p_sections jsonb,
  p_achievements jsonb,
  p_projects jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_resume_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_resume_id is not null then
    update public.resumes r
    set name = coalesce(nullif(p_resume->>'name', ''), r.name),
        raw_text = p_resume->>'raw_text',
        version = r.version + 1,
        template = coalesce(nullif(p_resume->>'template', ''), r.template),
        candidate_name = p_resume->>'candidate_name',
        candidate_email = p_resume->>'candidate_email',
        candidate_phone = p_resume->>'candidate_phone',
        candidate_location = p_resume->>'candidate_location',
        candidate_linkedin = p_resume->>'candidate_linkedin',
        candidate_website = p_resume->>'candidate_website'
    where r.id = p_resume_id and r.user_id = v_user
    returning r.id into v_resume_id;

    if v_resume_id is null then
      raise exception 'Resume not found' using errcode = 'P0002';
    end if;

    delete from public.resume_sections where resume_id = v_resume_id;
    delete from public.achievements where resume_id = v_resume_id;
    delete from public.projects where resume_id = v_resume_id;
  else
    insert into public.resumes (
      user_id, name, raw_text, is_master, version, template,
      candidate_name, candidate_email, candidate_phone,
      candidate_location, candidate_linkedin, candidate_website
    )
    values (
      v_user,
      coalesce(nullif(p_resume->>'name', ''), p_resume->>'default_name', 'Resume'),
      p_resume->>'raw_text',
      not exists (select 1 from public.resumes where user_id = v_user),
      1,
      coalesce(nullif(p_resume->>'template', ''), 'classic'),
      p_resume->>'candidate_name',
      p_resume->>'candidate_email',
      p_resume->>'candidate_phone',
      p_resume->>'candidate_location',
      p_resume->>'candidate_linkedin',
      p_resume->>'candidate_website'
    )
    returning id into v_resume_id;
  end if;

  insert into public.resume_sections (resume_id, section_type, content, sort_order)
  select v_resume_id,
         s->>'section_type',
         coalesce(s->'content', '{}'::jsonb),
         coalesce((s->>'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) as s;

  insert into public.achievements (
    resume_id, company, job_title, achievement_text, skills, metrics, dates,
    source, confidence, embedding, embedding_model, concept_ids
  )
  select v_resume_id,
         coalesce(a->>'company', ''),
         coalesce(a->>'job_title', ''),
         a->>'achievement_text',
         array(select jsonb_array_elements_text(coalesce(a->'skills', '[]'::jsonb))),
         array(select jsonb_array_elements_text(coalesce(a->'metrics', '[]'::jsonb))),
         a->>'dates',
         coalesce(a->>'source', 'ai_parsed'),
         1,
         case when jsonb_typeof(a->'embedding') = 'array' then (a->>'embedding')::vector end,
         a->>'embedding_model',
         coalesce(
           array(select (jsonb_array_elements_text(coalesce(a->'concept_ids', '[]'::jsonb)))::uuid),
           '{}'
         )
  from jsonb_array_elements(coalesce(p_achievements, '[]'::jsonb)) as a;

  insert into public.projects (
    resume_id, name, description, role, technologies, metrics, start_date, end_date, link, source, concept_ids
  )
  select v_resume_id,
         coalesce(pr->>'name', ''),
         coalesce(pr->>'description', ''),
         pr->>'role',
         array(select jsonb_array_elements_text(coalesce(pr->'technologies', '[]'::jsonb))),
         array(select jsonb_array_elements_text(coalesce(pr->'metrics', '[]'::jsonb))),
         pr->>'start_date',
         pr->>'end_date',
         pr->>'link',
         coalesce(pr->>'source', 'ai_parsed'),
         coalesce(
           array(select (jsonb_array_elements_text(coalesce(pr->'concept_ids', '[]'::jsonb)))::uuid),
           '{}'
         )
  from jsonb_array_elements(coalesce(p_projects, '[]'::jsonb)) as pr;

  return v_resume_id;
end;
$$;

grant execute on function public.save_resume(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
revoke execute on function public.save_resume(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
