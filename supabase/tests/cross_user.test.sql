-- Cross-user isolation: user B, signed in, can neither see nor change user
-- A's data, through tables (row-level security) or the migration 019 save
-- functions. Runs in one transaction that is rolled back at the end.

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

-- ── Seed user A's data through the real save functions ─────────────────────
select tests.as_user('00000000-0000-0000-0000-00000000000a');

do $$
declare
  v_resume uuid;
  v_job uuid;
  v_req uuid;
  v_ach uuid;
  v_match uuid;
begin
  v_resume := public.save_resume(null,
    '{"default_name":"A resume","raw_text":"A raw","candidate_name":"Ana","candidate_email":"a@test.local"}',
    '[{"section_type":"summary","content":{"text":"A summary"},"sort_order":0}]',
    '[{"company":"Acme","job_title":"Eng","achievement_text":"A achievement","skills":[],"metrics":[]}]');
  v_job := public.save_job('{"title":"A job","raw_text":"A jd","keywords":[]}',
    '[{"requirement_text":"Go","category":"hard_skill","importance":"high"}]');
  select id into v_req from public.job_requirements where job_id = v_job;
  select id into v_ach from public.achievements where resume_id = v_resume;
  v_match := public.save_match(v_job, v_resume,
    '{"overall_score":80,"label":"Strong fit","score_config_version":1,"evaluated_count":1,"scored_total":1}',
    jsonb_build_array(jsonb_build_object('requirement_id', v_req, 'achievement_id', v_ach,
      'status', 'matched', 'confidence', 'high', 'explanation', 'x')));
  perform public.save_tailored_resume(v_job, v_resume, v_match, null, '[]');

  insert into public.evidence_uploads (user_id, resume_id, file_path, file_name)
  values (auth.uid(), v_resume, auth.uid() || '/' || v_resume || '/f.pdf', 'f.pdf');

  perform tests.assert(public.check_rate_limit('cross_user_test', 1, 3600), 'A: first request allowed');
  perform tests.assert(not public.check_rate_limit('cross_user_test', 1, 3600), 'A: second request limited');

  perform set_config('t.a_resume', v_resume::text, true);
  perform set_config('t.a_job', v_job::text, true);
  perform set_config('t.a_req', v_req::text, true);
  perform set_config('t.a_ach', v_ach::text, true);
  perform set_config('t.a_match', v_match::text, true);
end
$$;

-- A storage object in A's folder (storage policies from migration 017).
select tests.as_admin();
insert into storage.objects (bucket_id, name)
values ('evidence-files', '00000000-0000-0000-0000-00000000000a/' || current_setting('t.a_resume') || '/f.pdf');

-- ── As user B ──────────────────────────────────────────────────────────────
select tests.as_user('00000000-0000-0000-0000-00000000000b');

do $$
declare
  v_a_resume text := current_setting('t.a_resume');
  v_a_job text := current_setting('t.a_job');
  v_a_req text := current_setting('t.a_req');
  v_a_ach text := current_setting('t.a_ach');
  v_a_match text := current_setting('t.a_match');
  v_b_resume uuid;
  v_b_job uuid;
  v_b_req uuid;
  t text;
