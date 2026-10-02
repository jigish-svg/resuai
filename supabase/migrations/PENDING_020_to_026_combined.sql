-- Combined pending migrations 020-026
-- Run this entire file in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste -> Run


-- ============================================================
-- Migration: 020_concepts.sql
-- ============================================================

-- Concept normalization + evidence-model foundations (Phase B).
--
-- Problem: matching relies entirely on an LLM comparing raw requirement text
-- to raw achievement text, with nothing in code preventing false equivalence
-- (e.g. Java vs JavaScript). This adds a small, hand-curated canonical
-- concept dictionary plus columns/functions to normalize requirements and
-- achievement skills against it, and to retrieve achievements by embedding
-- similarity (the vector column has existed since migration 001 but nothing
-- has ever read it back).
--
-- Reference data (concepts/aliases/relations) is global, not per-user: RLS is
-- enabled with a read-only policy for signed-in users; only migrations/admin
-- tooling write to it, matching the read-only intent of a shared dictionary.

-- ─────────────────────────────────────────────────────────────────────────
-- concepts, concept_aliases, concept_relations
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.concepts enable row level security;
create policy "concepts_select_authenticated" on public.concepts for select using (auth.role() = 'authenticated');

create table if not exists public.concept_aliases (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  alias text not null
);

create unique index if not exists concept_aliases_lower_alias_idx on public.concept_aliases (lower(alias));
create index if not exists concept_aliases_concept_id_idx on public.concept_aliases(concept_id);

alter table public.concept_aliases enable row level security;
create policy "concept_aliases_select_authenticated" on public.concept_aliases for select using (auth.role() = 'authenticated');

create table if not exists public.concept_relations (
  id uuid primary key default gen_random_uuid(),
  concept_a_id uuid not null references public.concepts(id) on delete cascade,
  concept_b_id uuid not null references public.concepts(id) on delete cascade,
  relation text not null check (relation in ('equivalent', 'incompatible')),
  check (concept_a_id <> concept_b_id)
);

create index if not exists concept_relations_a_idx on public.concept_relations(concept_a_id);
create index if not exists concept_relations_b_idx on public.concept_relations(concept_b_id);

alter table public.concept_relations enable row level security;
create policy "concept_relations_select_authenticated" on public.concept_relations for select using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────
-- Seed: a small, hand-curated starting dictionary. Not exhaustive by design —
-- aliases must be exact, case-insensitive matches (no fuzzy/substring
-- matching), so false equivalence stays impossible rather than merely rare.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.concepts (canonical_name) values
  ('Python'), ('JavaScript'), ('Java'), ('React'), ('Angular'), ('PostgreSQL'), ('MySQL'),
  ('AWS'), ('Azure'), ('REST API'), ('Machine Learning'), ('PyTorch'), ('Docker'), ('FastAPI')
on conflict (canonical_name) do nothing;

insert into public.concept_aliases (concept_id, alias)
select c.id, a.alias from (values
  ('Python', 'Python'), ('Python', 'Python3'), ('Python', 'Python 3'),
  ('JavaScript', 'JavaScript'), ('JavaScript', 'JS'), ('JavaScript', 'ECMAScript'),
  ('Java', 'Java'),
  ('React', 'React'), ('React', 'React.js'), ('React', 'ReactJS'),
  ('Angular', 'Angular'), ('Angular', 'AngularJS'),
  ('PostgreSQL', 'PostgreSQL'), ('PostgreSQL', 'Postgres'),
  ('MySQL', 'MySQL'),
  ('AWS', 'AWS'), ('AWS', 'Amazon Web Services'),
  ('Azure', 'Azure'), ('Azure', 'Microsoft Azure'),
  ('REST API', 'REST API'), ('REST API', 'RESTful API'), ('REST API', 'REST'),
  ('Machine Learning', 'Machine Learning'), ('Machine Learning', 'ML'),
  ('PyTorch', 'PyTorch'),
  ('Docker', 'Docker'),
  ('FastAPI', 'FastAPI')
) as a(concept_name, alias)
join public.concepts c on c.canonical_name = a.concept_name
on conflict do nothing;

