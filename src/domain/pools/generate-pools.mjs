export function generatePools(teams, poolCount = 2) {
  if (!Array.isArray(teams) || teams.length < poolCount) throw new Error('Not enough teams to generate pools');
  const pools = Array.from({ length: poolCount }, (_, index) => ({
    poolId: String.fromCharCode(65 + index),
    name: 'Pool ' + String.fromCharCode(65 + index),
    teams: []
  }));
  teams.forEach((team, index) => {
    const lap = Math.floor(index / poolCount);
    const poolIndex = lap % 2 === 0 ? index % poolCount : poolCount - 1 - (index % poolCount);
    pools[poolIndex].teams.push({ ...team, pool: pools[poolIndex].poolId });
  });
  return pools;
}
