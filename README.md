# NeuraFitness Gym Management

Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma/PostgreSQL and Supabase Auth. The app uses real database records; the mock-data file is not the production data source.

## Setup

1. Run `npm ci` using Node.js 22 or later.
2. Copy `.env.example` to `.env.local` and supply your own Supabase/database configuration. Never commit secrets. Prisma CLI also needs `DATABASE_URL` and `DIRECT_URL` in its process environment or a local `.env` file.
3. Back up your database and test `npm run db:deploy` on staging before applying to production. Do not use `prisma migrate reset` or `db push` on production.
4. Run `npm test`, `npm run typecheck`, then `npm run build`.
5. Run `npm run dev` for development or `npm start` for the production build.

## Required rollout steps for this fix

This update deliberately retires insecure phone-only member sessions, removes email-based administrator privileges, enforces inactive gym subscriptions, and requires API-key authentication for ADMS uploads.

- Administrator access requires server-controlled Supabase `app_metadata.neurafitness_admin: true` (legacy `neuraforge_admin: true` is supported). Set this only for the verified founder account through the Supabase admin dashboard/API. Public user metadata and email whitelists never grant this role.
- Existing members need their Member ID and password from authenticated gym staff. Use **Create Login** or **Reset Password** in member details. Old phone-only cookies no longer work.
- Run migration `20261019000000_reconcile_runtime_schema` before deploying. It includes missing columns/tables and RLS for runtime-created tables. Database writes require a trusted server database role; no public data-access policies are created.
- Configure the authenticated ADMS relay before switching biometric devices. See [docs/BIOMETRICS.md](docs/BIOMETRICS.md).
- Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin and allow its `/auth/confirm` callback in Supabase Auth URL configuration.

## Validation

`npm test` runs targeted regression tests with mocked auth/database services; it does not contact production. The optional `node tools/check-migrations.mjs` check needs `@electric-sql/pglite` installed with `npm install --no-save --package-lock=false @electric-sql/pglite`. Run `npm ci` afterward to restore locked dependencies. This verifies migration SQL in an isolated PostgreSQL-compatible engine, not your production schema or credentials.
