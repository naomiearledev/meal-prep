# Meal Prep Portal

Personal meal prep tool: recipes, an ingredient library with densities, a cart, orders,
a merged shopping list and a printable prep sheet. Everything is in weight. One user,
one shared password, runs locally from a single SQLite file. The design decisions are recorded per step in `.claude/merged/`.

## Rules

### TDD is mandatory
Failing test first, always. Never write implementation code before a test that demands
it. Watch the test fail, write the smallest code that passes, then refactor. Vitest for
logic, React Testing Library for components with behaviour worth asserting. Trivial
presentational markup does not need a test for its own sake.

### Every change updates the ADR
Each branch has one ADR in `.claude/branches/<type>/<name>.md`, created from the
template when the branch is created (`./.claude/adr-helper.sh new <type>/<name>`).
Decisions, trade-offs, challenges and lessons go in there as the work happens, not
afterwards. A decision that isn't recorded didn't happen. Keep `.claude/adr-index.toml`
in step with it. Complete the ADR before merging, then archive it
(`./.claude/adr-helper.sh archive <type>/<name>`). The full guide is in
`.claude/ADR-SYSTEM-GUIDE.md`.

### Branches
`feat/`, `fix/`, `chore/`, `docs/` only, matching the ADR directories. One branch, one
ADR, one commit per step. Never work directly on `master`.

### Committing
Only commit when told to. Ask first otherwise.

## Project conventions

- Recipe ingredient amounts are **per portion**. An order of 6 portions multiplies by 6.
- All merging happens on `ingredientId`. Never match ingredients by name.
- Unit conversion goes through `src/lib/units.ts` and nowhere else. Densities live on
  the ingredient (`gramsPerMl`, `gramsEach`), not on the recipe.
- UK metric spoons: tsp 5 ml, tbsp 15 ml, cup 250 ml.
- Shopping list rounding: weight to the nearest 5 g, volume to the nearest 5 ml,
  counts rounded up to whole numbers.
- Database and uploads both live under `data/` (gitignored) so backup is one directory.
- British English throughout the UI and the code comments.

## Commands

- `npm run dev` — start locally
- `npm test` — run the test suite once
- `npm run test:watch` — tests in watch mode
- `npm run lint`
