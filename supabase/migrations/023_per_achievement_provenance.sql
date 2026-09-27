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
