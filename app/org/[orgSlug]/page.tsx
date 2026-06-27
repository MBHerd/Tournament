import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateRange, getOrganizationSnapshot } from "@/src/lib/tournament-data";

export const dynamic = "force-dynamic";

type OrganizationPageProps = {
  params: Promise<{ orgSlug: string }>;
};

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const { orgSlug } = await params;
  const snapshot = await getOrganizationSnapshot(orgSlug);
  if (!snapshot) notFound();

  const { organization, tournament, venue, counts } = snapshot;

  return (
    <>
      <section className="hero compact">
        <h2>{organization.name}</h2>
        <p>{organization.description || "Organization workspace for profile settings, staff roles, tournament list, and audit history."}</p>
        <div className="badges">
          <span className="badge green">/{organization.slug}</span>
          <span className={snapshot.source === "supabase" ? "badge blue" : "badge amber"}>{snapshot.source === "supabase" ? "Live data" : "Demo fallback"}</span>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 16 }}>
        <div className="card"><h3>Tournaments</h3><strong>{counts.tournaments}</strong><p>{tournament.name}</p></div>
        <div className="card"><h3>Teams</h3><strong>{counts.teams}</strong><p>Current saved teams</p></div>
        <div className="card"><h3>Courts</h3><strong>{counts.courts}</strong><p>{venue?.name ?? "Venue pending"}</p></div>
        <div className="card"><h3>Audit events</h3><strong>{counts.auditEvents}</strong><p>Organization history</p></div>
      </section>

      <section className="grid two">
        <section className="panel">
          <div className="panel-header">
            <h2>Current Tournament</h2>
            <p>Saved from the admin workspace.</p>
          </div>
          <div className="panel-body">
            <h3>{tournament.name}</h3>
            <p>{tournament.description || "Tournament description pending."}</p>
            <div className="badges">
              <span className="badge blue">{formatDateRange(tournament)}</span>
              <span className="badge green">{tournament.status.replaceAll("_", " ")}</span>
              <span className={tournament.public_page_enabled ? "badge green" : "badge amber"}>
                {tournament.public_page_enabled ? "Public" : "Private"}
              </span>
            </div>
            <div className="actions">
              <Link className="secondary-action" href={`/t/${tournament.slug}`}>Open public page</Link>
              <Link className="secondary-action" href="/admin">Edit</Link>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Venue</h2>
            <p>Live location details.</p>
          </div>
          <div className="panel-body">
            <h3>{venue?.name ?? "Venue pending"}</h3>
            <p>{[venue?.address, venue?.city, venue?.region, venue?.country].filter(Boolean).join(", ") || "Location details can be added in Admin."}</p>
            {venue?.map_url ? <Link className="secondary-action" href={venue.map_url}>Open map</Link> : null}
          </div>
        </section>
      </section>
    </>
  );
}
