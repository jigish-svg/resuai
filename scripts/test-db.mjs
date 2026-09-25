#!/usr/bin/env node
// Runs the SQL integration tests against a throwaway local Postgres (pgvector).
// Never touches a real Supabase project: the container has no published port
// and is removed when the run ends, pass or fail.
//
//   npm run test:db
//
// Order: Supabase stand-in -> migrations 001.. in order -> test helpers -> each supabase/tests/*.test.sql

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const IMAGE = 'pgvector/pgvector:pg15';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const TESTS = join(ROOT, 'supabase', 'tests');
const SETUP = join(TESTS, '_setup');
const container = `getjobfit-dbtest-${randomBytes(4).toString('hex')}`;

function docker(args, input) {
  return spawnSync('docker', args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function psql(sql) {
  // -o /dev/null hides result rows; errors and NOTICEs still reach stderr.
  return docker(
    ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-o', '/dev/null'],
    sql
  );
}

let started = false;
function cleanup() {
  if (started) {
    docker(['rm', '-f', container]);
    started = false;
  }
}
process.on('SIGINT', () => {
  cleanup();
  process.exit(130);
});

function fail(message, detail) {
  console.error(`\n✗ ${message}`);
  if (detail) console.error(detail.trim());
  cleanup();
  process.exit(1);
}

const info = docker(['info', '--format', '{{.ServerVersion}}']);
if (info.status !== 0) {
  fail('Docker is not reachable. Start Docker Desktop and try again.', info.stderr);
}

console.log(`Starting ${IMAGE} as ${container} ...`);
const run = docker(['run', '-d', '--rm', '--name', container, '-e', 'POSTGRES_PASSWORD=test', IMAGE]);
if (run.status !== 0) fail('Could not start the test database.', run.stderr);
started = true;

try {
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    // The image restarts Postgres once after init; wait for a real query to work.
    ready = docker(['exec', container, 'psql', '-U', 'postgres', '-c', 'select 1']).status === 0;
    if (!ready) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},1000)']);
  }
  if (!ready) fail('The test database did not become ready in time.');

  const steps = [
    ['setup: Supabase stand-in', join(SETUP, 'supabase_stub.sql')],
    ...readdirSync(MIGRATIONS)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort()
      .map((f) => [`migration: ${f}`, join(MIGRATIONS, f)]),
    ['setup: test helpers', join(SETUP, 'helpers.sql')],
  ];
  for (const [label, file] of steps) {
    const res = psql(readFileSync(file, 'utf8'));
    if (res.status !== 0) fail(`${label} failed`, res.stderr);
    console.log(`  ✓ ${label}`);
  }

  const testFiles = readdirSync(TESTS).filter((f) => f.endsWith('.test.sql')).sort();
  let failures = 0;
  for (const f of testFiles) {
    const res = psql(readFileSync(join(TESTS, f), 'utf8'));
    if (res.status === 0) {
      console.log(`  ✓ ${f}`);
    } else {
      failures++;
      console.error(`  ✗ ${f}\n${res.stderr.trim()}`);
    }
  }

  console.log(`\n${testFiles.length - failures}/${testFiles.length} test files passed.`);
  cleanup();
  process.exit(failures === 0 ? 0 : 1);
} catch (error) {
  fail('Unexpected error while running DB tests.', String(error?.stack ?? error));
}
