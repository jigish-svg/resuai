-- Mock interviews now run as a live OpenAI Realtime API voice call instead
-- of a typed/turn-based exchange. The live conversation is captured as a
-- flat transcript ([{role, text}]) once the call ends, rather than the old
-- per-turn `turns` shape (left in place, unused by new sessions).

alter table public.mock_interview_sessions
  add column if not exists transcript jsonb not null default '[]'::jsonb;
