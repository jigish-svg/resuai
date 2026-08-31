-- Candidate contact identity (name, email, phone, location, linkedin, website)
-- was stored once per USER on public.profiles, shared across every resume
-- profile. That meant saving a second resume for a different identity (e.g.
-- testing) silently overwrote the displayed name/contact info for ALL of a
-- user's other resumes and their jobs, even though each resume's actual
-- experience/skills content stayed correctly separated.
--
-- Move candidate identity onto each resume row so it travels with that
-- specific resume, like everything else already does.

alter table public.resumes
  add column if not exists candidate_name text,
  add column if not exists candidate_email text,
  add column if not exists candidate_phone text,
  add column if not exists candidate_location text,
  add column if not exists candidate_linkedin text,
  add column if not exists candidate_website text;

-- One-time backfill: give existing resumes the current shared profile
-- identity, since that's the best data available for resumes saved before
-- this column existed.
update public.resumes r
set candidate_name = p.full_name,
    candidate_email = p.email,
    candidate_phone = p.phone,
    candidate_location = p.location,
    candidate_linkedin = p.linkedin_url,
    candidate_website = p.website
from public.profiles p
where p.user_id = r.user_id and r.candidate_name is null;
