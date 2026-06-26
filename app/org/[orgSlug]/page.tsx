import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";

export default function OrganizationPage({ params }: { params: { orgSlug: string } }) {
  const demo = miniTournamentDemo();
  return (
    <>
      <section className="hero">
        <h2>{demo.organization.name}</h2>
        <p>Organization owner workspace for profile settings, staff roles, tournament list, logos, and organization audit history.</p>
        <div className="badges"><span className="badge green">/{params.orgSlug}</span><span className="badge blue">Data scoped by organization_id</span></div>
      </section>
      <section className="grid">
        <div className="card"><h3>Tournaments</h3><strong>1</strong><p>{demo.tournament.name}</p></div>
        <div className="card"><h3>Staff</h3><strong>{demo.staff.length}</strong><p>Owner, TD, scorekeeper, referee, volunteer</p></div>
        <div className="card"><h3>Courts</h3><strong>{demo.courts.length}</strong><p>{demo.venue.name}</p></div>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Staff and Roles</h2><p>Practical role assignment shell for the first build.</p></div>
        <div className="panel-body table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Scope</th></tr></thead><tbody>{demo.staff.map((person) => <tr key={person.userId}><td>{person.name}</td><td>{person.role}</td><td>{demo.organization.name}</td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
