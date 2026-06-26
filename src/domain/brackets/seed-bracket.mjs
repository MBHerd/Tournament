export function seedBracket({ standings, bracketSize = 4 }) {
  if (bracketSize !== 4) throw new Error('Foundation demo supports a 4-team bracket.');
  const pools = [...new Set(standings.map((row) => row.pool))].sort();
  if (pools.length < 2) throw new Error('Two pools are required for the foundation bracket.');
  const top = pools.map((pool) => standings.filter((row) => row.pool === pool && row.rank <= 2).sort((a, b) => a.rank - b.rank));
  if (top.some((poolRows) => poolRows.length < 2)) throw new Error('Each pool needs two advancing teams.');
  const seeds = [
    { seed: 1, teamId: top[0][0].teamId, teamName: top[0][0].teamName, source: 'Pool ' + pools[0] + ' #1' },
    { seed: 2, teamId: top[1][0].teamId, teamName: top[1][0].teamName, source: 'Pool ' + pools[1] + ' #1' },
    { seed: 3, teamId: top[0][1].teamId, teamName: top[0][1].teamName, source: 'Pool ' + pools[0] + ' #2' },
    { seed: 4, teamId: top[1][1].teamId, teamName: top[1][1].teamName, source: 'Pool ' + pools[1] + ' #2' }
  ];
  return {
    seeds,
    matches: [
      { matchId: 'BR-SF1', round: 'Semifinal', team1Seed: 1, team2Seed: 4 },
      { matchId: 'BR-SF2', round: 'Semifinal', team1Seed: 2, team2Seed: 3 },
      { matchId: 'BR-BRONZE', round: 'Bronze', team1Source: 'Loser SF1', team2Source: 'Loser SF2' },
      { matchId: 'BR-FINAL', round: 'Final', team1Source: 'Winner SF1', team2Source: 'Winner SF2' }
    ],
    published: true
  };
}