insert into public.concept_relations (concept_a_id, concept_b_id, relation)
select ca.id, cb.id, 'incompatible' from (values
  ('Java', 'JavaScript'),
  ('PostgreSQL', 'MySQL'),
  ('AWS', 'Azure'),
  ('React', 'Angular'),
  ('Python', 'PyTorch')
) as pair(a_name, b_name)
join public.concepts ca on ca.canonical_name = pair.a_name
join public.concepts cb on cb.canonical_name = pair.b_name
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- job_requirements: normalized concept + persisted requirement embedding
-- ─────────────────────────────────────────────────────────────────────────
alter table public.job_requirements
  add column if not exists normalized_concept_id uuid references public.concepts(id) on delete set null,
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text;

-- ─────────────────────────────────────────────────────────────────────────
-- achievements: which concepts each achievement's skills[] resolve to, plus
-- which embedding model produced the stored vector (so it can be safely
-- re-embedded later if the model changes). An achievement can carry several
-- concepts (Python, FastAPI, PostgreSQL, Docker) — never collapsed to one.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.achievements
  add column if not exists concept_ids uuid[] not null default '{}',
  add column if not exists embedding_model text;

create index if not exists achievements_concept_ids_idx on public.achievements using gin (concept_ids);

-- ─────────────────────────────────────────────────────────────────────────
-- match_achievements_by_embedding: DB-side top-K retrieval by cosine
-- distance, using the existing ivfflat index. Called once per requirement
-- from application code instead of pulling every achievement into JS and
-- looping a similarity function in-process.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.match_achievements_by_embedding(
  p_requirement_embedding vector(1536),
  p_resume_id uuid,
  p_limit int default 8
)
returns table (achievement_id uuid, similarity double precision)
language sql
security invoker
stable
set search_path = public, extensions
as $$
  select a.id as achievement_id,
         1 - (a.embedding <=> p_requirement_embedding) as similarity
  from public.achievements a
  where a.resume_id = p_resume_id
    and a.embedding is not null
    and exists (select 1 from public.resumes r where r.id = p_resume_id and r.user_id = auth.uid())
  order by a.embedding <=> p_requirement_embedding
  limit p_limit;
$$;

grant execute on function public.match_achievements_by_embedding(vector, uuid, int) to authenticated;
revoke execute on function public.match_achievements_by_embedding(vector, uuid, int) from public, anon;

