# Self Finance & Management

Local-first personal finance tracker and self-management web app. All data lives in a
local SQLite database on your own machine — no accounts, no cloud, no tracking.

## Features (Phase 1 MVP)

| Area | What it does |
| --- | --- |
| **Dashboard** | Balance, monthly income/expenses, budget utilization, savings progress, task stats, active timer |
| **Transactions** | Income / expense / refund records with categories, filters, search, monthly totals |
| **Tasks** | Task list with priority, status, due date, planned duration and time tracking |
| **Timer** | One active timer at a time — start, pause, resume, stop. Elapsed time is always recalculated from stored timestamps |
| **Budgets** | Per-category monthly budgets with utilization percentage and over-budget flag |
| **Savings goals** | Targets with allocations, progress percentage and completion state |
| **Categories** | Income and expense categories, seeded with sensible Indonesian defaults |

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) + TypeScript
- **Prisma 6** + SQLite (file database, no server needed)
- **Tailwind CSS 4** for styling
- **Zod 4** for request validation
- **Jest** for unit tests

## Getting started

```bash
npm install
npx prisma migrate dev   # create/apply the database
npm run dev              # http://localhost:3000
```

Seed the default categories on first run:

```bash
curl -X POST http://localhost:3000/api/seed
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, `eslint .`) |
| `npm test` | Jest unit tests |
| `npm run prisma:migrate` | Create and apply a migration |
| `npm run prisma:studio` | Browse the database |
| `npm run prisma:reset` | Reset the database and re-apply all migrations |

## Architecture notes

**Money is never a float.** Every amount is stored as an integer in minor currency units
(IDR: 1 unit = 1 rupiah, precision 0; USD: 1 unit = 1 cent, precision 2). Formatting and
parsing live in `lib/utils/money.ts`; all financial calculations are pure functions in
`lib/utils/finance.ts` so they can be unit tested without a database.

**Time is always derived from timestamps.** The timer stores `startTime`, `pausedAt` and
`accumulatedSeconds`; elapsed time is recalculated from those values on every read, so a
page refresh or a stale timer never drifts. Timers older than 8 hours are treated as stale
and reclaimed.

**The database is the source of truth and it is always live.** Because the local SQLite
file changes while the app is running, nothing is prerendered: API routes call
`await connection()` and the root layout opts out of the static shell with
`export const instant = false`. Every route renders per request.

**Layers.** `app/api/**` (HTTP) → `lib/services/**` (business logic) → `lib/prisma.ts`
(data access). `lib/utils/**` holds pure helpers with no I/O. Frontend components call
the typed client in `lib/api/client.ts`.

**AI is not involved in calculations.** The deterministic service layer produces every
number shown in the UI.

## Testing

```bash
npm test
```

Unit tests cover currency formatting/parsing, balance and budget-utilization maths,
savings progress, and timer elapsed-time behaviour (including stale detection and
midnight crossings).

## Notes

- The database file (`prisma/db/local.db`) is git-ignored — it holds personal data.
- The `db` folder is created automatically by the first migration.
- Month values are stored zero-based (`0` = Januari), matching `Date#getMonth()`.
