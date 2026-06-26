import test from 'node:test';
import assert from 'node:assert/strict';
import { can } from '../src/domain/auth/permissions.mjs';
import { filterByOrganization, requireOrganizationAccess } from '../src/domain/tenancy/data-separation.mjs';
import { generatePools } from '../src/domain/pools/generate-pools.mjs';
import { generatePoolMatches } from '../src/domain/matches/generate-pool-matches.mjs';
import { validateGameScore } from '../src/domain/scores/validation.mjs';
import { submitScore, approveScore } from '../src/domain/scores/approval-flow.mjs';
import { calculateStandings } from '../src/domain/standings/calculate-standings.mjs';
import { seedBracket } from '../src/domain/brackets/seed-bracket.mjs';
import { createAuditEntry, appendAudit } from '../src/domain/audit/audit-log.mjs';
import { miniTournamentDemo } from '../src/domain/demo/mini-tournament.mjs';

test('role permission checks gate practical actions', () => {
  assert.equal(can({ role: 'Platform Admin' }, 'organizations.manage'), true);
  assert.equal(can({ role: 'Referee' }, 'scores.submit'), true);
  assert.equal(can({ role: 'Referee' }, 'scores.approve'), false);
  assert.equal(can({ role: 'Public Viewer' }, 'payments.manage'), false);
});

test('organization data separation filters and blocks cross-org access', () => {
  const rows = [{ organizationId: 'org_a', value: 1 }, { organizationId: 'org_b', value: 2 }];
  assert.deepEqual(filterByOrganization(rows, 'org_a'), [{ organizationId: 'org_a', value: 1 }]);
  assert.throws(() => requireOrganizationAccess({ role: 'Tournament Director', organizationId: 'org_a' }, 'org_b'), /denied/);
});

test('pool generation balances eight teams into two pools', () => {
  const teams = Array.from({ length: 8 }, (_, index) => ({ teamId: 'T' + (index + 1), teamName: 'Team ' + (index + 1) }));
  const pools = generatePools(teams, 2);
  assert.equal(pools.length, 2);
  assert.equal(pools[0].teams.length, 4);
  assert.equal(pools[1].teams.length, 4);
});

test('match generation creates round robin pool matches with readable ids', () => {
  const teams = Array.from({ length: 4 }, (_, index) => ({ teamId: 'T' + (index + 1), teamName: 'Team ' + (index + 1) }));
  const pools = generatePools(teams, 1);
  const matches = generatePoolMatches({ pools, courts: [{ courtId: 'c1', name: 'Court 1' }], divisionCode: 'OD' });
  assert.equal(matches.length, 6);
  assert.equal(matches[0].matchId, 'OD-PA-M01');
});

test('score validation warns on invalid win-by-two result', () => {
  const warnings = validateGameScore({ team1: 11, team2: 10, target: 11, winBy: 2 });
  assert.ok(warnings.some((warning) => warning.includes('Win-by-2')));
});

test('score approval retains submitted and official scores', () => {
  const match = { matchId: 'OD-PA-M01' };
  const submitted = submitScore({ match, games: [{ team1: 11, team2: 7 }], submittedBy: 'ref_1', format: { target: 11, winBy: 2 } });
  const { officialScore, audit } = approveScore({ submission: submitted, approvedBy: 'desk_1' });
  assert.equal(submitted.status, 'Under review');
  assert.equal(officialScore.status, 'Official/final');
  assert.equal(officialScore.submittedScore, submitted);
  assert.equal(audit.action, 'score.approved');
});

test('standings calculation ranks pool winners from approved scores', () => {
  const demo = miniTournamentDemo();
  const standings = calculateStandings({ teams: demo.teams, matches: demo.matches, officialScores: demo.officialScores });
  const poolA = standings.filter((row) => row.pool === 'A');
  assert.equal(poolA[0].teamName, 'North Smash');
  assert.equal(poolA[0].wins, 3);
  assert.equal(poolA[0].rank, 1);
});

test('bracket seeding advances top two from each pool and avoids same-pool semifinal', () => {
  const demo = miniTournamentDemo();
  const standings = calculateStandings({ teams: demo.teams, matches: demo.matches, officialScores: demo.officialScores });
  const bracket = seedBracket({ standings, bracketSize: 4 });
  assert.equal(bracket.seeds.length, 4);
  assert.equal(bracket.matches[0].team1Seed, 1);
  assert.equal(bracket.matches[0].team2Seed, 4);
});

test('audit log entries are immutable and appended without mutation', () => {
  const entry = createAuditEntry({ actorId: 'u1', action: 'test.created', entityType: 'test', entityId: 'e1', detail: 'Created.' });
  assert.equal(Object.isFrozen(entry), true);
  const log = appendAudit([], entry);
  assert.equal(Object.isFrozen(log), true);
  assert.equal(log[0].action, 'test.created');
});
