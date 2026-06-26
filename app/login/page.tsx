export default function LoginPage() {
  return (
    <section className="form-shell panel">
      <div className="panel-header"><h2>Sign in</h2><p>Email/password and Google OAuth schema are ready for database-backed sessions.</p></div>
      <div className="panel-body form-grid">
        <label>Email<input type="email" placeholder="director@example.com" /></label>
        <label>Password<input type="password" placeholder="Password" /></label>
        <button className="primary" type="button">Continue</button>
        <button className="primary" type="button" style={{ background: "#295f98" }}>Continue with Google</button>
      </div>
    </section>
  );
}
