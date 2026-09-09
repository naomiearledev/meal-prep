# Branch ADR: chore/database

## Meta
- **Branch**: chore/database
- **Type**: chore
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 2 of PLAN.md. The app needs its persistence layer and its front door before any
feature work: a SQLite database with the full schema from the plan, migrations, and the
single shared-password login that guards every route.

### Goals
- Drizzle schema for ingredients, recipes, recipeIngredients, recipeSteps, cartItems,
  orders, orderItems, exactly as PLAN.md describes.
- A generated migration and a `db:migrate` command that creates `data/app.db`.
- Login page, signed httpOnly cookie, middleware guarding everything else.
- All of it test-first.

### Non-Goals
- Seed data (step 4). Any UI beyond the login page. Logout (not in the plan).

## Decision Record
### Options Considered
- **better-sqlite3 version**: 13.x segfaults on load under Node 20.16 (it declares
  `node >= 22`). 12.x supports Node 20. Pinned `^12`.
- **Running TS scripts** (`db:migrate`, later `db:seed`): `tsx` vs Node's built-in
  type stripping (Node 22.6+) vs `drizzle-kit migrate`. Node 20 rules out the
  built-in. `drizzle-kit migrate` would avoid a dependency but the seed script needs a
  runner anyway, so `tsx` now.
- **When to migrate**: explicit command only, or on every connection. Chose both:
  `createDb()` always runs pending migrations (idempotent, milliseconds), and
  `db:migrate` just opens the connection. The app can never run against a stale schema,
  and tests get a fully migrated in-memory database from the same code path as production.
- **Cookie signing**: `jose` vs Web Crypto HMAC. Web Crypto is in Node 20 and the
  edge runtime, so no dependency. Token is `timestamp.base64url(hmac)`.
- **Enum enforcement for measureType**: TypeScript only vs a CHECK constraint. Added the
  CHECK so a bad value from a future form or seed file fails loudly at the database.
- **Deleting an ingredient still used by a recipe**: cascade vs restrict. Restrict.
  Silently removing an ingredient from recipes would corrupt shopping lists.
- **Deleting a recipe that's in an order**: restrict, for the same reason. Deleting a
  recipe that's only in the cart cascades; the cart is scratch.
- **Secure cookie flag**: not set. The friend's homelab may serve plain HTTP on a LAN
  and `Secure` would make login silently fail there. Revisit if it's put behind HTTPS.

### Decision
Everything in Options Considered, plus: `PRAGMA foreign_keys = ON` per connection
(SQLite defaults it off), WAL journal mode for the file database, timestamps stored as
integer milliseconds (`timestamp_ms`) defaulting to `unixepoch() * 1000`.
`DATABASE_PATH` env var, defaulting to `data/app.db`, so hosting can point it at a volume.

### Trade-offs Accepted
- Auto-migrate on connect means a broken migration breaks app start rather than a
  separate command. Acceptable: it fails immediately and obviously.
- No logout. One shared password on a personal tool; clearing cookies does the job.
- The login server action itself is untested glue around `cookies()` and `redirect()`.
  The parts with logic (`passwordMatches`, token sign/verify, the form's error state)
  are tested; the action was checked by hand against the dev server.

## Implementation
- `src/db/schema.ts`, `src/db/client.ts` (`createDb(file)`), `src/db/index.ts`
  (`getDb()` singleton cached on `globalThis` for dev reloads), `src/db/migrate.ts`.
- `drizzle.config.ts`; migrations in `drizzle/`; `npm run db:generate|db:migrate|db:studio`.
- `src/lib/auth.ts`: `createSessionToken`, `verifySessionToken`, `passwordMatches`,
  all constant-time comparisons. `src/lib/env.ts`: `requireEnv` with a helpful message.
- `src/app/login/{page,LoginForm,actions}.tsx|ts`, `src/middleware.ts`.
- Tests: `src/db/schema.test.ts` (9: constraints, cascades, restricts, timestamps),
  `src/lib/auth.test.ts` (5), `src/app/login/LoginForm.test.tsx` (2). Database tests
  run against `:memory:` under `// @vitest-environment node`.

## Investigation Notes
- `npm install better-sqlite3` picked 13.0.3 with no prebuilt binary directory and
  exit code 139 (SIGSEGV) on `require`. `npm view better-sqlite3@12 engines` confirmed
  12.x is the Node 20 line.
- Drizzle's `check()` for SQLite emits the constraint inline in CREATE TABLE, so it
  lands in the first migration without hand editing.

## Challenges & Solutions
- Third Node-20 pin in two steps (Vitest, jsdom, now better-sqlite3). Recorded each
  so a later Node upgrade knows what to unpin.

## Impact Assessment
- Security: constant-time comparisons for password and signature; httpOnly, SameSite=Lax
  cookie; middleware default-deny with `/login` the only exception. No `Secure` flag
  (see above). Cookie lasts a year; no server-side revocation short of rotating
  `AUTH_SECRET`, which logs everyone (i.e. one person) out.
- Data: all future steps build on this schema; changing it later is a new migration.

## Quality Assurance
- `npm test`: 4 files, 17 tests passing. `tsc --noEmit` and `eslint` clean.
- By hand against the dev server: `/` without a cookie → 307 to `/login`; garbage
  cookie → 307; a token from `createSessionToken` → 200; `/login?error=wrong` renders
  the alert. `rm -rf data && npm run db:migrate` creates `data/app.db` with all
  seven tables plus Drizzle's migrations table.

## Outcome & Lessons
- Check `engines` before installing native modules on an older Node; a segfault is a
  much worse error message than an ERESOLVE.
- Making `createDb()` migrate meant the schema tests exercise the real migration SQL,
  not a parallel `CREATE TABLE` kept by hand. One source of truth for the schema.

## Tags
data auth drizzle sqlite
