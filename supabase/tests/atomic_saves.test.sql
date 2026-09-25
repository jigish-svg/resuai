-- Migration 019: each save function is all-or-nothing, and its happy path
-- writes what the old multi-call route wrote. Runs in one transaction that is
-- rolled back at the end.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@test.local');
select tests.as_user('00000000-0000-0000-0000-00000000000a');

-- ── save_resume: create ────────────────────────────────────────────────────
do $$
declare
  v_id uuid;
  v_embedding jsonb := (select jsonb_agg(0.001) from generate_series(1, 1536));
begin
  v_id := public.save_resume(
    null,
    '{"name":null,"default_name":"Engineer Resume","raw_text":"raw v1","template":null,
      "candidate_name":"Ana","candidate_email":"ana@test.local","candidate_phone":null}',
    '[{"section_type":"summary","content":{"text":"S1"},"sort_order":0},
      {"section_type":"skills","content":{"skills":["Go"]},"sort_order":2}]',
    jsonb_build_array(
      jsonb_build_object('company','Acme','job_title','Eng','achievement_text','Cut latency by 40%',
                         'skills',jsonb_build_array('Go'),'metrics',jsonb_build_array('40%'),
                         'dates','2020 - Present','embedding',v_embedding),
      jsonb_build_object('company','Acme','job_title','Eng','achievement_text','Led migration',
                         'skills','[]'::jsonb,'metrics','[]'::jsonb,'dates','2020 - Present','embedding',null)
    )
  );
  perform set_config('t.resume1', v_id::text, true);

  perform tests.assert((select is_master from public.resumes where id = v_id), 'first resume becomes the default');
  perform tests.assert((select name from public.resumes where id = v_id) = 'Engineer Resume', 'default name is used when none given');
  perform tests.assert((select template from public.resumes where id = v_id) = 'classic', 'default template is classic');
  perform tests.assert((select version from public.resumes where id = v_id) = 1, 'new resume starts at version 1');
  perform tests.assert((select count(*) from public.resume_sections where resume_id = v_id) = 2, 'sections written');
  perform tests.assert((select count(*) from public.achievements where resume_id = v_id) = 2, 'achievements written');
  perform tests.assert(
    (select skills from public.achievements where resume_id = v_id and achievement_text like 'Cut%') = array['Go'],
    'skills stored as text[]'
  );
  perform tests.assert(
    (select vector_dims(embedding) from public.achievements where resume_id = v_id and achievement_text like 'Cut%') = 1536,
    'embedding stored as a 1536-d vector'
  );
  perform tests.assert(
    (select embedding is null from public.achievements where resume_id = v_id and achievement_text like 'Led%'),
    'missing embedding stored as null'
  );
end
$$;

-- ── save_resume: update, then a forced failure part-way ────────────────────
do $$
declare
  v_id uuid := current_setting('t.resume1')::uuid;
begin
  perform public.save_resume(
    v_id,
    '{"name":null,"raw_text":"raw v2","template":"modern","candidate_name":"Ana","candidate_email":"ana@test.local"}',
    '[{"section_type":"summary","content":{"text":"S2"},"sort_order":0}]',
    '[{"company":"Acme","job_title":"Eng","achievement_text":"Only one now","skills":[],"metrics":[],"dates":null}]'
  );
  perform tests.assert((select version from public.resumes where id = v_id) = 2, 'update bumps version');
  perform tests.assert((select name from public.resumes where id = v_id) = 'Engineer Resume', 'null name keeps the current name');
  perform tests.assert((select template from public.resumes where id = v_id) = 'modern', 'template updated');
  perform tests.assert((select count(*) from public.resume_sections where resume_id = v_id) = 1, 'sections replaced');
  perform tests.assert((select count(*) from public.achievements where resume_id = v_id) = 1, 'achievements replaced');

  -- Sections are deleted and re-inserted before achievements; the null
  -- achievement_text then violates NOT NULL. Nothing may stick.
  perform tests.expect_error(
    format(
      $sql$select public.save_resume(%L, '{"raw_text":"raw v3","candidate_name":"X","candidate_email":"x"}',
             '[{"section_type":"summary","content":{"text":"S3"},"sort_order":0},
               {"section_type":"skills","content":{"skills":[]},"sort_order":2}]',
             '[{"company":"Acme","job_title":"Eng","achievement_text":null}]')$sql$,
      v_id
    ),
    '23502',
    'save_resume fails on a bad achievement'
  );
  perform tests.assert((select version from public.resumes where id = v_id) = 2, 'failed save leaves version unchanged');
  perform tests.assert((select raw_text from public.resumes where id = v_id) = 'raw v2', 'failed save leaves raw text unchanged');
  perform tests.assert((select candidate_name from public.resumes where id = v_id) = 'Ana', 'failed save leaves identity unchanged');
  perform tests.assert(
    (select array_agg(content->>'text') from public.resume_sections where resume_id = v_id) = array['S2'],
    'failed save leaves the previous sections'
  );
  perform tests.assert(
    (select array_agg(achievement_text) from public.achievements where resume_id = v_id) = array['Only one now'],
    'failed save leaves the previous achievements'
  );
