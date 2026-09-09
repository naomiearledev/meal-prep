# Meal Prep Portal — design

## Context

Naomi runs a small meal prep service and needs one place to organise it. Today there is
nothing — recipes and shopping lists live in her head or scattered notes.

The portal must let her store recipes (ingredients, steps, photo), build a cart of meals
and portions, turn that into an order, and then — from any selection of orders — produce
two things: a merged shopping list she can paste into Apple Reminders, and a printable
prep sheet with quantities scaled to what she's actually cooking.

The defining constraint is **everything in weight**. She cooks by scale and buys by weight,
but recipes are written in tsp/tbsp/cups. There is no universal volume→weight conversion
(a tbsp of oil is ~13.5g, of salt ~18g, of flour ~8g), so conversion has to be per
ingredient. That single fact drives the schema: ingredients are a first-class library
carrying their own density, not free text on a recipe.

Personal use only. No payments, no multi-user.

Runs locally for now. It lives in a git repo so it can be pushed to GitHub and cloned by
a friend who will host it on his homelab — so nothing here is tied to a hosting provider,
and the README explains how to run it from a clean checkout. His setup is unknown and out
of scope.

## Decisions already made

| Question | Answer |
|---|---|
| Hosting | Local for now; git repo so a friend can host it later |
| Stack | My call — Next.js |
| Ingredients | Structured (amount / unit / ingredient) |
| Portions | Recipe quantities are **per portion**; order 6 = ×6 |
| Reminders | Copy-to-clipboard button; paste into Reminders makes one item per line |
| Login | One shared password |
| Orders | Identified by date; can be marked fulfilled |
| Countables | Eggs, cloves, tins stay as counts |
| Liquids | Show in ml/L on the shopping list |
| Prep sheet | Same meal across orders merges; allocation table at the end |
| Photos | Uploaded from phone; must work on mobile |

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **SQLite** via `better-sqlite3`, **Drizzle** ORM + migrations
- Recipe photos written to a local `data/uploads/` directory
- **Vitest** + React Testing Library — everything is built test-first
- PDFs via the browser's print-to-PDF and a print stylesheet — no PDF library

No cloud services, no external accounts. `npm install && npm run dev` from a clean clone
is the whole setup — the database is a single file. That makes it trivial to run on your
Mac now and trivial for someone else to host later; if his homelab prefers Postgres,
Drizzle swaps dialect without the app code changing.

New git repo at `/Users/naomi.earle/Documents/Projects/meal-prep`, with `data/`,
`node_modules/` and `.env` gitignored, and a README covering setup and the env vars.

## How we work — TDD

Every change is test-first, no exceptions: write a failing test, watch it fail, write the
smallest code that passes, refactor. Vitest for the conversion and aggregation logic
(pure functions, so this is where the real coverage lives), React Testing Library for
components with behaviour worth asserting — cart maths, ingredient rows, order selection.
Trivial presentational markup doesn't get a test for the sake of it.

The units module is written before anything touches it, because a wrong density is a
silently wrong shopping list.

## ADR system

Implementing the Claude ADR system from
`https://gist.github.com/joshrotenberg/a3ffd160f161c98a61c739392e953764`.

```
.claude/
├── adr-index.toml          # metadata, tags, cross-references, status
├── adr-helper.sh           # new / list / complete / archive commands
├── ADR-SYSTEM-GUIDE.md     # the guide itself, committed for reference
├── templates/adr-template.md
├── branches/{feat,chore,docs,fix}/
└── merged/YYYY-MM/
```

One ADR per branch, created from the template when the branch is created, filled in as the
work happens, completed before merge, then archived into `merged/YYYY-MM/` and marked
merged in the index. Each ADR carries the problem statement, options considered, the
decision and its trade-offs, implementation notes, challenges, and what was learned.

The gist's public page documents the structure and workflow but not the contents of
`adr-helper.sh` or the full TOML schema, so I'll write those to match the documented
behaviour.

## CLAUDE.md

Written in step 1 so it governs every step after it. It will state:

- **TDD is mandatory.** Failing test first, always. Never write implementation code before
  a test that demands it.
- **Every change updates the ADR.** Branch work belongs in that branch's ADR; a decision
  that isn't recorded didn't happen. Update `adr-index.toml` alongside it.
- Branch naming (`feat/`, `fix/`, `chore/`, `docs/`) matching the ADR directories.
- Project conventions: quantities are per portion, all merging happens on ingredient ID,
  conversion goes through `src/lib/units.ts` and nowhere else.
- British English throughout the UI.

## Data model

`src/db/schema.ts`

**ingredients** — the library, and the heart of the app
- `name` (unique), `measureType`: `weight` | `volume` | `count`
- `gramsPerMl` — density, e.g. olive oil 0.92, salt 1.2, plain flour 0.53
- `countUnit` — `egg`, `clove`, `tin` (count ingredients only)
- `gramsEach` — optional, lets a count ingredient still be weighed

**recipes** — `name`, `notes`, `photoUrl`, `createdAt`
**recipeIngredients** — `recipeId`, `ingredientId`, `amount`, `unit`, `position`
  (amounts are **per portion**)
**recipeSteps** — `recipeId`, `position`, `text`
**cartItems** — `recipeId`, `portions` (single row set; one user)
**orders** — `createdAt`, `fulfilledAt` (null = outstanding)
**orderItems** — `orderId`, `recipeId`, `portions`

Orders reference recipes rather than snapshotting them — editing a recipe changes past
orders, which is correct for a personal tool and keeps this simple.

