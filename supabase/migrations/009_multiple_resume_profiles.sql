-- Allows a user to maintain more than one resume profile (paid feature; free
-- plan stays capped at 1, enforced in the app). Jobs now remember which
-- resume profile they were matched/tailored against, so switching your
-- default resume later doesn't retroactively change existing jobs.

alter table public.jobs
  add column if not exists resume_id uuid references public.resumes(id) on delete set null;

-- Backfill existing jobs to point at whatever is currently the user's master resume
update public.jobs j
set resume_id = r.id
from public.resumes r
where r.user_id = j.user_id and r.is_master = true and j.resume_id is null;

-- Only one resume can be the default ("master") per user at a time
create unique index if not exists resumes_one_master_per_user
  on public.resumes(user_id)
  where is_master = true;
