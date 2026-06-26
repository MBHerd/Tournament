export function generatePoolMatches({ pools, courts, divisionCode = 'MXD' }) {
  if (!Array.isArray(pools) || !pools.length) throw new Error('Pools are required');
  if (!Array.isArray(courts) || !courts.length) throw new Error('Courts are required');
  const matches = [];
  let sequence = 1;
  for (const pool of pools) {
    for (let i = 0; i < pool.teams.length; i += 1) {
      for (let j = i + 1; j < pool.teams.length; j += 1) {
        const court = courts[(sequence - 1) % courts.length];
        matches.push({
          matchId: divisionCode + '-P' + pool.poolId + '-M' + String(sequence).padStart(2, '0'),
          sequence,
          stage: 'Pool Play',
          pool: pool.poolId,
          team1Id: pool.teams[i].teamId,
          team1Name: pool.teams[i].teamName,
          team2Id: pool.teams[j].teamId,
          team2Name: pool.teams[j].teamName,
          courtId: court.courtId,
          courtName: court.name,
          status: 'Scheduled'
        });
        sequence += 1;
      }
    }
  }
  return matches;
}
