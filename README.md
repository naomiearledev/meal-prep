# Meal Prep

A personal meal prep portal. Recipes with photos, an ingredient library that knows how
much a tablespoon of each thing weighs, a cart, orders by date, a merged shopping list
you can paste into Apple Reminders, and a printable prep sheet scaled to what you're
actually cooking. Everything is in weight.

One user, one shared password, no cloud services. The whole state of the app is the
`data/` directory: a single SQLite file and the uploaded photos.

## Running it

You need Node 20 or newer.

```sh
git clone https://github.com/naomiearledev/meal-prep.git
cd meal-prep
npm install
cp .env.example .env      # then edit it, see below
npm run db:migrate        # creates data/app.db
npm run db:seed           # ~200 common UK ingredients with densities
npm run dev
```

Open http://localhost:3000 and log in with the password from `.env`.

The database is brought up to date automatically whenever the app opens it, so
`db:migrate` is really just a way to create `data/app.db` up front and see that it
worked. `db:seed` loads about 200 common UK ingredients with their densities; it skips
anything already there, so it is safe to run again and never overwrites your edits.

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | What it is |
|---|---|
| `APP_PASSWORD` | The one shared password for logging in |
| `AUTH_SECRET` | Any long random string; signs the login cookie |
| `DATABASE_PATH` | Optional. Where the SQLite file lives. Defaults to `data/app.db` |

`.env` is gitignored. Never commit it.

## Backing up or moving it

Copy the `data/` directory. That's the database and every photo. To host it elsewhere,
mount `data/` as a persistent volume and set the two environment variables.

## Development

```sh
npm test            # run the tests once
npm run test:watch  # keep them running
npm run lint
npm run db:generate # after editing src/db/schema.ts: writes a new migration into drizzle/
npm run db:studio   # browse the database in Drizzle Studio
```

Everything is built test-first. Decisions are recorded per branch in `.claude/` using
the ADR system described in `.claude/ADR-SYSTEM-GUIDE.md`; `./.claude/adr-helper.sh list`
shows what's there. The design is in `PLAN.md`.

## Stack

Next.js 15 (App Router), TypeScript, Tailwind, SQLite via better-sqlite3 with Drizzle,
Vitest and React Testing Library.
