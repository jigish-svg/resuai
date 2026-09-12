-- The mock interview now plays out as an actual conversation: the
-- interviewer's in-character opening line (greeting + first question) is
-- generated once at session start and stored here. Each turn's natural
-- in-character reply (reaction + next question, or a wrap-up line on the
-- final turn) lives inside the existing `turns` jsonb column, so no schema
-- change is needed there.

alter table public.mock_interview_sessions
  add column if not exists opening_message text not null default '';
