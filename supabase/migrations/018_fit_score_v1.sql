-- Fit score v1 (PRD section 10). A score can now be absent ("Not enough to
-- score yet"), so overall_score becomes nullable and loses its 0 default,
-- which would otherwise pass off a missing score as a real zero. Column names
-- follow FitAnalysis in PRD section 19, which will replace this table.
-- Rows written before this migration keep score_config_version null: their
-- overall_score came from the old formula and is not comparable.

alter table public.matches alter column overall_score drop not null;
alter table public.matches alter column overall_score drop default;

alter table public.matches
  add column if not exists score_config_version integer,
  add column if not exists label text check (label in ('Strong fit', 'Good fit', 'Partial fit', 'Weak fit')),
  add column if not exists evaluated_count integer check (evaluated_count >= 0),
  add column if not exists scored_total integer check (scored_total >= 0),
  add column if not exists range_low integer check (range_low between 0 and 100),
  add column if not exists range_high integer check (range_high between 0 and 100);

alter table public.matches
  add constraint matches_overall_score_bounds check (overall_score between 0 and 100),
  add constraint matches_v1_score_has_label check (
    score_config_version is null or (overall_score is null) = (label is null)
  );
