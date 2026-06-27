import { signInWithEmail, signInWithGoogle } from "@/app/auth/actions";
import { getDeploymentReadiness } from "@/src/lib/env";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = firstParam(params?.error);
  const next = firstParam(params?.next) ?? "/";
  const readiness = getDeploymentReadiness();

  return (
    <section className="form-shell panel">
      <div className="panel-header">
        <h2>Sign in</h2>
        <p>Supabase Auth protects the staff areas and keeps sessions ready for Vercel deployment.</p>
      </div>
      <div className="panel-body form-grid">
        {error ? <div className="notice red">{error}</div> : null}
        {!readiness.supabaseConfigured ? <div className="notice amber">Supabase environment values are pending.</div> : null}

        <form action={signInWithEmail} className="form-grid">
          <input type="hidden" name="next" value={next} />
          <label>Email<input name="email" type="email" placeholder="director@example.com" required /></label>
          <label>Password<input name="password" type="password" placeholder="Password" required /></label>
          <button className="primary" type="submit" disabled={!readiness.supabaseConfigured}>Continue</button>
        </form>

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button className="primary blue-button" type="submit" disabled={!readiness.supabaseConfigured}>Continue with Google</button>
        </form>
      </div>
    </section>
  );
}
