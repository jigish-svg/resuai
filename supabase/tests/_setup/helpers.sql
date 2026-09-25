-- Test helpers, applied after the migrations. Test-only.

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Act as a signed-in user for the rest of the transaction, the way PostgREST does.
create or replace function tests.as_user(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end;
$$;

-- Back to the superuser (bypasses RLS) for seeding and cleanup.
create or replace function tests.as_admin()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

create or replace function tests.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is distinct from true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

-- Runs p_sql in a subtransaction and requires it to fail (with p_state if given).
-- Any writes it made before failing are rolled back, just as a failed RPC call is.
create or replace function tests.expect_error(p_sql text, p_state text, p_message text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'ASSERTION FAILED: % (expected SQLSTATE %, got %: %)', p_message, p_state, sqlstate, sqlerrm;
    end if;
    return;
  end;
  raise exception 'ASSERTION FAILED: % (expected an error, none raised)', p_message;
end;
$$;

-- Number of rows an UPDATE/DELETE touched, for "0 rows affected" checks under RLS.
create or replace function tests.affected(p_sql text)
returns bigint
language plpgsql
as $$
declare
  v_count bigint;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;
