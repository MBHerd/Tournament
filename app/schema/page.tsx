import { dataSeparationRules, schemaGroups, statusCatalog } from "@/src/domain/schema/schema-outline.mjs";
import { publicHiddenFields } from "@/src/domain/public/public-queries.mjs";

export default function SchemaPage() {
  const tableCount = schemaGroups.reduce((sum, group) => sum + group.tables.length, 0);
  return (
    <>
      <section className="hero">
        <h2>Database schema foundation</h2>
        <p>The PostgreSQL outline has been converted into a real migration with module ownership, status catalogs, indexes, and public-data privacy rules.</p>
        <div className="badges">
          <span className="badge green">{tableCount} tables</span>
          <span className="badge blue">Immutable audit log</span>
          <span className="badge amber">Organization scoped</span>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 16 }}>
        {schemaGroups.map((group: any) => (
          <article className="card" key={group.name}>
            <h3>{group.name}</h3>
            <strong>{group.tables.length}</strong>
            <p>{group.description}</p>
            <div className="badges">{group.tables.map((table: string) => <span className="badge blue" key={table}>{table}</span>)}</div>
          </article>
        ))}
      </section>

      <section className="grid two">
        <section className="panel">
          <div className="panel-header"><h2>Status Catalog</h2><p>Database check constraints and app modules use the same vocabulary.</p></div>
          <div className="panel-body table-wrap"><table><thead><tr><th>Area</th><th>Statuses</th></tr></thead><tbody>{Object.entries(statusCatalog).map(([area, statuses]: [string, any]) => <tr key={area}><td>{area}</td><td>{statuses.join(', ')}</td></tr>)}</tbody></table></div>
        </section>
        <section className="panel">
          <div className="panel-header"><h2>Public Privacy</h2><p>Fields excluded from public organization, tournament, player, and team queries.</p></div>
          <div className="panel-body"><div className="badges">{publicHiddenFields.map((field: string) => <span className="badge red" key={field}>{field}</span>)}</div></div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Data Separation Rule</h2><p>These rules are enforced in domain helpers and mirrored by database indexes.</p></div>
        <div className="panel-body"><div className="grid">{dataSeparationRules.map((rule: string) => <div className="card" key={rule}><h3>Rule</h3><p>{rule}</p></div>)}</div></div>
      </section>
    </>
  );
}
