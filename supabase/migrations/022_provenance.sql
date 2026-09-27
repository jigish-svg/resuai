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
