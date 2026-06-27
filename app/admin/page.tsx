import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { saveTournamentProfile } from "@/app/admin/actions";
import { exportDefinitions } from "@/src/lib/interop-exports";
import { formatDateRange, getPrimarySnapshot } from "@/src/lib/tournament-data";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statuses = [
  "draft",
  "published",
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
  "archived",
  "canceled"
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const saved = firstParam(params?.saved);
  const error = firstParam(params?.error);
  const snapshot = await getPrimarySnapshot();
  const { organization, tournament, venue, counts } = snapshot;
  const publicUrl = `/t/${tournament.slug}`;
  const orgUrl = `/org/${organization.slug}`;

  return (
    <>
      <section className="hero compact">
        <h2>Admin Workspace</h2>
        <p>Edit the live organization, venue, and tournament profile saved in Supabase.</p>
        <div className="badges">
          <span className={snapshot.source === "supabase" ? "badge green" : "badge amber"}>
            {snapshot.source === "supabase" ? "Live Supabase data" : "Demo fallback"}
          </span>
          <span className="badge blue">{formatDateRange(tournament)}</span>
          <span className={tournament.public_page_enabled ? "badge green" : "badge amber"}>
            {tournament.public_page_enabled ? "Public page on" : "Public page off"}
          </span>
        </div>
      </section>

      {saved ? <div className="notice green">Saved. Public page updated at <Link href={publicUrl}>{publicUrl}</Link>.</div> : null}
      {error ? <div className="notice red">{error}</div> : null}

      <section className="grid" style={{ marginTop: 16 }}>
        <Metric title="Organizations" value={counts.organizations} detail={organization.name} />
        <Metric title="Tournaments" value={counts.tournaments} detail={tournament.name} />
        <Metric title="Teams" value={counts.teams} detail="Saved team registrations" />
        <Metric title="Matches" value={counts.matches} detail="Scheduled or completed matches" />
      </section>

      <section className="grid two">
        <section className="panel">
          <div className="panel-header">
            <h2>Tournament Editor</h2>
            <p>Changes save to Supabase and update the public pages immediately.</p>
          </div>
          <form action={saveTournamentProfile} className="panel-body form-grid">
            <input type="hidden" name="organizationId" value={snapshot.source === "supabase" ? organization.id : ""} />
            <input type="hidden" name="venueId" value={snapshot.source === "supabase" && venue ? venue.id : ""} />
            <input type="hidden" name="tournamentId" value={snapshot.source === "supabase" ? tournament.id : ""} />

            <div className="form-section">
              <h3>Organization</h3>
              <div className="form-grid two-column">
                <label>Name<input name="organizationName" defaultValue={organization.name} required /></label>
                <label>Slug<input name="organizationSlug" defaultValue={organization.slug} required /></label>
                <label>Email<input name="organizationEmail" type="email" defaultValue={organization.contact_email ?? ""} /></label>
                <label>Phone<input name="organizationPhone" defaultValue={organization.contact_phone ?? ""} /></label>
              </div>
              <label>Description<textarea name="organizationDescription" defaultValue={organization.description} rows={3} /></label>
              <label className="check-row"><input name="organizationPublic" type="checkbox" defaultChecked={organization.public_profile_enabled} /> Public organization profile</label>
            </div>

            <div className="form-section">
              <h3>Venue</h3>
              <div className="form-grid two-column">
                <label>Name<input name="venueName" defaultValue={venue?.name ?? ""} required /></label>
                <label>Country<input name="venueCountry" defaultValue={venue?.country ?? "Philippines"} /></label>
                <label>City<input name="venueCity" defaultValue={venue?.city ?? ""} /></label>
                <label>Region<input name="venueRegion" defaultValue={venue?.region ?? ""} /></label>
              </div>
              <label>Address<input name="venueAddress" defaultValue={venue?.address ?? ""} /></label>
              <label>Map URL<input name="venueMapUrl" type="url" defaultValue={venue?.map_url ?? ""} /></label>
            </div>

            <div className="form-section">
              <h3>Tournament</h3>
              <div className="form-grid two-column">
                <label>Name<input name="tournamentName" defaultValue={tournament.name} required /></label>
                <label>Slug<input name="tournamentSlug" defaultValue={tournament.slug} required /></label>
                <label>Start date<input name="startDate" type="date" defaultValue={tournament.start_date ?? ""} /></label>
                <label>End date<input name="endDate" type="date" defaultValue={tournament.end_date ?? ""} /></label>
                <label>Timezone<input name="timezone" defaultValue={tournament.timezone} /></label>
                <label>Status<select name="status" defaultValue={tournament.status}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
                <label>Email<input name="tournamentEmail" type="email" defaultValue={tournament.contact_email ?? ""} /></label>
                <label>Phone<input name="tournamentPhone" defaultValue={tournament.contact_phone ?? ""} /></label>
              </div>
              <label>Description<textarea name="tournamentDescription" defaultValue={tournament.description} rows={4} /></label>
              <label>Rules summary<textarea name="rulesSummary" defaultValue={tournament.rules_summary ?? ""} rows={3} /></label>
              <label>Map URL<input name="tournamentMapUrl" type="url" defaultValue={tournament.map_url ?? ""} /></label>
              <div className="inline-checks">
                <label className="check-row"><input name="publicPageEnabled" type="checkbox" defaultChecked={tournament.public_page_enabled} /> Public page visible</label>
                <label className="check-row"><input name="publicResultsEnabled" type="checkbox" defaultChecked={tournament.public_results_enabled} /> Public results visible</label>
              </div>
            </div>

            <div className="actions">
              <button className="primary" type="submit">Save live changes</button>
              <Link className="secondary-action" href="/admin/operations">Open operations</Link>
              <Link className="secondary-action" href={publicUrl}>View public page</Link>
              <Link className="secondary-action" href={orgUrl}>View organization</Link>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Live Preview</h2>
            <p>This is what the public tournament profile reads from Supabase.</p>
          </div>
          <div className="panel-body grid">
            <article className="card"><h3>Organization</h3><strong>{organization.name}</strong><p>/{organization.slug}</p></article>
            <article className="card"><h3>Tournament</h3><strong>{tournament.name}</strong><p>/{tournament.slug}</p></article>
            <article className="card"><h3>Venue</h3><strong>{venue?.name ?? "No venue"}</strong><p>{[venue?.city, venue?.region].filter(Boolean).join(", ") || "Location pending"}</p></article>
            <article className="card"><h3>Audit events</h3><strong>{counts.auditEvents}</strong><p>Latest admin saves are recorded.</p></article>
          </div>
          <div className="panel-body">
            <form action={signOut}>
              <button className="primary blue-button" type="submit">Sign out</button>
            </form>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Spreadsheet Interop</h2>
          <p>Download workbook-compatible CSVs for copy/paste, auditing, score sheets, and offline tournament operations.</p>
        </div>
        <div className="panel-body">
          <Link className="secondary-action" href="/admin/operations">Paste imports, enter scores, and review standings</Link>
        </div>
        <div className="panel-body interop-grid">
          {exportDefinitions.map((item) => (
            <a key={item.kind} className="export-link" href={`/admin/exports/${item.kind}`}>
              <strong>{item.label}</strong>
              <span>{item.filename}</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <article className="card"><h3>{title}</h3><strong>{value}</strong><p>{detail}</p></article>;
}