end
$$;

-- ── save_job: happy path and forced failure ────────────────────────────────
do $$
declare
  v_job uuid;
  v_before bigint;
begin
  v_job := public.save_job(
    '{"title":"Backend Engineer","company":"Beta","raw_text":"We are hiring","keywords":["Go","SQL"]}',
    '[{"requirement_text":"Go","category":"hard_skill","importance":"critical","is_implied":false},
      {"requirement_text":"5 years","category":"experience","importance":"high"}]'
  );
  perform set_config('t.job1', v_job::text, true);
  perform tests.assert((select status from public.jobs where id = v_job) = 'saved', 'new job is saved');
  perform tests.assert((select keywords from public.jobs where id = v_job) = array['Go', 'SQL'], 'keywords stored');
  perform tests.assert(
    (select resume_id from public.jobs where id = v_job) = current_setting('t.resume1')::uuid,
    'job links the default resume'
  );
  perform tests.assert(
    (select array_agg(requirement_text order by sort_order) from public.job_requirements where job_id = v_job) = array['Go', '5 years'],
    'requirements keep their order'
  );
  perform tests.assert(
    (select is_implied from public.job_requirements where job_id = v_job and requirement_text = '5 years') = false,
    'is_implied defaults to false'
  );

  v_before := (select count(*) from public.jobs);
  perform tests.expect_error(
    $sql$select public.save_job('{"title":"Half job","raw_text":"x"}',
           '[{"requirement_text":"ok","category":"hard_skill","importance":"high"},
             {"requirement_text":"bad","category":"vibes","importance":"high"}]')$sql$,
    '23514',
    'save_job fails on a bad requirement category'
  );
  perform tests.assert((select count(*) from public.jobs) = v_before, 'failed save_job leaves no job behind');
  perform tests.assert(
    not exists (select 1 from public.job_requirements where requirement_text in ('ok', 'bad')),
    'failed save_job leaves no requirements behind'
  );
end
$$;

-- ── save_match: forced failure on a fresh job, then happy path and replacement ──
do $$
declare
  v_resume uuid := current_setting('t.resume1')::uuid;
  v_job uuid := current_setting('t.job1')::uuid;
  v_req1 uuid;
  v_req2 uuid;
  v_ach uuid;
  v_match uuid;
begin
  select id into v_req1 from public.job_requirements where job_id = v_job and sort_order = 0;
  select id into v_req2 from public.job_requirements where job_id = v_job and sort_order = 1;
  select id into v_ach from public.achievements where resume_id = v_resume limit 1;

  perform tests.expect_error(
    format(
      $sql$select public.save_match(%L, %L,
             '{"overall_score":50,"label":"Partial fit","score_config_version":1,"evaluated_count":2,"scored_total":2}',
             jsonb_build_array(
               jsonb_build_object('requirement_id', %L, 'status', 'matched', 'confidence', 'high', 'explanation', 'ok'),
               jsonb_build_object('requirement_id', %L, 'status', 'maybe', 'confidence', 'low', 'explanation', 'bad')))$sql$,
      v_job, v_resume, v_req1, v_req2
    ),
    '23514',
    'save_match fails on a bad item status'
  );
  perform tests.assert(not exists (select 1 from public.matches where job_id = v_job), 'failed first match leaves no match');
  perform tests.assert((select status from public.jobs where id = v_job) = 'saved', 'failed match leaves job status unchanged');

  v_match := public.save_match(
    v_job, v_resume,
    '{"overall_score":72,"label":"Good fit","score_config_version":1,"evaluated_count":2,"scored_total":2,"range_low":65,"range_high":80}',
    jsonb_build_array(
      jsonb_build_object('requirement_id', v_req1, 'achievement_id', v_ach, 'status', 'matched', 'confidence', 'high',
                         'evidence_text', 'Cut latency', 'explanation', 'Shows Go.'),
      jsonb_build_object('requirement_id', v_req2, 'achievement_id', null, 'status', 'no_evidence', 'confidence', 'low',
                         'evidence_text', null, 'explanation', 'Not on your documents.')
    )
  );
  perform set_config('t.match1', v_match::text, true);
  perform tests.assert((select overall_score from public.matches where id = v_match) = 72, 'score stored');
  perform tests.assert((select count(*) from public.match_items where match_id = v_match) = 2, 'items stored');
  perform tests.assert((select status from public.jobs where id = v_job) = 'tailoring', 'job moves from saved to tailoring');

  -- A failing re-run must not delete the existing match.
  perform tests.expect_error(
    format(
      $sql$select public.save_match(%L, %L, '{"overall_score":10,"score_config_version":1,"evaluated_count":1,"scored_total":1}',
             jsonb_build_array(jsonb_build_object('requirement_id', %L, 'status', 'matched', 'confidence', 'sure', 'explanation', 'x')))$sql$,
      v_job, v_resume, v_req1
    ),
    '23514',
    'save_match re-run fails on a bad confidence'
  );
  perform tests.assert(exists (select 1 from public.matches where id = v_match), 'failed re-run keeps the previous match');
  perform tests.assert((select count(*) from public.match_items where match_id = v_match) = 2, 'failed re-run keeps the previous items');

  -- A null score stays null (never a fake 0).
  v_match := public.save_match(
    v_job, v_resume,
    '{"overall_score":null,"label":null,"score_config_version":1,"evaluated_count":0,"scored_total":2}',
    jsonb_build_array(jsonb_build_object('requirement_id', v_req1, 'status', 'no_evidence', 'confidence', 'low', 'explanation', 'x'))
  );
  perform tests.assert((select count(*) from public.matches where job_id = v_job) = 1, 're-run replaces, never duplicates');
  perform tests.assert((select overall_score is null from public.matches where id = v_match), 'absent score stays null');
  perform set_config('t.match1', v_match::text, true);
