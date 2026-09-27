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
