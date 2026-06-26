import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";
import { calculateStandings } from "@/src/domain/standings/calculate-standings.mjs";
import { seedBracket } from "@/src/domain/brackets/seed-bracket.mjs";
import { can } from "@/src/domain/auth/permissions.mjs";

export default function HomePage() {
  const demo = miniTournamentDemo();
  const standings = calculateStandings({ teams: demo.teams, matches: demo.matches, officialScores: demo.officialScores });
  const bracket = seedBracket({ standings, bracketSize: 4 });
  const approvedScores = Object.keys(demo.officialScores).length;
  const platformCanManageOrgs = can({ role: "Platform Admin" }, "organizations.manage");

  return (
    <>
      <section className="hero">
        <h2>Foundation for serious tournament operations.</h2>
        <p>Multi-organization setup, role gates, PostgreSQL schema, audit logging, seed data, and tested tournament rules are in place for the Himsog.Life build.</p>
        <div className="badges">
          <span className="badge green">Foundation phase</span>
          <span className="badge blue">PostgreSQL ready</span>
          <span className="badge amber">Mini tournament seeded</span>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 16 }}>
        <Metric title="Organizations" value="1" detail={demo.organization.name} />
        <Metric title="Tournament" value="1" detail={demo.tournament.name} />
        <Metric title="Teams" value={demo.teams.length} detail="Two pools of four" />
        <Metric title="Approved scores" value={approvedScores} detail="Referee submissions retained separately" />
      </section>

      <section className="grid two">
        <Panel title="Foundation Modules" subtitle="Clean boundaries for the modules named in the prompt">
          <div className="grid">
            {demo.modules.map((module: string) => <div className="card" key={module}><h3>{module}</h3><p>Domain boundary created for future server actions and database screens.</p></div>)}
          </div>
        </Panel>
        <Panel title="Role Gates" subtitle="Practical RBAC starts at the app edge">
          <table>
            <tbody>
              <tr><td>Platform Admin</td><td>{platformCanManageOrgs ? <Badge tone="green">can manage organizations</Badge> : <Badge tone="red">blocked</Badge>}</td></tr>
              <tr><td>Referee</td><td>{can({ role: "Referee" }, "scores.submit") ? <Badge tone="green">can submit scores</Badge> : <Badge tone="red">blocked</Badge>}</td></tr>
              <tr><td>Public Viewer</td><td>{can({ role: "Public Viewer" }, "scores.approve") ? <Badge tone="red">over-permitted</Badge> : <Badge tone="green">cannot approve scores</Badge>}</td></tr>
            </tbody>
          </table>
        </Panel>
      </section>

      <Panel title="Demo Mini Tournament" subtitle="Eight teams, two pools, generated standings, and four-team bracket seed">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Rank</th><th>Pool</th><th>Team</th><th>Wins</th><th>Point diff</th><th>Reason</th></tr></thead>
            <tbody>
              {standings.map((row: any) => (
                <tr key={row.teamId}><td>{row.rank}</td><td>{row.pool}</td><td>{row.teamName}</td><td>{row.wins}</td><td>{row.pointDiff}</td><td>{row.reason}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="badges">
          {bracket.seeds.map((seed: any) => <span className="badge blue" key={seed.seed}>Seed {seed.seed}: {seed.teamName}</span>)}
        </div>
      </Panel>
    </>
  );
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <article className="card"><h3>{title}</h3><strong>{value}</strong><p>{detail}</p></article>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-header"><h2>{title}</h2><p>{subtitle}</p></div><div className="panel-body">{children}</div></section>;
}

function Badge({ tone, children }: { tone: "green" | "blue" | "amber" | "red"; children: React.ReactNode }) {
  return <span className={'badge ' + tone}>{children}</span>;
}
