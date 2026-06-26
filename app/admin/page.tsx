import { can } from "@/src/domain/auth/permissions.mjs";
import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";

export default function AdminPage() {
  const demo = miniTournamentDemo();
  const admin = { role: "Platform Admin" };
  const rows = [
    ["Manage organizations", "organizations.manage"],
    ["Manage users", "users.manage"],
    ["View all tournaments", "tournaments.view_all"],
    ["System audit log", "audit.system_view"]
  ];

  return (
    <>
      <section className="hero">
        <h2>Platform Admin</h2>
        <p>System-level foundation for organizations, users, tournaments, and audit history.</p>
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Initial Role Gates</h2><p>These checks are shared with server actions and tests.</p></div>
        <div className="panel-body table-wrap">
          <table><thead><tr><th>Capability</th><th>Permission</th><th>Status</th></tr></thead><tbody>{rows.map(([label, permission]) => <tr key={permission}><td>{label}</td><td>{permission}</td><td><span className="badge green">{can(admin, permission) ? "Allowed" : "Blocked"}</span></td></tr>)}</tbody></table>
        </div>
      </section>
      <section className="grid">
        <div className="card"><h3>Organizations</h3><strong>1</strong><p>{demo.organization.name}</p></div>
        <div className="card"><h3>Users</h3><strong>{demo.users.length}</strong><p>Seeded across organization roles</p></div>
        <div className="card"><h3>Audit events</h3><strong>{demo.auditLog.length}</strong><p>Append-only event contract</p></div>
      </section>
    </>
  );
}
