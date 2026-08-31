-- Adds a genuine skill-gap prep plan to interview_prep (study/practice actions, not fabricated claims)

alter table public.interview_prep
  add column if not exists skill_gaps jsonb not null default '[]'::jsonb;
