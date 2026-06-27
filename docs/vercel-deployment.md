# Vercel Deployment

Deploy the Next.js app to Vercel and point it at the Supabase project created in `docs/supabase-setup.md`.

Official references:

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel Next.js deployments: https://vercel.com/docs/frameworks/nextjs
- Supabase Vercel integration: https://supabase.com/docs/guides/platform/vercel-marketplace

## 1. Import the repository

1. In Vercel, import `MBHerd/Tournament`.
2. Select the Next.js framework preset.
3. Keep these project commands from `vercel.json`:

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build"
}
```

## 2. Set environment variables

Add these variables in Vercel Project Settings -> Environment Variables:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET_PUBLIC=public-assets
SUPABASE_STORAGE_BUCKET_PRIVATE=tournament-files
SUPABASE_AUTH_REDIRECT_PATH=/auth/callback
NEXT_PUBLIC_APP_URL=https://your-domain.com
VERCEL_PROJECT_PRODUCTION_URL=your-domain.com
AUTH_SESSION_COOKIE=himsog_session
AUTH_PASSWORD_PEPPER=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Use the same variable names in Preview and Production. Keep service-role and database values server-only.

## 3. Configure Supabase callbacks

In Supabase Auth URL settings, add:

```text
https://your-domain.com/auth/callback
https://your-preview-domain.vercel.app/auth/callback
http://127.0.0.1:3000/auth/callback
```

Set the site URL to the production Vercel domain.

## 4. Deploy

1. Push changes to GitHub.
2. Vercel builds automatically from `main`.
3. Open `/deploy` after deployment to confirm the required hosted values are set.
4. Open `/login` and sign in with an email/password user or Google OAuth.

## 5. Local production check

After dependencies are installed, run:

```bash
pnpm test
pnpm build
pnpm dev
```

Local development uses `.env.local`. Hosted Vercel deployments use Vercel environment variables.

## 6. Operational notes

- Run both SQL migrations before using the deployed app.
- Use the first signed-in admin process from `docs/supabase-setup.md`.
- Keep Storage object paths under `<organization_id>/<tournament_id>/...`.
- Rotate the service role key if it is ever copied into client code or exposed outside Vercel.