-- ─────────────────────────────────────────────────────────────────────────
-- save_resume / save_job: extend the atomic-save functions (migration 019)
-- to persist the new columns. Full function bodies are replaced rather than
-- patched, since Postgres has no "add column to a function" operation.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.save_resume(
  p_resume_id uuid,
  p_resume jsonb,
  p_sections jsonb,
  p_achievements jsonb
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
         'ai_parsed',
         1,
         case when jsonb_typeof(a->'embedding') = 'array' then (a->>'embedding')::vector end,
         a->>'embedding_model',
         coalesce(
           array(select (jsonb_array_elements_text(coalesce(a->'concept_ids', '[]'::jsonb)))::uuid),
           '{}'
         )
  from jsonb_array_elements(coalesce(p_achievements, '[]'::jsonb)) as a;

  return v_resume_id;
end;
$$;

create or replace function public.save_job(p_job jsonb, p_requirements jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_job_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.jobs (
    user_id, title, company, location, job_type, seniority, raw_text, source_url, keywords, status, resume_id
  )
  values (
    v_user,
    p_job->>'title',
    p_job->>'company',
    p_job->>'location',
    p_job->>'job_type',
    p_job->>'seniority',
    p_job->>'raw_text',
    p_job->>'source_url',
    array(select jsonb_array_elements_text(coalesce(p_job->'keywords', '[]'::jsonb))),
    'saved',
    (select id from public.resumes where user_id = v_user and is_master limit 1)
  )
  returning id into v_job_id;

  insert into public.job_requirements (
    job_id, requirement_text, category, importance, is_implied, sort_order,
    normalized_concept_id, embedding, embedding_model
  )
  select v_job_id,
         r->>'requirement_text',
         r->>'category',
         r->>'importance',
         coalesce((r->>'is_implied')::boolean, false),
         (ord - 1)::int,
         nullif(r->>'normalized_concept_id', '')::uuid,
         case when jsonb_typeof(r->'embedding') = 'array' then (r->>'embedding')::vector end,
         r->>'embedding_model'
  from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) with ordinality as t(r, ord);

  return v_job_id;
end;
$$;


-- ============================================================
-- Migration: 021_truth_guard_gate.sql
-- ============================================================

-- Truth Guard as a mandatory server-side gate (Resume Builder Product Contract, Step 1).
--
-- runTruthGuard has existed as callable code since it was added, but was never
-- invoked before a tailored resume was saved, and tailored_resumes.truth_guard_passed
-- has sat unused since it was first added: save_tailored_resume never had a
-- parameter for it. This migration makes /api/tailor/save the single, unbypassable
-- enforcement point: every save now runs Truth Guard server-side against the
-- submitted sections and the master resume, and records the outcome.
--
-- This intentionally does NOT introduce the broader candidate-data lifecycle/
-- provenance model from the locked Product Contract (source: ai_parsed |
-- user_stated | externally_verified) -- that is Step 2. Only the minimum audit
-- trail needed to make this gate real is added here.

alter table public.tailored_resumes
  add column if not exists truth_guard_status text check (truth_guard_status in ('supported', 'needs_review', 'unsupported')),
  add column if not exists truth_guard_flags jsonb,
  add column if not exists truth_guard_confirmed_unsupported boolean not null default false;

-- save_tailored_resume's parameter count is changing, so the old signature must
-- be dropped explicitly -- `create or replace` with a different argument list
-- creates a second overloaded function, not a replacement of the old one.
drop function if exists public.save_tailored_resume(uuid, uuid, uuid, text, jsonb);

create or replace function public.save_tailored_resume(
  p_job_id uuid,
  p_base_resume_id uuid,
  p_match_id uuid,
  p_name text,
  p_sections jsonb,
  p_truth_guard_status text,
  p_truth_guard_flags jsonb,
  p_truth_guard_passed boolean,
  p_truth_guard_confirmed_unsupported boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.jobs where id = p_job_id and user_id = v_user) then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.resumes where id = p_base_resume_id and user_id = v_user) then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;
  if p_match_id is not null and not exists (
    select 1 from public.matches where id = p_match_id and job_id = p_job_id and user_id = v_user
  ) then
    raise exception 'Match does not belong to this job' using errcode = '22023';
  end if;

  select id into v_id
  from public.tailored_resumes
  where job_id = p_job_id and user_id = v_user
  order by created_at asc
  limit 1;

  if v_id is not null then
    update public.tailored_resumes
    set sections = coalesce(p_sections, '[]'::jsonb),
        name = coalesce(nullif(p_name, ''), 'Tailored Resume'),
        match_id = p_match_id,
        truth_guard_status = p_truth_guard_status,
        truth_guard_flags = coalesce(p_truth_guard_flags, '[]'::jsonb),
        truth_guard_passed = p_truth_guard_passed,
        truth_guard_confirmed_unsupported = p_truth_guard_confirmed_unsupported
    where id = v_id;
  else
    insert into public.tailored_resumes (
      user_id, job_id, base_resume_id, match_id, name, sections,
      truth_guard_status, truth_guard_flags, truth_guard_passed, truth_guard_confirmed_unsupported
    )
    values (
      v_user, p_job_id, p_base_resume_id, p_match_id,
      coalesce(nullif(p_name, ''), 'Tailored Resume'),
      coalesce(p_sections, '[]'::jsonb),
      p_truth_guard_status,
      coalesce(p_truth_guard_flags, '[]'::jsonb),
      p_truth_guard_passed,
      p_truth_guard_confirmed_unsupported
    )
    returning id into v_id;
  end if;

  update public.jobs set status = 'ready' where id = p_job_id and user_id = v_user;

  return v_id;
