import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateRange, getPublicTournament } from "@/src/lib/tournament-data";

export const dynamic = "force-dynamic";

type PublicTournamentPageProps = {
  params: Promise<{ tournamentSlug: string }>;
};

export default async function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const { tournamentSlug } = await params;
  const snapshot = await getPublicTournament(tournamentSlug);
  if (!snapshot) notFound();

  const { organization, tournament, venue, counts } = snapshot;

  return (
    <>
      <section className="hero compact">
        <h2>{tournament.name}</h2>
        <p>{tournament.description || "Tournament details are being prepared."}</p>
        <div className="badges">
          <span className="badge green">{formatDateRange(tournament)}</span>
          <span className="badge blue">{venue?.name ?? "Venue pending"}</span>
          <span className="badge amber">/{tournament.slug}</span>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 16 }}>
        <Metric title="Organization" value={organization.name} detail={organization.public_profile_enabled ? "Public profile enabled" : "Managed organization"} />
        <Metric title="Teams" value={counts.teams} detail="Registered teams" />
        <Metric title="Matches" value={counts.matches} detail={tournament.public_results_enabled ? "Results may be shown" : "Results hidden"} />
        <Metric title="Courts" value={counts.courts} detail={venue?.name ?? "Venue pending"} />
      </section>

      <section className="grid two">
        <section className="panel">
          <div className="panel-header">
            <h2>Event Details</h2>
            <p>Updated from the admin workspace.</p>
          </div>
          <div className="panel-body table-wrap">
            <table>
              <tbody>
                <tr><td>Status</td><td><span className="badge green">{tournament.status.replaceAll("_", " ")}</span></td></tr>
                <tr><td>Dates</td><td>{formatDateRange(tournament)}</td></tr>
                <tr><td>Timezone</td><td>{tournament.timezone}</td></tr>
                <tr><td>Contact</td><td>{tournament.contact_email ?? "Not published"}</td></tr>
                <tr><td>Phone</td><td>{tournament.contact_phone ?? "Not published"}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Venue</h2>
            <p>Where players and spectators should go.</p>
          </div>
          <div className="panel-body">
            <h3>{venue?.name ?? "Venue pending"}</h3>
            <p>{[venue?.address, venue?.city, venue?.region, venue?.country].filter(Boolean).join(", ") || "Location details are not published yet."}</p>
            {venue?.map_url || tournament.map_url ? <Link className="secondary-action" href={venue?.map_url ?? tournament.map_url ?? "#"}>Open map</Link> : null}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Rules Summary</h2>
          <p>Public competition notes.</p>
        </div>
        <div className="panel-body">
          <p>{tournament.rules_summary || "Rules and format details will appear here when published."}</p>
          {!tournament.public_results_enabled ? <div className="notice amber">Live results are currently hidden by the tournament director.</div> : null}
        </div>
      </section>
    </>
  );
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <article className="card"><h3>{title}</h3><strong>{value}</strong><p>{detail}</p></article>;
}
