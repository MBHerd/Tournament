import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requiredTables, statusCatalog } from '../src/domain/schema/schema-outline.mjs';
import { assertNoPublicLeak, sanitizePublicTeam, sanitizePublicTournament } from '../src/domain/public/public-queries.mjs';

const migration = await readFile(new URL('../db/migrations/0001_foundation.sql', import.meta.url), 'utf8');

test('migration contains every table from the PostgreSQL schema outline', () => {
  for (const table of requiredTables) {
    assert.match(migration, new RegExp('create table if not exists\\s+' + table + '\\s*\\(', 'i'), table + ' should exist');
  }
});

test('migration keeps submitted and official score models separate', () => {
  assert.match(migration, /create table if not exists\s+match_result_submissions/i);
  assert.match(migration, /create table if not exists\s+official_match_results/i);
  assert.match(migration, /result_submission_id uuid references match_result_submissions/i);
  assert.match(migration, /official_result_id uuid references official_match_results/i);
});

test('migration adds suggested indexes for high-traffic tournament queries', () => {
  const expectedIndexes = [
    'idx_organizations_slug',
    'idx_tournaments_organization_id',
    'idx_tournaments_slug',
    'idx_divisions_tournament_id',
    'idx_teams_tournament_id',
    'idx_teams_division_id',
    'idx_players_email',
    'idx_players_phone',
    'idx_matches_tournament_id',
    'idx_matches_division_id',
    'idx_matches_status',
    'idx_matches_court_id',
    'idx_matches_planned_start_time',
    'idx_match_games_match_id',
    'idx_standing_snapshots_division_id',
    'idx_brackets_division_id',
    'idx_audit_logs_organization_id',
    'idx_audit_logs_tournament_id',
    'idx_audit_logs_actor_user_id',
    'idx_audit_logs_created_at'
  ];
  for (const index of expectedIndexes) assert.match(migration, new RegExp(index, 'i'), index + ' should exist');
});

test('migration prevents audit log updates and deletes', () => {
  assert.match(migration, /prevent_audit_log_mutation/i);
  assert.match(migration, /audit_logs_no_update/i);
  assert.match(migration, /audit_logs_no_delete/i);
});

test('status catalog values appear in database check constraints', () => {
  for (const status of statusCatalog.tournament) assert.match(migration, new RegExp("'" + status + "'"), status);
  for (const status of statusCatalog.match) assert.match(migration, new RegExp("'" + status + "'"), status);
});

test('public team serializer hides payment and contact details', () => {
  const publicTeam = sanitizePublicTeam({
    id: 'team_1',
    division_id: 'division_1',
    team_name: 'North Smash',
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'gcash',
    amount_paid: 750,
    notes: 'Internal note',
    players: [{ id: 'player_1', first_name: 'Ana', last_name: 'Santos', email: 'ana@example.com', phone: 'hidden', emergency_contact_name: 'Hidden' }]
  });
  assert.equal(publicTeam.payment_status, undefined);
  assert.equal(publicTeam.amount_paid, undefined);
  assert.equal(publicTeam.players[0].email, undefined);
  assert.doesNotThrow(() => assertNoPublicLeak(publicTeam));
});

test('public tournament serializer returns null for unpublished tournaments', () => {
  assert.equal(sanitizePublicTournament({ public_page_enabled: false, name: 'Draft' }), null);
});

test('public leak assertion catches sensitive fields', () => {
  assert.throws(() => assertNoPublicLeak({ team_name: 'North Smash', payment_status: 'paid' }), /payment_status/);
});