end;
$$;

grant execute on function public.save_tailored_resume(uuid, uuid, uuid, text, jsonb, text, jsonb, boolean, boolean) to authenticated;
revoke execute on function public.save_tailored_resume(uuid, uuid, uuid, text, jsonb, text, jsonb, boolean, boolean) from public, anon;


-- ============================================================
-- Migration: 022_provenance.sql
-- ============================================================

-- Real three-tier provenance (Resume Builder Product Contract, Step 2).
--
-- achievements.source has existed since migration 001 but every save has
-- always hardcoded it to 'ai_parsed', regardless of whether the text came
-- from parsing or was hand-edited by the user. tailored_resumes has no
-- source/provenance column at all. This migration makes both real.
--
-- Nothing in this codebase ever persists a draft or rejected row: an
-- AI-generated draft lives only in an HTTP response and client-side state
-- until a save succeeds, and a blocked Truth Guard save (migration 021)
-- never reaches the RPC at all. Every row that exists in either table is
-- therefore already "accepted" by construction -- there is no in-database
-- draft/rejected state to model, so no `lifecycle` column is added here.

-- ─────────────────────────────────────────────────────────────────────────
-- achievements: real source instead of a hardcoded constant
-- ─────────────────────────────────────────────────────────────────────────
update public.achievements
  set source = 'ai_parsed'
  where source not in ('ai_parsed', 'user_stated', 'externally_verified');

alter table public.achievements drop constraint if exists achievements_source_check;
alter table public.achievements
  add constraint achievements_source_check check (source in ('ai_parsed', 'user_stated', 'externally_verified'));

-- ─────────────────────────────────────────────────────────────────────────
-- tailored_resumes: source + provenance for the confirmed-unsupported path
-- ─────────────────────────────────────────────────────────────────────────
alter table public.tailored_resumes
  add column if not exists source text check (source in ('ai_parsed', 'user_stated', 'externally_verified')),
  add column if not exists provenance jsonb;

