import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requiredTables } from '../src/domain/schema/schema-outline.mjs';

const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const rlsMigration = await readFile(new URL('../db/migrations/0002_supabase_rls_storage.sql', import.meta.url), 'utf8');
const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const browserClient = await readFile(new URL('../src/lib/supabase/browser.ts', import.meta.url), 'utf8');
const serverClient = await readFile(new URL('../src/lib/supabase/server.ts', import.meta.url), 'utf8');
const adminClient = await readFile(new URL('../src/lib/supabase/admin.ts', import.meta.url), 'utf8');
const middleware = await readFile(new URL('../middleware.ts', import.meta.url), 'utf8');
const supabaseDocs = await readFile(new URL('../docs/supabase-setup.md', import.meta.url), 'utf8');
const vercelDocs = await readFile(new URL('../docs/vercel-deployment.md', import.meta.url), 'utf8');

test('deployment environment template covers Supabase, Storage, Vercel, and database settings', () => {
  for (const name of [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_STORAGE_BUCKET_PUBLIC',
    'SUPABASE_STORAGE_BUCKET_PRIVATE',
    'NEXT_PUBLIC_APP_URL',
    'VERCEL_PROJECT_PRODUCTION_URL'
  ]) {
    assert.match(envExample, new RegExp('^' + name + '=', 'm'), `${name} should be listed`);
  }
});

test('Vercel config uses Next.js and pnpm build commands', () => {
  assert.equal(vercelConfig.framework, 'nextjs');
  assert.match(vercelConfig.installCommand, /pnpm install --frozen-lockfile/);
  assert.match(vercelConfig.buildCommand, /pnpm build/);
});

test('Supabase packages and clients are separated by browser, server, and admin scope', () => {
  assert.ok(packageJson.dependencies['@supabase/supabase-js']);
  assert.ok(packageJson.dependencies['@supabase/ssr']);
  assert.match(browserClient, /createBrowserClient/);
  assert.match(serverClient, /createServerClient/);
  assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY|getSupabaseServiceRoleKey/);
  assert.doesNotMatch(browserClient, /SERVICE_ROLE/);
});

test('middleware refreshes Supabase auth and protects staff routes', () => {
  assert.match(middleware, /supabase\.auth\.getUser/);
  assert.match(middleware, /protectedPrefixes = \["\/admin", "\/org"\]/);
  assert.match(middleware, /NextResponse\.redirect/);
});

test('RLS migration covers foundation tables and Supabase Storage buckets', () => {
  assert.match(rlsMigration, /enable row level security/i);
  assert.match(rlsMigration, /auth\.uid\(\)/i);
  assert.match(rlsMigration, /storage\.buckets/i);
  assert.match(rlsMigration, /public-assets/i);
  assert.match(rlsMigration, /tournament-files/i);

  for (const table of requiredTables) {
    assert.match(rlsMigration, new RegExp(`'${table}'|public\\.${table}`, 'i'), `${table} should be protected`);
  }
});

test('deployment docs cover Vercel, Supabase, callback URLs, and secrets', () => {
  assert.match(supabaseDocs, /Row Level Security/i);
  assert.match(supabaseDocs, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(supabaseDocs, /\/auth\/callback/);
  assert.match(vercelDocs, /Environment Variables/i);
  assert.match(vercelDocs, /MBHerd\/Tournament/);
  assert.match(vercelDocs, /pnpm build/);
});