## Unit conversion — the core logic

`src/lib/units.ts`, pure functions, unit tested first.

UK metric spoons: `tsp 5ml`, `tbsp 15ml`, `cup 250ml`.

`toBaseUnit(amount, unit, ingredient)` → `{ value, unit: 'g' | 'ml' | 'each' }`

- **weight** ingredient → grams. Volume units convert via `ml × gramsPerMl`.
- **volume** ingredient → ml. Weight units convert via `g ÷ gramsPerMl`.
- **count** ingredient → count. Weight converts via `gramsEach` only when set.

`formatQuantity(value, unit)` — grams roll into kg at 1000, ml into L, counts round up
to whole numbers.

Rounding on the shopping list: weight to the nearest 5g, volume to the nearest 5ml.

**Seed data** (`src/db/seed.ts`): ~120 common UK ingredients with real densities, so the
library is useful on day one. Adding a new ingredient asks for its density with a
"same as…" shortcut to copy from a similar one.

## Merging — `src/lib/aggregate.ts`

Given a set of order items, group by `ingredientId`, convert each line to its base unit,
multiply by portions, sum. Because everything lands in one base unit per ingredient, a
recipe using tbsp and another using grams merge cleanly.

The old "chicken thigh vs chicken thighs" mismatch cannot happen — merging is on ID.

## Pages

| Route | What it does |
|---|---|
| `/login` | Password field |
| `/` | Recipe grid — photo cards, search |
| `/recipes/new`, `/recipes/[id]/edit` | Name, photo, ingredient rows, step list |
| `/recipes/[id]` | Photo, ingredients, steps, portions + Add to cart |
| `/ingredients` | The library — list, add, edit densities |
| `/cart` | Meals and portions, adjust/remove, Create order |
| `/orders` | Date-ordered list, tick boxes, fulfilled toggle, outstanding/all filter |
| `/orders/shopping-list?ids=…` | Merged list + **Copy** button |
| `/orders/prep-sheet?ids=…` | Print-optimised sheet |

### Prep sheet layout

For each recipe across the whole selection, merged:

> **Biryani — 8 portions**
> ingredients scaled to 8, then the steps

Then a final **Allocation** table so she knows how to split it up:

| Order | Biryani | Chilli |
|---|---|---|
| 3 Sept | 3 | 2 |
| 7 Sept | 5 | — |

`@media print` gives a page break between recipes and hides the app chrome.

## Auth

Password in `APP_PASSWORD` env var. `/login` sets a signed httpOnly cookie; Next.js
middleware guards every other route.

## Photos

Resized client-side on a canvas to max 1600px before upload, so phone photos don't bloat
the disk. Posted to a route handler that writes the file into `data/uploads/` under a
generated name; a second route serves them back. Keeping uploads outside `public/` means
the whole `data/` directory — database and photos together — is one thing to back up or
mount as a volume.

## Build order

Each step is one branch, one ADR, one commit.

| # | Branch | What lands | How you check it |
|---|---|---|---|
| 1 | `chore/project-setup` | Git repo, Next.js scaffold, Vitest, CLAUDE.md, full ADR system, README | Run `./.claude/adr-helper.sh list`, read CLAUDE.md, `npm test` passes |
| 2 | `chore/database` | SQLite + Drizzle, schema, migrations, password login | Log in with your password, confirm `data/app.db` appears |
| 3 | `feat/unit-conversion` | `units.ts` + `aggregate.ts`, test-first, no UI | `npm test` — read the test names, they describe the rules |
| 4 | `feat/ingredient-library` | `/ingredients` CRUD + ~120 seeded ingredients | Browse the library, add one, edit a density |
| 5 | `feat/recipes` | Recipe CRUD, ingredient rows, steps, photo upload | Add two recipes sharing an ingredient, one using tbsp |
| 6 | `feat/cart-and-orders` | Cart, create order, orders list, fulfilled flag | Build a cart, place two orders, mark one fulfilled |
| 7 | `feat/shopping-list` | Merged list + Copy button | Select both orders, paste the list into Reminders |
| 8 | `feat/prep-sheet` | Print sheet, merged portions, allocation table | Print to PDF, check quantities and page breaks |

## Working agreement between steps

You want to see each step before the next one starts. So, for every step:

1. I build it test-first on its own branch, with its ADR.
2. I stop and give you plain instructions for what to run and what to look at.
3. **I wait.** Nothing else gets built until you say it's good.
4. On your approval I complete the ADR, commit, and push to `master`.
5. I branch from `master` for the next step and start again.

If something's wrong at step 3, I fix it on the same branch and hand it back to you.

**Step 1 needs one thing from you:** an empty GitHub repo to push to, or your say-so to
create one with `gh repo create`.

## Verification

Per-step checks are in the table above. End to end, once it's all in:

- `npm test` — conversion and aggregation. Key cases: tbsp olive oil → 13.8g; the same
  ingredient in tsp in one recipe and grams in another summing to one line; counts
  rounding up; 1200g displaying as 1.2kg.
- Locally: add two recipes sharing an ingredient, add both to the cart, create two orders,
  select both, and confirm the shopping list shows one merged line and the prep sheet
  shows merged portions plus a correct allocation table.
- Print the prep sheet to PDF and check the page breaks.
- Copy a shopping list, paste it into Reminders on your Mac, and confirm it creates one
  item per line. (Same clipboard, so it will behave the same on the phone once hosted.)
- Delete `data/`, run `npm run db:migrate && npm run db:seed`, and confirm a clean
  checkout comes up working — that's what your friend will hit.
