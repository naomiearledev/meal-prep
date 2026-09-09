# Branch ADR: feat/ingredient-library

## Meta
- **Branch**: feat/ingredient-library
- **Type**: feat
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 4 of PLAN.md. The ingredient library is the heart of the app: every conversion
depends on the densities stored here. It needs CRUD pages and a starter set so it is
useful on day one, plus the "same as…" shortcut so adding a new ingredient doesn't
require knowing its density.

### Goals
- `/ingredients` list with search, `/ingredients/new`, `/ingredients/[id]/edit` with delete.
- Validation that produces field-level errors and keeps what was typed.
- `npm run db:seed` with 120+ UK ingredients (207 shipped), idempotent.
- App shell: navigation shared by every signed-in page but not the login page.

### Non-Goals
- Recipes, and anything that uses ingredients (step 5 onwards).
- Bulk import/export of the library.

## Decision Record
### Options Considered
- **Form state**: plain `<form action>` with redirect-and-query-string errors vs
  `useActionState` with a controlled client form. React 19 resets uncontrolled inputs
  after a form action completes, which would wipe the user's typing on a validation
  error. The form also needs client state for "same as…" copying. Chose a controlled
  client component with `useActionState`; the server action returns `{ errors }` on
  failure and redirects on success.
- **Where validation lives**: `validateIngredientInput` in `src/db/ingredients.ts`,
  pure, accepting either a plain object or a `FormData`. Used by the actions and by the
  seed test to prove every seed row is valid input.
- **Duplicate names**: the unique index is case-sensitive in SQLite. Added an explicit
  case-insensitive check before insert/update so "salt" and "Salt" can't both exist.
- **Deleting an ingredient in use**: rely on the `ON DELETE RESTRICT` foreign key and
  translate the error. SQLite reports this as `SQLITE_CONSTRAINT_TRIGGER`, not
  `SQLITE_CONSTRAINT_FOREIGNKEY`, so the check matches the message
  ("FOREIGN KEY constraint failed") rather than a code.
- **Seed idempotency**: `ON CONFLICT (name) DO NOTHING` per row inside one transaction.
  Re-running never overwrites a density the user has edited. Test covers this.
- **Oils as weight, other liquids as volume**: keeps the plan's "tbsp olive oil →
  13.8 g" case and its "liquids show in ml" rule consistent; the choice is per
  ingredient and editable.
- **Bulk meat and veg densities**: every weight/volume seed ingredient has a density
  (tested), so a recipe that says "1 cup chopped onion" still converts. Meat is ~1.0,
  chopped veg uses typical cup weights. They are approximations and labelled as such.
- **Tins**: count ingredients with unit "tin" and `gramsEach` set to the tin size, so
  a recipe can say either "1 tin" or "200 g" and the list still shows whole tins.
- **Navigation**: an `(app)` route group with its own layout carrying the nav; the
  login page stays outside it. The nav is `print:hidden` ready for the prep sheet.
- **Delete confirmation**: a tiny `ConfirmButton` client component calling
  `window.confirm`, inside a separate form (forms can't nest).

### Decision
As above.

### Trade-offs Accepted
- Densities for whole vegetables and meat are rough. They only matter if a recipe uses
  cups for them, which is rare in UK recipes; grams pass straight through.
- Pluralising count units by adding "s" (from step 3) shapes the seed: units chosen
  are all regular (egg, clove, tin, cube, star, leaf, stick, chilli, lemon, lime, wrap,
  naan, avocado).
- `deleteIngredientAction` reports its error via the query string rather than
  `useActionState`, since the delete form is a plain server-rendered form.

## Implementation
- `src/db/ingredients.ts`: `validateIngredientInput`, `listIngredients(db, query)`
  (case-insensitive contains, ordered by lower(name)), `getIngredient`,
  `createIngredient`, `updateIngredient`, `deleteIngredient`, `IngredientError`.
- `src/db/seed-data.ts` (the list, with `weight`/`volume`/`count` helpers),
  `src/db/seed.ts` (`seed(db)` returns rows inserted), `src/db/run-seed.ts` (script).
- `src/app/(app)/layout.tsx` nav; `src/app/(app)/ingredients/{page,new/page,[id]/edit/page}.tsx`,
  `actions.ts`, `IngredientForm.tsx`; `src/components/ConfirmButton.tsx`.
- Tests: `ingredients.test.ts` (16), `seed.test.ts` (7), `IngredientForm.test.tsx` (5).

## Investigation Notes
- Testing Library's automatic `cleanup` between tests only registers itself when the
  runner exposes `afterEach` globally. With Vitest globals off (step 1 decision) the
  second render in a file found duplicates of the first. Fixed once in
  `src/test/setup.ts` with an explicit `afterEach(cleanup)`.
- `getByLabelText("Count unit")` failed while the label wrapped the hint text too.
  Switched `Field` to `htmlFor`/`id` so the label's text is exactly the label.

## Challenges & Solutions
- See Investigation Notes; both were test-infrastructure issues, not product bugs.

## Impact Assessment
- The seed shapes what users see first; wrong densities here become wrong shopping
  lists. Every value is editable from the UI, and the seed never overwrites edits.
- The `(app)` route group changes the file layout for all later pages: everything
  signed-in goes under `src/app/(app)/`.

## Quality Assurance
- `npm test`: 9 files, 82 tests passing. `tsc --noEmit` and `eslint` clean.
- By hand against the dev server with a valid cookie: list renders the seeded
  library with an edit link per row, search filters, new and edit pages render, an
  unknown id gives 404, nav links present on the home page. `npm run db:seed` twice:
  second run inserts 0.

## Outcome & Lessons
- Putting validation in a pure function that accepts `FormData` made the seed data
  verifiable with the same rules the form uses.
- When a step-1 tooling decision (no Vitest globals) has a knock-on effect, record the
  fix where the next person will look (the setup file has a comment).

## Tags
ui data ingredients seed
