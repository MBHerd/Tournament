import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const adminPage = await readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8');
const adminActions = await readFile(new URL('../app/admin/actions.ts', import.meta.url), 'utf8');
const homePage = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const publicPage = await readFile(new URL('../app/t/[tournamentSlug]/page.tsx', import.meta.url), 'utf8');
const orgPage = await readFile(new URL('../app/org/[orgSlug]/page.tsx', import.meta.url), 'utf8');
const dataLayer = await readFile(new URL('../src/lib/tournament-data.ts', import.meta.url), 'utf8');
const interopExports = await readFile(new URL('../src/lib/interop-exports.ts', import.meta.url), 'utf8');
const exportRoute = await readFile(new URL('../app/admin/exports/[kind]/route.ts', import.meta.url), 'utf8');
const operationsPage = await readFile(new URL('../app/admin/operations/page.tsx', import.meta.url), 'utf8');
const operationsActions = await readFile(new URL('../app/admin/operations/actions.ts', import.meta.url), 'utf8');

test('home, organization, admin, and public pages read the Supabase data layer', () => {
  assert.match(homePage, /getPrimarySnapshot/);
  assert.match(adminPage, /getPrimarySnapshot/);
  assert.match(orgPage, /getOrganizationSnapshot/);
  assert.match(publicPage, /getPublicTournament/);
  assert.doesNotMatch(adminPage, /miniTournamentDemo/);
  assert.doesNotMatch(publicPage, /miniTournamentDemo/);
});

test('home page opens with Himsog logo and role dashboard', () => {
  assert.match(homePage, /himsog-logo-transparent\.png/);
  assert.match(homePage, /role-dashboard/);
  assert.match(homePage, /Tournament Director/);
  assert.match(homePage, /Referee or Scorekeeper/);
  assert.match(homePage, /Player or Team/);
});

test('admin page exposes a real save form for editable tournament data', () => {
  for (const field of [
    'organizationName',
    'organizationSlug',
    'venueName',
    'tournamentName',
    'tournamentSlug',
    'publicPageEnabled',
    'publicResultsEnabled'
  ]) {
    assert.match(adminPage, new RegExp(`name="${field}"`), `${field} should be editable`);
  }
  assert.match(adminPage, /action=\{saveTournamentProfile\}/);
});

test('admin save action requires auth and writes through Supabase server-side only', () => {
  assert.match(adminActions, /requireSignedInUser/);
  assert.match(adminActions, /createSupabaseServerClient/);
  assert.match(adminActions, /createSupabaseAdminClient/);
  assert.match(adminActions, /revalidatePath/);
  assert.match(adminActions, /audit_logs/);
});

test('data layer has live Supabase reads with demo fallback for local builds', () => {
  assert.match(dataLayer, /createSupabaseAdminClient/);
  assert.match(dataLayer, /isSupabaseConfigured/);
  assert.match(dataLayer, /demoSnapshot/);
  assert.match(dataLayer, /source: "supabase"/);
});

test('admin exposes spreadsheet-compatible CSV exports', () => {
  for (const exportName of ['teams', 'schedule', 'score-entry', 'standings', 'rankings', 'bracket', 'scoresheet-data', 'registrations', 'audit']) {
    assert.match(interopExports, new RegExp(`kind: "${exportName}"`));
    assert.match(adminPage, /Spreadsheet Interop/);
  }
  assert.match(interopExports, /Scoresheet Data/);
  assert.match(interopExports, /Score Entry/);
  assert.match(interopExports, /Print\?/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(exportRoute, /Sign in required/);
});

test('admin operations page imports spreadsheet rows and saves live scores', () => {
  assert.match(adminPage, /\/admin\/operations/);
  assert.match(operationsPage, /Paste From Spreadsheet/);
  assert.match(operationsPage, /Live Score Entry/);
  assert.match(operationsPage, /Standings/);
  assert.match(operationsPage, /Bracket Control/);
  assert.match(operationsActions, /importSpreadsheetRows/);
  assert.match(operationsActions, /saveMatchScore/);
  assert.match(operationsActions, /pool_teams/);
  assert.match(operationsActions, /official_match_results/);
  assert.match(operationsActions, /match_games/);
});
