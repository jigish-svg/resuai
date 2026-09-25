-- Atomic multi-row saves (PRD 19: "Multi-row writes happen in one database
-- function or transaction. No delete-then-insert from the client path.").
--
-- Before this, routes issued several separate calls (delete sections, delete
-- achievements, insert sections, insert achievements...). A failure part-way
-- left a resume with no sections, a job with no requirements, a match with no
-- items, or a user with no default resume. Each function below runs in one
-- transaction, so any error rolls every write back.
--
-- All functions are SECURITY INVOKER: the existing row-level security policies
-- still apply to every statement. They also check auth.uid() and ownership
-- explicitly, and never take a user id as an argument.
--
-- search_path includes extensions because the vector type lives there on
-- projects where pgvector was enabled from the dashboard.
--
-- Errors: P0002 = not found or not owned; 22023 = a referenced row does not
-- belong to this job/resume; 42501 = not signed in. The API maps these codes.

-- ─────────────────────────────────────────────────────────────────────────
-- save_resume: create or update a resume with its sections and achievements
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

    -- Replaced in the same transaction, so a failure below restores them.
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
      -- The first resume becomes the default automatically.
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
    resume_id, company, job_title, achievement_text, skills, metrics, dates, source, confidence, embedding
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
         case when jsonb_typeof(a->'embedding') = 'array' then (a->>'embedding')::vector end
  from jsonb_array_elements(coalesce(p_achievements, '[]'::jsonb)) as a;

  return v_resume_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- save_job: a job and its requirements
-- ─────────────────────────────────────────────────────────────────────────
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

  insert into public.job_requirements (job_id, requirement_text, category, importance, is_implied, sort_order)
  select v_job_id,
         r->>'requirement_text',
         r->>'category',
         r->>'importance',
         coalesce((r->>'is_implied')::boolean, false),
         (ord - 1)::int
  from jsonb_array_elements(coalesce(p_requirements, '[]'::jsonb)) with ordinality as t(r, ord);

  return v_job_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- save_match: replace a job's match and its items
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.save_match(
  p_job_id uuid,
  p_resume_id uuid,
  p_match jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_match_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.jobs where id = p_job_id and user_id = v_user) then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.resumes where id = p_resume_id and user_id = v_user) then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  -- Foreign-key checks bypass row-level security, so references are checked
  -- here: every item must point at this job's requirements and this resume's
  -- achievements, never at another user's rows.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i
    where not exists (
      select 1 from public.job_requirements jr
      where jr.id = (i->>'requirement_id')::uuid and jr.job_id = p_job_id
    )
    or (
      i->>'achievement_id' is not null
      and not exists (
        select 1 from public.achievements ach
        where ach.id = (i->>'achievement_id')::uuid and ach.resume_id = p_resume_id
      )
    )
  ) then
    raise exception 'Match item references a row outside this job or resume' using errcode = '22023';
  end if;

  delete from public.matches where job_id = p_job_id and user_id = v_user;

  insert into public.matches (
    user_id, job_id, resume_id, overall_score, label, score_config_version,
    evaluated_count, scored_total, range_low, range_high
  )
  values (
    v_user,
    p_job_id,
    p_resume_id,
    (p_match->>'overall_score')::int,
    p_match->>'label',
    (p_match->>'score_config_version')::int,
    (p_match->>'evaluated_count')::int,
    (p_match->>'scored_total')::int,
    (p_match->>'range_low')::int,
    (p_match->>'range_high')::int
  )
  returning id into v_match_id;

  insert into public.match_items (
    match_id, requirement_id, achievement_id, status, confidence, evidence_text, explanation
  )
  select v_match_id,
         (i->>'requirement_id')::uuid,
         (i->>'achievement_id')::uuid,
         i->>'status',
         i->>'confidence',
         i->>'evidence_text',
         i->>'explanation'
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i;

  update public.jobs set status = 'tailoring' where id = p_job_id and status = 'saved';

  return v_match_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- set_default_resume: move the default flag in one transaction
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_default_resume(p_resume_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.resumes where id = p_resume_id and user_id = v_user) then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  -- Clear first so resumes_one_master_per_user is never violated.
  update public.resumes set is_master = false
  where user_id = v_user and is_master and id <> p_resume_id;

  update public.resumes set is_master = true where id = p_resume_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- delete_resume: delete, and promote another resume if it was the default
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_resume(p_resume_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_was_master boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from public.resumes
  where id = p_resume_id and user_id = v_user
  returning is_master into v_was_master;

  if not found then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  if v_was_master then
    update public.resumes set is_master = true
    where id = (
      select id from public.resumes where user_id = v_user order by created_at asc limit 1
    );
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- save_tailored_resume: upsert the job's tailored resume and mark it ready
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.save_tailored_resume(
  p_job_id uuid,
  p_base_resume_id uuid,
  p_match_id uuid,
  p_name text,
  p_sections jsonb
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
        match_id = p_match_id
    where id = v_id;
  else
    insert into public.tailored_resumes (user_id, job_id, base_resume_id, match_id, name, sections)
    values (
      v_user, p_job_id, p_base_resume_id, p_match_id,
      coalesce(nullif(p_name, ''), 'Tailored Resume'),
      coalesce(p_sections, '[]'::jsonb)
    )
    returning id into v_id;
  end if;

  update public.jobs set status = 'ready' where id = p_job_id and user_id = v_user;

  return v_id;
end;
$$;

grant execute on function public.save_resume(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.save_job(jsonb, jsonb) to authenticated;
grant execute on function public.save_match(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.set_default_resume(uuid) to authenticated;
grant execute on function public.delete_resume(uuid) to authenticated;
grant execute on function public.save_tailored_resume(uuid, uuid, uuid, text, jsonb) to authenticated;

-- Functions are executable by PUBLIC by default; only signed-in users need them.
revoke execute on function public.save_resume(uuid, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.save_job(jsonb, jsonb) from public, anon;
revoke execute on function public.save_match(uuid, uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.set_default_resume(uuid) from public, anon;
revoke execute on function public.delete_resume(uuid) from public, anon;
revoke execute on function public.save_tailored_resume(uuid, uuid, uuid, text, jsonb) from public, anon;
