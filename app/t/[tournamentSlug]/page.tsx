import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";
import { calculateStandings } from "@/src/domain/standings/calculate-standings.mjs";
import { seedBracket } from "@/src/domain/brackets/seed-bracket.mjs";

export default function PublicTournamentPage({ params }: { params: { tournamentSlug: string } }) {
  const demo = miniTournamentDemo();
  const standings = calculateStandings({ teams: demo.teams, matches: demo.matches, officialScores: demo.officialScores });
  const bracket = seedBracket({ standings, bracketSize: 4 });
  return (
    <>
      <section className="hero">
        <h2>{demo.tournament.name}</h2>
        <p>{demo.tournament.dateLabel} / {demo.venue.name} / Traditional doubles pool play into a single-elimination bracket.</p>
        <div className="badges"><span className="badge green">Published public shell</span><span className="badge blue">/{params.tournamentSlug}</span><span className="badge amber">No contact or payment status exposed</span></div>
      </section>
      <section className="grid two">
        <section className="panel"><div className="panel-header"><h2>Schedule</h2><p>Generated pool matches for the mini tournament demo.</p></div><div className="panel-body table-wrap"><table><thead><tr><th>Match</th><th>Pool</th><th>Teams</th><th>Court</th></tr></thead><tbody>{demo.matches.map((match) => <tr key={match.matchId}><td>{match.matchId}</td><td>{match.pool}</td><td>{match.team1Name} vs {match.team2Name}</td><td>{match.courtName}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="panel-header"><h2>Bracket</h2><p>Published four-team bracket seed.</p></div><div className="panel-body"><div className="grid">{bracket.seeds.map((seed) => <div className="card" key={seed.seed}><h3>Seed {seed.seed}</h3><strong>{seed.teamName}</strong><p>{seed.source}</p></div>)}</div></div></section>
      </section>
      <section className="panel"><div className="panel-header"><h2>Pool Standings</h2><p>Calculated from approved official scores only.</p></div><div className="panel-body table-wrap"><table><thead><tr><th>Rank</th><th>Pool</th><th>Team</th><th>Wins</th><th>Point diff</th></tr></thead><tbody>{standings.map((row) => <tr key={row.teamId}><td>{row.rank}</td><td>{row.pool}</td><td>{row.teamName}</td><td>{row.wins}</td><td>{row.pointDiff}</td></tr>)}</tbody></table></div></section>
    </>
  );
}
