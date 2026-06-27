# Supabase Setup

Use Supabase for PostgreSQL, Auth, Storage, and Row Level Security.

Official references:

- Supabase Next.js SSR Auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control

## 1. Create the Supabase project

1. Create a new Supabase project.
2. Save the project URL, anon public key, and service role key.
3. Copy the connection string from Project Settings -> Database.
4. Do not commit keys to the repository.

## 2. Apply the database migrations

Run these SQL files in order from the Supabase SQL editor or with `psql`:

```bash
psql "$DATABASE_URL" -f db/migrations/0001_foundation.sql
psql "$DATABASE_URL" -f db/migrations/0002_supabase_rls_storage.sql
```

The first migration creates the tournament schema. The second migration links Supabase Auth users, enables Row Level Security, adds access policies, and creates the Storage buckets.

## 3. Environment values

Set these values in Vercel and in local `.env.local`:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET_PUBLIC=public-assets
SUPABASE_STORAGE_BUCKET_PRIVATE=tournament-files
SUPABASE_AUTH_REDIRECT_PATH=/auth/callback
NEXT_PUBLIC_APP_URL=
```

Only variables starting with `NEXT_PUBLIC_` are browser-safe. Keep `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-only.

## 4. Auth configuration

In Supabase Auth:

1. Enable email/password sign-in.
2. Enable Google if you want OAuth login.
3. Add the production callback URL:

```text
https://your-domain.com/auth/callback
```

4. Add local development callback URL:

```text
http://127.0.0.1:3000/auth/callback
```

The app uses Supabase SSR cookies in middleware, server actions, and the auth callback route.

## 5. Storage buckets

The RLS migration creates:

- `public-assets`: public images such as logos and banners.
- `tournament-files`: private files such as receipts, imports, exports, packets, and waivers.

Use this object path convention:

```text
<organization_id>/<tournament_id>/<file-name>
```

Storage policies read the first folder as the organization id and allow access only to active members of that organization. If you rename the buckets, update both the SQL migration and the matching environment values.

## 6. First platform admin

After the first user signs in, promote the account in Supabase SQL:

```sql
update public.users
set platform_role = 'platform_admin'
where email = 'you@example.com';
```

Then create an organization membership for normal tournament work:

```sql
insert into public.organization_memberships (organization_id, user_id, role, status, accepted_at)
select '<organization_id>'::uuid, id, 'organization_owner', 'active', now()
from public.users
where email = 'you@example.com';
```

## 7. Security notes

- Public visitors can read only explicitly public organization, tournament, venue, division, court, announcement, display, and result records.
- Sensitive records such as players, payments, registrations, files, audit logs, and admin tables require an authenticated organization membership.
- The service role key bypasses RLS and should only be used by trusted server code.
