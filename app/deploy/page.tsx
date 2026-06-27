import { getDeploymentReadiness } from "@/src/lib/env";

export default function DeployPage() {
  const readiness = getDeploymentReadiness();

  return (
    <>
      <section className="hero compact">
        <h2>Deployment-ready tournament operations.</h2>
        <p>Vercel hosts the Next.js app while Supabase provides PostgreSQL, Auth, Storage, and Row Level Security.</p>
        <div className="badges">
          <span className={readiness.requiredConfigured ? "badge green" : "badge amber"}>
            {readiness.requiredConfigured ? "Hosted config ready" : "Hosted config pending"}
          </span>
          <span className="badge blue">Supabase SSR auth</span>
          <span className="badge green">RLS migration included</span>
        </div>
      </section>

      <section className="grid two">
        <section className="panel">
          <div className="panel-header">
            <h2>Environment</h2>
            <p>Values stay in Vercel and Supabase, never in the repository.</p>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Scope</th><th>Status</th></tr></thead>
                <tbody>
                  {readiness.items.map((item) => (
                    <tr key={item.name}>
                      <td><code>{item.name}</code></td>
                      <td>{item.public ? "Browser-safe" : "Server only"}</td>
                      <td><span className={item.configured ? "badge green" : "badge amber"}>{item.configured ? "Set" : "Pending"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Supabase Services</h2>
            <p>The hosted stack maps directly to the tournament app modules.</p>
          </div>
          <div className="panel-body grid">
            <article className="card"><h3>PostgreSQL</h3><p>Foundation schema plus Supabase RLS migration.</p></article>
            <article className="card"><h3>Auth</h3><p>Email/password and Google sign-in through Supabase sessions.</p></article>
            <article className="card"><h3>Storage</h3><p>Public assets and protected tournament files use separate buckets.</p></article>
            <article className="card"><h3>Vercel</h3><p>Next.js build settings and runtime variables are documented.</p></article>
          </div>
        </section>
      </section>
    </>
  );
}
