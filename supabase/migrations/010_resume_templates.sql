-- Lets a resume profile carry a chosen visual template, used when exporting
-- to PDF and for the live preview in the "build from a template" flow.

alter table public.resumes
  add column if not exists template text not null default 'classic'
  check (template in ('classic', 'modern', 'minimal', 'compact'));