-- ─────────────────────────────────────────────────────────────────────────
-- save_resume: accept a real source instead of hardcoding 'ai_parsed'
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.save_resume(
  p_resume_id uuid,
  p_resume jsonb,
  p_sections jsonb,
  p_achievements jsonb,
  p_source text
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
         coalesce(p_source, 'ai_parsed'),
         1,
         case when jsonb_typeof(a->'embedding') = 'array' then (a->>'embedding')::vector end,
         a->>'embedding_model',
         coalesce(
           array(select (jsonb_array_elements_text(coalesce(a->'concept_ids', '[]'::jsonb)))::uuid),
           '{}'
         )
  from jsonb_array_elements(coalesce(p_achievements, '[]'::jsonb)) as a;

  return v_resume_id;
end;
$$;

grant execute on function public.save_resume(uuid, jsonb, jsonb, jsonb, text) to authenticated;
revoke execute on function public.save_resume(uuid, jsonb, jsonb, jsonb, text) from public, anon;

-- Old 4-arg overload from migration 020 is superseded; drop it now that all
-- callers pass p_source.
drop function if exists public.save_resume(uuid, jsonb, jsonb, jsonb);

-- ─────────────────────────────────────────────────────────────────────────
-- save_tailored_resume: source + provenance for the confirmed-unsupported path
-- ─────────────────────────────────────────────────────────────────────────
drop function if exists public.save_tailored_resume(uuid, uuid, uuid, text, jsonb, text, jsonb, boolean, boolean);

create or replace function public.save_tailored_resume(
  p_job_id uuid,
  p_base_resume_id uuid,
  p_match_id uuid,
  p_name text,
  p_sections jsonb,
  p_truth_guard_status text,
  p_truth_guard_flags jsonb,
  p_truth_guard_passed boolean,
  p_truth_guard_confirmed_unsupported boolean,
  p_source text,
  p_provenance jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.jobs where id = p_job_id and user_id = v_user) then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.resumes where id = p_base_resume_id and user_id = v_user) then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;
  if p_match_id is not null and not exists (
    select 1 from public.matches where id = p_match_id and job_id = p_job_id and user_id = v_user
  ) then
    raise exception 'Match does not belong to this job' using errcode = '22023';
  end if;

  select id into v_id
  from public.tailored_resumes
  where job_id = p_job_id and user_id = v_user
  order by created_at asc
  limit 1;

  if v_id is not null then
    update public.tailored_resumes
    set sections = coalesce(p_sections, '[]'::jsonb),
        name = coalesce(nullif(p_name, ''), 'Tailored Resume'),
        match_id = p_match_id,
        truth_guard_status = p_truth_guard_status,
        truth_guard_flags = coalesce(p_truth_guard_flags, '[]'::jsonb),
        truth_guard_passed = p_truth_guard_passed,
        truth_guard_confirmed_unsupported = p_truth_guard_confirmed_unsupported,
        source = p_source,
        provenance = p_provenance
    where id = v_id;
  else
    insert into public.tailored_resumes (
      user_id, job_id, base_resume_id, match_id, name, sections,
      truth_guard_status, truth_guard_flags, truth_guard_passed, truth_guard_confirmed_unsupported,
      source, provenance
    )
    values (
      v_user, p_job_id, p_base_resume_id, p_match_id,
      coalesce(nullif(p_name, ''), 'Tailored Resume'),
      coalesce(p_sections, '[]'::jsonb),
      p_truth_guard_status,
      coalesce(p_truth_guard_flags, '[]'::jsonb),
      p_truth_guard_passed,
      p_truth_guard_confirmed_unsupported,
      p_source,
      p_provenance
    )
    returning id into v_id;
  end if;

  update public.jobs set status = 'ready' where id = p_job_id and user_id = v_user;

  return v_id;
end;
$$;

grant execute on function public.save_tailored_resume(uuid, uuid, uuid, text, jsonb, text, jsonb, boolean, boolean, text, jsonb) to authenticated;
revoke execute on function public.save_tailored_resume(uuid, uuid, uuid, text, jsonb, text, jsonb, boolean, boolean, text, jsonb) from public, anon;


-- ============================================================
-- Migration: 023_per_achievement_provenance.sql
-- ============================================================

-- Fixes a provenance correctness bug from migration 022: save_resume took one
-- p_source value for the whole call, so editing a single field (e.g. phone
-- number) on an update relabeled every achievement -- including untouched,
-- previously-parsed ones -- as user_stated. Provenance describes where a
-- piece of candidate data came from, not the save action that touched the row
-- it lives in, so source must travel per-achievement in p_achievements
-- (exactly like embedding/embedding_model/concept_ids already do), computed
-- by the caller by comparing against the resume's existing achievements.

-- The 5-arg signature from migration 022 (p_resume_id, p_resume, p_sections,
-- p_achievements, p_source) is superseded; source moves inside each element
-- of p_achievements instead, returning the signature to 4 args.
drop function if exists public.save_resume(uuid, jsonb, jsonb, jsonb, text);

create or replace function public.save_resume(
  p_resume_id uuid,
  p_resume jsonb,
  p_sections jsonb,
  p_achievements jsonb
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

  return v_resume_id;
end;
$$;

grant execute on function public.save_resume(uuid, jsonb, jsonb, jsonb) to authenticated;
revoke execute on function public.save_resume(uuid, jsonb, jsonb, jsonb) from public, anon;


-- ============================================================
-- Migration: 024_projects.sql
-- ============================================================

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


-- ============================================================
-- Migration: 025_ai_suggestions.sql
-- ============================================================

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


-- ============================================================
-- Migration: 026_versioning.sql
-- ============================================================

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

