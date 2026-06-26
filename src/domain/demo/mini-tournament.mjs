import { generatePools } from '../pools/generate-pools.mjs';
import { generatePoolMatches } from '../matches/generate-pool-matches.mjs';
import { createAuditEntry } from '../audit/audit-log.mjs';

const organizationId = 'org_gingoog';
const tournamentId = 'trn_gingoog_open_2026';
const divisionId = 'div_open_doubles';

export function miniTournamentDemo() {
  const organization = { organizationId, name: 'Gingoog Pickleball Club', slug: 'gingoog-pickleball' };
  const tournament = { organizationId, tournamentId, name: 'Gingoog Open 2026', slug: 'gingoog-open-2026', dateLabel: 'July 18-19, 2026' };
  const venue = { organizationId, tournamentId, venueId: 'ven_city_sports', name: 'Gingoog City Sports Complex' };
  const courts = [1, 2, 3, 4].map((number) => ({ organizationId, tournamentId, courtId: 'court_' + number, name: number === 1 ? 'Championship Court' : 'Court ' + number }));
  const users = [
    { userId: 'usr_platform', name: 'Platform Admin', role: 'Platform Admin' },
    { userId: 'usr_owner', name: 'Mara Santos', role: 'Organization Owner', organizationId },
    { userId: 'usr_td', name: 'Jun Dela Cruz', role: 'Tournament Director', organizationId },
    { userId: 'usr_scorekeeper', name: 'Kaye Uy', role: 'Scorekeeper', organizationId },
    { userId: 'usr_referee', name: 'Rico Lim', role: 'Referee', organizationId }
  ];
  const staff = users.filter((user) => user.organizationId);
  const baseTeams = [
    ['HL-A1', 'North Smash'],
    ['HL-B1', 'Harbor Dinks'],
    ['HL-A2', 'City Dinks'],
    ['HL-B2', 'Valley Drives'],
    ['HL-A3', 'Coast Drops'],
    ['HL-B3', 'Summit Spins'],
    ['HL-A4', 'River Drives'],
    ['HL-B4', 'Market Kitchen']
  ].map(([teamId, teamName]) => ({ organizationId, tournamentId, divisionId, teamId, teamName }));
  const pools = generatePools(baseTeams, 2);
  const teams = pools.flatMap((pool) => pool.teams);
  const matches = generatePoolMatches({ pools, courts, divisionCode: 'OD' });
  const officialScores = buildOfficialScores(matches);
  const auditLog = [
    createAuditEntry({ organizationId, tournamentId, actorId: 'usr_owner', action: 'organization.created', entityType: 'organization', entityId: organizationId, detail: 'Created organization profile.' }),
    createAuditEntry({ organizationId, tournamentId, actorId: 'usr_td', action: 'tournament.created', entityType: 'tournament', entityId: tournamentId, detail: 'Created seeded demo tournament.' }),
    createAuditEntry({ organizationId, tournamentId, actorId: 'usr_scorekeeper', action: 'score.approved', entityType: 'match', entityId: matches[0].matchId, detail: 'Approved first pool score.' })
  ];
  const modules = ['auth', 'organizations', 'users', 'tournaments', 'divisions', 'registrations', 'teams', 'venues', 'courts', 'pools', 'matches', 'scores', 'standings', 'brackets', 'staff', 'public', 'audit', 'files', 'notifications'];
  return { organization, tournament, venue, courts, users, staff, pools, teams, matches, officialScores, auditLog, modules };
}

function buildOfficialScores(matches) {
  const scoreByMatch = new Map([
    ['OD-PA-M01', [11, 7]],
    ['OD-PA-M02', [11, 8]],
    ['OD-PA-M03', [11, 5]],
    ['OD-PA-M04', [11, 9]],
    ['OD-PA-M05', [11, 6]],
    ['OD-PA-M06', [11, 7]],
    ['OD-PB-M07', [11, 6]],
    ['OD-PB-M08', [11, 8]],
    ['OD-PB-M09', [11, 4]],
    ['OD-PB-M10', [11, 9]],
    ['OD-PB-M11', [11, 7]],
    ['OD-PB-M12', [11, 8]]
  ]);
  const scores = {};
  for (const match of matches) {
    const score = scoreByMatch.get(match.matchId) || [11, 8];
    scores[match.matchId] = Object.freeze({
      matchId: match.matchId,
      status: 'Official/final',
      games: [Object.freeze({ team1: score[0], team2: score[1] })],
      submittedScoreRetained: true
    });
  }
  return scores;
}
