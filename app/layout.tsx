import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Himsog.Life Tournament Manager",
  description: "Multi-organization pickleball tournament management foundation",
  manifest: "/manifest.webmanifest"
};

const navItems = [
  ["/", "Dashboard"],
  ["/admin/create", "Create"],
  ["/admin", "Platform"],
  ["/admin/operations", "Operations"],
  ["/schema", "Schema"],
  ["/deploy", "Deploy"],
  ["/org/gingoog-pickleball", "Organization"],
  ["/t/gingoog-open-2026", "Public"],
  ["/login", "Login"]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="app-header">
            <Link className="brand" href="/">
              <img className="brand-mark" src="/icons/himsog-icon.svg" alt="" />
              <div>
                <p>Himsog.Life</p>
                <h1>Tournament Manager</h1>
              </div>
            </Link>
            <nav className="nav" aria-label="Primary">
              {navItems.map(([href, label]) => (
                <Link href={href} key={href}>{label}</Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
