# Himsog.Life Tournament Manager

Foundation build for a multi-organization pickleball tournament management app.

This project is intentionally scoped to the first implementation phase from the ChatGPT prompt: clean app structure, auth/RBAC foundation, organization and tournament shells, PostgreSQL schema, seed/demo data, audit logging, PWA assets, and tested domain rules for the mini tournament flow.

The deployment build is prepared for Vercel and Supabase: Vercel hosts the Next.js app, while Supabase provides PostgreSQL, Auth, Storage, and Row Level Security.

## What Is Included

- Next.js / React app structure using the App Router.
- PostgreSQL migration and demo seed scripts converted from `PostgreSQL Database Schema Outline.md`.
- Real auth data model for email/password, OAuth accounts, sessions, and organization roles.
- Practical role-gate helpers for platform admin, organization owner, tournament director, registration manager, scorekeeper, referee, player, and public viewer.
- Organization-level data separation helpers.
- Seeded demo mini tournament: one organization, one tournament, four courts, one division, eight teams, two pools, pool matches, approved scores, standings, four-team bracket, and public tournament shell.
- Domain modules for pools, matches, score validation, score approval, standings, bracket seeding, and immutable audit entries.
- Node built-in tests for the important tournament rules.
- PWA manifest, icon, and service worker placeholder for cached pages and queued score submissions.
- Schema explorer page at `/schema` showing table groups, status catalogs, data separation rules, and public privacy fields.
- Supabase SSR auth clients, middleware session refresh, email/password login, Google OAuth redirect flow, and hosted environment readiness page at `/deploy`.
- Supabase RLS and Storage migration for organization-scoped access control.
- Live admin editor at `/admin` for saving organization, venue, and tournament profile changes to Supabase.
- Dynamic home, organization, and public tournament pages that read saved Supabase records.
- Vercel project configuration and deployment documentation.

## Local Setup

1. Install dependencies:

       npm install

2. Copy environment values:

       copy .env.example .env.local

3. Run database migration and seed when PostgreSQL is available:

       npm run db:migrate
       npm run db:rls
       npm run db:seed

4. Start the app:

       npm run dev

5. Run domain tests:

       npm test

## Verification

The domain and schema test suite can run without a database server:

       node --test tests/*.test.mjs

Current coverage checks RBAC, organization separation, pool/match generation, score validation, score approval, standings, bracket seeding, audit immutability, migration table coverage, suggested indexes, submitted-vs-official result separation, and public privacy sanitizers.

## Deployment

- Supabase setup: [docs/supabase-setup.md](docs/supabase-setup.md)
- Vercel deployment: [docs/vercel-deployment.md](docs/vercel-deployment.md)
- Hosted readiness page: `/deploy`

Required hosted values are listed in `.env.example`. Keep `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-only. Only values beginning with `NEXT_PUBLIC_` should be considered browser-safe.

## Editing The App

Sign in and open `/admin` to edit the live organization, venue, and tournament profile. Saving the form writes to Supabase, records an audit event, and updates:

- `/`
- `/org/[organization-slug]`
- `/t/[tournament-slug]`

Production build was verified with Next.js 15 by invoking the installed Next CLI directly with the available Node runtime. In a normal shell with Node on PATH, `npm run build` or `pnpm build` should use the same Next build path.

## Suggested Next Build Steps

1. Wire the auth forms to the database-backed session helpers.
2. Add organization and tournament CRUD server actions.
3. Add venue/court and division setup forms.
4. Convert the seeded mini tournament into editable persisted records.
5. Add referee mobile score submission with offline queue replay.
