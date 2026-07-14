# Vercel production DB + Better Auth setup

## 1) Production env vars (must match what you use locally)
Set these in **Vercel → Project Settings → Environment Variables (Production)**:

- `BETTER_AUTH_SECRET`
- `DATABASE_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`

Notes:
- `lib/auth.ts` hard-requires `BETTER_AUTH_SECRET` + `DATABASE_URL` in `NODE_ENV=production`.
- `lib/auth-client.ts` hard-requires `NEXT_PUBLIC_BETTER_AUTH_URL` in production.

## 2) Ensure migrations run on the production DB
This repo uses **Drizzle** (not Prisma). Migrations are defined in `lib/db/schema.ts` with `drizzle.config.ts`.

We added these scripts to `package.json`:
- `npm run db:generate` (generates migration files)
- `npm run db:migrate` (applies migrations)
- `npm run db:migrate:prod` (generate + migrate)

### Recommended Vercel configuration
Add a **Build Hook / Run command** step (or equivalent deploy command) so migrations run during deploy:

**Command:**
- `npm run db:migrate:prod`

This requires `DATABASE_URL` to be available in Vercel at deploy/build time.

## 3) If your DB provider requires SSL
The app code already enables TLS in production:
- `lib/db/index.ts` uses `ssl: { rejectUnauthorized: false }` when `NODE_ENV=production`

If your provider uses a different requirement, adjust the `DATABASE_URL` format accordingly.

## 4) Quick validation after deploy
After migrations run, your auth tables should exist in the production DB:
- `user`
- `session`
- `account`
- `verification`

If you still see “table not found” errors, migrations were not applied to the production database (wrong `DATABASE_URL` or migrations step didn’t run).

