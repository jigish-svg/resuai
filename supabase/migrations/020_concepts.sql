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
