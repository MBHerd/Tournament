import { matchWinner } from '../scores/validation.mjs';

export function calculateStandings({ teams, matches, officialScores }) {
  const rows = teams.map((team) => ({
    organizationId: team.organizationId,
    tournamentId: team.tournamentId,
    divisionId: team.divisionId,
    pool: team.pool,
    teamId: team.teamId,
    teamName: team.teamName,
    played: 0,
    wins: 0,
    losses: 0,
    gamesWon: 0,
    gamesLost: 0,
    gameDiff: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0,
    headToHead: 0,
    rank: null,
    reason: 'No approved scores yet.'
  }));
  const byTeam = new Map(rows.map((row) => [row.teamId, row]));

  for (const match of matches) {
    const score = officialScores[match.matchId];
    const winner = matchWinner(match, score);
    if (!winner) continue;
    const first = byTeam.get(match.team1Id);
    const second = byTeam.get(match.team2Id);
    if (!first || !second) continue;
    first.played += 1;
    second.played += 1;
    if (winner === first.teamId) {
      first.wins += 1;
      second.losses += 1;
    } else {
      second.wins += 1;
      first.losses += 1;
    }
    for (const game of score.games) {
      first.pointsFor += game.team1;
      first.pointsAgainst += game.team2;
      second.pointsFor += game.team2;
      second.pointsAgainst += game.team1;
      if (game.team1 > game.team2) {
        first.gamesWon += 1;
        second.gamesLost += 1;
      } else {
        second.gamesWon += 1;
        first.gamesLost += 1;
      }
    }
  }

  for (const row of rows) {
    row.gameDiff = row.gamesWon - row.gamesLost;
    row.pointDiff = row.pointsFor - row.pointsAgainst;
  }

  const rowsByPool = groupBy(rows, (row) => row.pool);
  for (const poolRows of rowsByPool.values()) {
    const tiedByWins = groupBy(poolRows.filter((row) => row.played > 0), (row) => String(row.wins));
    for (const tiedRows of tiedByWins.values()) {
      if (tiedRows.length < 2) continue;
      const tiedTeams = new Set(tiedRows.map((row) => row.teamId));
      for (const match of matches) {
        if (!tiedTeams.has(match.team1Id) || !tiedTeams.has(match.team2Id)) continue;
        const winner = matchWinner(match, officialScores[match.matchId]);
        if (winner && byTeam.has(winner)) byTeam.get(winner).headToHead += 1;
      }
    }
    poolRows.sort(standingSort).forEach((row, index, sorted) => {
      row.rank = index + 1;
      row.reason = rankingReason(row, sorted[index - 1]);
    });
  }

  return rows.sort((a, b) => a.pool.localeCompare(b.pool) || a.rank - b.rank);
}

export function standingSort(a, b) {
  return (b.wins - a.wins) ||
    (b.headToHead - a.headToHead) ||
    (b.gameDiff - a.gameDiff) ||
    (b.pointDiff - a.pointDiff) ||
    (b.pointsFor - a.pointsFor) ||
    (a.pointsAgainst - b.pointsAgainst) ||
    a.teamName.localeCompare(b.teamName);
}

function rankingReason(row, previous) {
  if (!previous) return 'Leads pool on approved match wins and tiebreakers.';
  if (row.wins !== previous.wins) return 'Team above has more match wins.';
  if (row.headToHead !== previous.headToHead) return 'Ordered by head-to-head among tied teams.';
  if (row.gameDiff !== previous.gameDiff) return 'Ordered by game differential.';
  if (row.pointDiff !== previous.pointDiff) return 'Ordered by point differential.';
  if (row.pointsFor !== previous.pointsFor) return 'Ordered by points won.';
  if (row.pointsAgainst !== previous.pointsAgainst) return 'Ordered by fewest points allowed.';
  return 'Still tied; manual TD decision required.';
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}
