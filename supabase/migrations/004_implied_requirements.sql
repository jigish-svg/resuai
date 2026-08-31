-- Marks job requirements that were inferred as conventional/implied for the role type,
-- rather than explicitly stated in the job description text.

alter table public.job_requirements
  add column if not exists is_implied boolean not null default false;
