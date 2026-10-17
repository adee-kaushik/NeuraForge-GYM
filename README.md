# NeuraFitness Gym Management (MVP)

Next.js (App Router) + TypeScript + Tailwind CSS v4.
Data is mock data in `src/data/mockData.ts` for now. Supabase comes next.

## Run locally

```
npm install
npm run dev
```

Open http://localhost:3000

## Structure

- `src/app/` — layout, page, global styles
- `src/components/` — screens (Dashboard, Members, Memberships, Attendance, Payments, Settings) and modals
- `src/types/` — shared TypeScript types
- `src/data/` — mock data

## Biometric attendance

Machines (eSSL / ZKTeco cloud push, LAN bridge, REST) are managed in Members → Biometrics Hub.
Setup, rules and troubleshooting: [docs/BIOMETRICS.md](docs/BIOMETRICS.md).
**After pulling this change, run the migration `20261017000000_biometric_devices` before deploying.**