end
$$;

-- ── save_tailored_resume ───────────────────────────────────────────────────
do $$
declare
  v_job uuid := current_setting('t.job1')::uuid;
  v_resume uuid := current_setting('t.resume1')::uuid;
  v_match uuid := current_setting('t.match1')::uuid;
  v_id uuid;
  v_id2 uuid;
begin
  v_id := public.save_tailored_resume(v_job, v_resume, v_match, null,
    '[{"section_type":"summary","sort_order":0,"content":{"text":"T1"}}]');
  perform tests.assert((select name from public.tailored_resumes where id = v_id) = 'Tailored Resume', 'default tailored name');
  perform tests.assert((select status from public.jobs where id = v_job) = 'ready', 'job marked ready');

  v_id2 := public.save_tailored_resume(v_job, v_resume, v_match, 'Mine',
    '[{"section_type":"summary","sort_order":0,"content":{"text":"T2"}}]');
  perform tests.assert(v_id2 = v_id, 'second save updates the same row');
  perform tests.assert((select sections->0->'content'->>'text' from public.tailored_resumes where id = v_id) = 'T2', 'sections updated');
  perform tests.assert((select count(*) from public.tailored_resumes where job_id = v_job) = 1, 'no duplicate tailored rows');

  -- A match from a different job is rejected.
  perform tests.expect_error(
    format($sql$select public.save_tailored_resume(%L, %L, %L, null, '[]')$sql$,
           v_job, v_resume, gen_random_uuid()),
    '22023',
    'match must belong to the job'
  );
end
$$;

-- ── set_default_resume and delete_resume keep exactly one default ──────────
do $$
declare
  v_r1 uuid := current_setting('t.resume1')::uuid;
  v_r2 uuid;
begin
  v_r2 := public.save_resume(null, '{"default_name":"Second","raw_text":"r2","candidate_name":"Ana","candidate_email":"a"}', '[]', '[]');
  perform tests.assert((select is_master from public.resumes where id = v_r2) = false, 'second resume is not the default');

  perform public.set_default_resume(v_r2);
  perform tests.assert((select count(*) from public.resumes where is_master) = 1, 'exactly one default after switch');
  perform tests.assert((select is_master from public.resumes where id = v_r2), 'new default set');

  perform tests.expect_error(format('select public.set_default_resume(%L)', gen_random_uuid()), 'P0002', 'unknown resume');
  perform tests.assert((select is_master from public.resumes where id = v_r2), 'failed switch keeps the default');

  perform public.delete_resume(v_r2);
  perform tests.assert(not exists (select 1 from public.resumes where id = v_r2), 'resume deleted');
  perform tests.assert((select count(*) from public.resumes where is_master) = 1, 'a default remains after deleting the default');
  perform tests.assert((select is_master from public.resumes where id = v_r1), 'oldest remaining resume promoted');

  perform tests.expect_error(format('select public.delete_resume(%L)', v_r2), 'P0002', 'deleting twice is not found');
end
$$;

rollback;
