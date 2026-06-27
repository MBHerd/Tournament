import Link from "next/link";
import { importSpreadsheetRows, saveMatchScore } from "@/app/admin/operations/actions";
import { getOperationsData } from "@/src/lib/operations-data";

export const dynamic = "force-dynamic";

type OperationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const params = await searchParams;
  const imported = firstParam(params?.imported);
  const savedScore = firstParam(params?.savedScore);
  const error = firstParam(params?.error);
  const data = await getOperationsData();
  const scoreRows = data.matches.slice(0, 40);

  return (
    <>
      <section className="hero compact">
        <h2>Tournament Operations</h2>
        <p>Paste spreadsheet rows, save official scores, and review standings and brackets from the live database.</p>
        <div className="badges">
          <span className={data.source === "supabase" ? "badge green" : "badge amber"}>{data.source === "supabase" ? "Live Supabase data" : "Demo fallback"}</span>
          <span className="badge blue">{data.tournamentName}</span>
        </div>
      </section>

      {imported ? <div className="notice green">Imported {imported} spreadsheet rows.</div> : null}
      {savedScore ? <div className="notice green">Official score saved. Standings updated.</div> : null}
      {error ? <div className="notice red">{error}</div> : null}

      <section className="grid two">
        <section className="panel">
          <div className="panel-header">
            <h2>Paste From Spreadsheet</h2>
            <p>Use the CSV exports as templates, then paste edited rows back here.</p>
          </div>
          <div className="panel-body form-grid">
            <ImportForm title="Teams" kind="teams" placeholder={"Skill Group,Pool,Team ID,Player 1,Player 2,Status,Payment Status,Seed\nBeginners,A,B-A1,Juan Dela Cruz,Ana Santos,confirmed,paid,1"} />
            <ImportForm title="Schedule or Score Entry" kind="score-entry" placeholder={"Match ID,Division,Pool,Stage,Court,Team 1,Team 2,Team 1 Score,Team 2 Score\nB001,Beginners,A,Pool Play,1,B-A1,B-A2,11,8"} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Bracket Control</h2>
            <p>Bracket matches use the same score controls and export/import format as pool matches.</p>
          </div>
          <div className="panel-body">
            {data.bracket.length ? (
              <div className="mini-list">
                {data.bracket.slice(0, 12).map((match) => (
                  <article className="mini-row" key={match.id}>
                    <strong>{match.matchId}</strong>
                    <span>{match.stage}</span>
                    <span>{match.team1 || "TBD"} vs {match.team2 || "TBD"}</span>
                    <span className={match.status === "official_final" ? "badge green" : "badge amber"}>{match.status}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No bracket matches yet. Import bracket/schedule rows when the bracket is ready.</p>
            )}
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="secondary-action" href="/admin/exports/bracket">Download bracket CSV</Link>
              <Link className="secondary-action" href="/admin/exports/score-entry">Download score entry CSV</Link>
            </div>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Live Score Entry</h2>
          <p>Scores become official immediately and feed the standings table.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Match</th>
                <th>Division</th>
                <th>Court</th>
                <th>Teams</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scoreRows.map((match) => (
                <tr key={match.id}>
                  <td><strong>{match.matchId}</strong><br /><span className="muted">{match.stage}{match.pool ? ` / Pool ${match.pool}` : ""}</span></td>
                  <td>{match.division}</td>
                  <td>{match.court || "TBD"}</td>
                  <td>{match.team1 || "TBD"}<br /><span className="muted">vs</span><br />{match.team2 || "TBD"}</td>
                  <td>
                    <form action={saveMatchScore} className="score-form">
                      <input type="hidden" name="matchId" value={match.id} />
                      <input aria-label={`${match.matchId} team 1 score`} name="team1Score" type="number" min="0" step="1" defaultValue={match.team1Score} />
                      <span>-</span>
                      <input aria-label={`${match.matchId} team 2 score`} name="team2Score" type="number" min="0" step="1" defaultValue={match.team2Score} />
                      <button type="submit">Save</button>
                    </form>
                  </td>
                  <td><span className={match.status === "official_final" ? "badge green" : "badge blue"}>{match.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Standings</h2>
          <p>Ranked from official scores using wins, point differential, points for, then team name.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Division</th>
                <th>Pool</th>
                <th>Rank</th>
                <th>Team</th>
                <th>W-L</th>
                <th>Win %</th>
                <th>PF</th>
                <th>PA</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.length ? data.standings.map((row) => (
                <tr key={`${row.division}-${row.pool}-${row.team}`}>
                  <td>{row.division}</td>
                  <td>{row.pool}</td>
                  <td>{row.rank}</td>
                  <td><strong>{row.team}</strong></td>
                  <td>{row.wins}-{row.losses}</td>
                  <td>{row.winPct}</td>
                  <td>{row.pointsFor}</td>
                  <td>{row.pointsAgainst}</td>
                  <td>{row.pointDiff}</td>
                </tr>
              )) : (
                <tr><td colSpan={9}>No official scores yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ImportForm({ title, kind, placeholder }: { title: string; kind: string; placeholder: string }) {
  return (
    <form action={importSpreadsheetRows} className="import-box">
      <input type="hidden" name="importKind" value={kind} />
      <label>{title}<textarea name="csvText" rows={7} placeholder={placeholder} /></label>
      <button className="primary" type="submit">Import {title}</button>
    </form>
  );
}