begin
  -- Reads: nothing of A's is visible. B owns nothing yet, so every row B can see would be A's.
  foreach t in array array[
    'resumes', 'resume_sections', 'achievements', 'jobs', 'job_requirements',
    'matches', 'match_items', 'tailored_resumes', 'evidence_uploads', 'api_rate_limits'
  ] loop
    perform tests.assert(
      tests.affected(format('select 1 from public.%I', t)) = 0,
      format('B sees none of A''s rows in %s', t)
    );
  end loop;
  -- B has their own profile (created on sign-up), so check A's specifically.
  perform tests.assert(
    tests.affected($sql$select 1 from public.profiles where user_id = '00000000-0000-0000-0000-00000000000a'$sql$) = 0,
    'B cannot see A''s profile'
  );
  perform tests.assert(
    tests.affected('select 1 from storage.objects') = 0,
    'B sees none of A''s stored files'
  );

  -- Writes through tables: 0 rows affected.
  perform tests.assert(tests.affected(format('update public.resumes set name = %L where id = %L', 'pwned', v_a_resume)) = 0, 'B cannot rename A''s resume');
  perform tests.assert(tests.affected(format('update public.jobs set status = %L where id = %L', 'offer', v_a_job)) = 0, 'B cannot change A''s job');
  perform tests.assert(tests.affected(format('delete from public.matches where id = %L', v_a_match)) = 0, 'B cannot delete A''s match');
  perform tests.assert(tests.affected(format('delete from public.resumes where id = %L', v_a_resume)) = 0, 'B cannot delete A''s resume');
  perform tests.assert(tests.affected('delete from public.api_rate_limits') = 0, 'B cannot reset rate-limit rows');

  -- Inserts pointing at A's rows are refused by RLS.
  perform tests.expect_error(
    format($sql$insert into public.resume_sections (resume_id, section_type) values (%L, 'summary')$sql$, v_a_resume),
    '42501', 'B cannot add a section to A''s resume');
  perform tests.expect_error(
    $sql$insert into public.jobs (user_id, title, raw_text) values ('00000000-0000-0000-0000-00000000000a', 'x', 'x')$sql$,
    '42501', 'B cannot create a job owned by A');

  -- Save functions refuse A's ids.
  perform tests.expect_error(
    format($sql$select public.save_resume(%L, '{"raw_text":"x","candidate_name":"x","candidate_email":"x"}', '[]', '[]')$sql$, v_a_resume),
    'P0002', 'B cannot overwrite A''s resume');
  perform tests.expect_error(format('select public.set_default_resume(%L)', v_a_resume), 'P0002', 'B cannot make A''s resume their default');
  perform tests.expect_error(format('select public.delete_resume(%L)', v_a_resume), 'P0002', 'B cannot delete A''s resume via RPC');
  perform tests.expect_error(
    format($sql$select public.save_match(%L, %L, '{"score_config_version":1,"evaluated_count":0,"scored_total":0}', '[]')$sql$, v_a_job, v_a_resume),
    'P0002', 'B cannot save a match on A''s job');

  -- B's own resume and job...
  v_b_resume := public.save_resume(null, '{"default_name":"B resume","raw_text":"B raw","candidate_name":"Bo","candidate_email":"b"}', '[]', '[]');
  v_b_job := public.save_job('{"title":"B job","raw_text":"B jd","keywords":[]}',
    '[{"requirement_text":"SQL","category":"hard_skill","importance":"high"}]');
  select id into v_b_req from public.job_requirements where job_id = v_b_job;

  perform tests.expect_error(
    format($sql$select public.save_tailored_resume(%L, %L, null, null, '[]')$sql$, v_a_job, v_b_resume),
    'P0002', 'B cannot save a tailored resume on A''s job');
  perform tests.expect_error(
    format($sql$select public.save_tailored_resume(%L, %L, %L, null, '[]')$sql$, v_b_job, v_b_resume, v_a_match),
    '22023', 'B cannot attach A''s match to their tailored resume');

  -- ...cannot reference A's rows from a match, even though foreign keys would allow it.
  perform tests.expect_error(
    format($sql$select public.save_match(%L, %L, '{"score_config_version":1,"evaluated_count":1,"scored_total":1}',
           jsonb_build_array(jsonb_build_object('requirement_id', %L, 'status', 'matched', 'confidence', 'high', 'explanation', 'x')))$sql$,
           v_b_job, v_b_resume, v_a_req),
    '22023', 'B cannot point a match at A''s requirement');
  perform tests.expect_error(
    format($sql$select public.save_match(%L, %L, '{"score_config_version":1,"evaluated_count":1,"scored_total":1}',
           jsonb_build_array(jsonb_build_object('requirement_id', %L, 'achievement_id', %L, 'status', 'matched', 'confidence', 'high', 'explanation', 'x')))$sql$,
           v_b_job, v_b_resume, v_b_req, v_a_ach),
    '22023', 'B cannot point a match at A''s achievement');

  -- Rate limits are per user: A being limited does not limit B.
  perform tests.assert(public.check_rate_limit('cross_user_test', 1, 3600), 'B has their own rate-limit counter');
end
$$;

-- A's data is untouched after all of B's attempts.
select tests.as_user('00000000-0000-0000-0000-00000000000a');
do $$
begin
  perform tests.assert((select name from public.resumes where id = current_setting('t.a_resume')::uuid) = 'A resume', 'A''s resume unchanged');
  perform tests.assert((select is_master from public.resumes where id = current_setting('t.a_resume')::uuid), 'A''s default unchanged');
  perform tests.assert((select status from public.jobs where id = current_setting('t.a_job')::uuid) = 'ready', 'A''s job unchanged');
  perform tests.assert(exists (select 1 from public.matches where id = current_setting('t.a_match')::uuid), 'A''s match still exists');
  perform tests.assert(tests.affected('select 1 from storage.objects') = 1, 'A still sees their own file');
end
$$;

-- ── Anonymous callers cannot use the save functions at all ────────────────
select tests.as_admin();
set local role anon;
do $$
begin
  perform tests.expect_error($sql$select public.save_job('{}', '[]')$sql$, '42501', 'anon cannot call save_job');
  perform tests.expect_error($sql$select public.save_resume(null, '{}', '[]', '[]')$sql$, '42501', 'anon cannot call save_resume');
  perform tests.expect_error($sql$select public.save_match(gen_random_uuid(), gen_random_uuid(), '{}', '[]')$sql$, '42501', 'anon cannot call save_match');
  perform tests.expect_error('select public.set_default_resume(gen_random_uuid())', '42501', 'anon cannot call set_default_resume');
  perform tests.expect_error('select public.delete_resume(gen_random_uuid())', '42501', 'anon cannot call delete_resume');
  perform tests.expect_error($sql$select public.save_tailored_resume(gen_random_uuid(), gen_random_uuid(), null, null, '[]')$sql$, '42501', 'anon cannot call save_tailored_resume');
end
$$;

rollback;
