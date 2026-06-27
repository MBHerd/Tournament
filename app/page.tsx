import Link from "next/link";
import { formatDateRange, getPrimarySnapshot } from "@/src/lib/tournament-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getPrimarySnapshot();
  const { organization, tournament, venue, counts } = snapshot;
  const publicUrl = `/t/${tournament.slug}`;
  const orgUrl = `/org/${organization.slug}`;

  return (
    <>
      <section className="app-opening" aria-labelledby="opening-title">
        <img className="opening-logo" src="/brand/himsog-logo-transparent.png" alt="Himsog.Life" />
        <div className="opening-copy">
          <p className="eyebrow">Tournament Manager</p>
          <h2 id="opening-title">{tournament.name}</h2>
          <p>{tournament.description || "Live tournament operations for Himsog.Life."}</p>
          <div className="badges">
            <span className={snapshot.source === "supabase" ? "badge green" : "badge amber"}>{snapshot.source === "supabase" ? "Live Supabase data" : "Demo fallback"}</span>
            <span className="badge blue">{organization.name}</span>
            <span className="badge green">{formatDateRange(tournament)}</span>
          </div>
          <a className="primary opening-action" href="#role-dashboard">Choose your role</a>
        </div>
      </section>

      <section id="role-dashboard" className="role-dashboard" aria-labelledby="role-title">
        <div className="panel-header">
          <h2 id="role-title">Choose Your Role</h2>
          <p>Start from the workspace that matches what you are doing right now.</p>
        </div>
        <div className="role-grid">
          <RoleCard title="Tournament Director" detail="Profile, imports, scores, standings, and bracket control" href="/admin/operations" action="Open operations" />
          <RoleCard title="Registration Desk" detail="Teams, pasted spreadsheet rows, and workbook CSV exports" href="/admin" action="Open admin" />
          <RoleCard title="Referee or Scorekeeper" detail="Enter official scores and keep standings current" href="/admin/operations" action="Enter scores" />
          <RoleCard title="Player or Team" detail="Tournament details, schedule, and public results" href={publicUrl} action="View tournament" />
          <RoleCard title="Spectator" detail="Public match information and event status" href={publicUrl} action="Open public page" />
          <RoleCard title="Organization Owner" detail="Organization profile and current tournament workspace" href={orgUrl} action="Open organization" />
        </div>
      </section>

      <section className="grid" style={{ marginTop: 16 }}>
        <Metric title="Organizations" value={counts.organizations} detail={organization.name} />
        <Metric title="Tournament" value={counts.tournaments} detail={tournament.status.replaceAll("_", " ")} />
        <Metric title="Teams" value={counts.teams} detail="Saved registrations" />
        <Metric title="Matches" value={counts.matches} detail="Saved schedule rows" />
      </section>

      <section className="grid two">
        <Panel title="Live Tournament" subtitle="This panel reads from Supabase on every request">
          <div className="grid">
            <div className="card"><h3>Public URL</h3><strong>/{tournament.slug}</strong><p><Link href={publicUrl}>Open public tournament page</Link></p></div>
            <div className="card"><h3>Organization</h3><strong>{organization.slug}</strong><p><Link href={orgUrl}>Open organization workspace</Link></p></div>
            <div className="card"><h3>Venue</h3><strong>{venue?.name ?? "Pending"}</strong><p>{[venue?.city, venue?.region].filter(Boolean).join(", ") || "Add venue details in Admin"}</p></div>
            <div className="card"><h3>Results</h3><strong>{tournament.public_results_enabled ? "On" : "Off"}</strong><p>Controlled from the admin editor</p></div>
          </div>
        </Panel>

        <Panel title="Admin Actions" subtitle="Start here when you want to change the app">
          <div className="actions stacked">
            <Link className="primary text-button" href="/admin">Edit tournament profile</Link>
            <Link className="secondary-action" href="/login">Sign in</Link>
            <Link className="secondary-action" href="/deploy">Deployment readiness</Link>
          </div>
        </Panel>
      </section>

      <Panel title="Rules Summary" subtitle="Public notes shown from the saved tournament record">
        <p>{tournament.rules_summary || "Add rules and format notes in Admin."}</p>
      </Panel>
    </>
  );
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <article className="card"><h3>{title}</h3><strong>{value}</strong><p>{detail}</p></article>;
}

function RoleCard({ title, detail, href, action }: { title: string; detail: string; href: string; action: string }) {
  return (
    <Link className="role-card" href={href}>
      <span>{title}</span>
      <strong>{action}</strong>
      <p>{detail}</p>
    </Link>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-header"><h2>{title}</h2><p>{subtitle}</p></div><div className="panel-body">{children}</div></section>;
}
