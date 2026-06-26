export function validateGameScore({ team1, team2, target = 11, winBy = 2 }) {
  const warnings = [];
  if (!Number.isInteger(team1) || !Number.isInteger(team2) || team1 < 0 || team2 < 0) {
    warnings.push('Scores must be non-negative whole numbers.');
    return warnings;
  }
  if (team1 === team2) warnings.push('A tied final game cannot produce a winner.');
  const winner = Math.max(team1, team2);
  const margin = Math.abs(team1 - team2);
  if (winner < target) warnings.push('Winner is below the target score of ' + target + '.');
  if (margin < winBy) warnings.push('Win-by-' + winBy + ' requirement was not met.');
  if (winner > target + 8) warnings.push('Score is unusually high for this format; confirm override.');
  return warnings;
}

export function validateMatchScore({ games, format }) {
  const target = format?.target || 11;
  const winBy = format?.winBy || 2;
  const warnings = [];
  for (const game of games) warnings.push(...validateGameScore({ team1: game.team1, team2: game.team2, target, winBy }));
  return [...new Set(warnings)];
}

export function matchWinner(match, officialScore) {
  if (!officialScore || !officialScore.games || !officialScore.games.length) return null;
  let team1Games = 0;
  let team2Games = 0;
  for (const game of officialScore.games) {
    if (game.team1 > game.team2) team1Games += 1;
    if (game.team2 > game.team1) team2Games += 1;
  }
  if (team1Games === team2Games) return null;
  return team1Games > team2Games ? match.team1Id : match.team2Id;
}
