-- Tracks every quiz question a user has already been asked for a given skill,
-- so a retry generates genuinely new questions instead of repeating them.

alter table public.skill_prep_plans
  add column if not exists asked_questions text[] not null default '{}';
