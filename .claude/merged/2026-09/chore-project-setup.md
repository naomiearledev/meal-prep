# Branch ADR: chore/project-setup

## Meta
- **Branch**: chore/project-setup
- **Type**: chore
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 1 of PLAN.md. Nothing existed: no repo, no scaffold, no test runner, no working
rules. Everything after this step depends on the rules laid down here (TDD, ADRs,
conventions), so they have to land first and be enforced by CLAUDE.md.

### Goals
- Git repo on GitHub under the personal account, private, cloneable by a friend later.
- Next.js 15 App Router + TypeScript + Tailwind scaffold, trimmed to a blank page.
- Vitest + React Testing Library wired up with one real passing test.
- CLAUDE.md stating the working rules and project conventions.
- The full ADR system from the gist: index, helper script, guide, template, directories.
- README covering a clean-checkout setup and the env vars.

### Non-Goals
- Database, auth, or any feature code. Those are steps 2 onwards.
- Deciding how the friend hosts it.

## Decision Record
### Options Considered
- **Test runner**: Vitest vs Jest. Vitest reads the Vite/ESM world natively and needs
  almost no config with Next's TS setup; Jest needs babel/SWC transforms configured.
- **Vitest version**: latest (5.x) vs 3.x. Vitest 5 and the latest jsdom both require
  Node 20.19+ / 22 (they use `require(esm)`). The machine runs Node 20.16.
- **Vitest globals**: `globals: true` vs explicit imports. Globals need an extra
  `types` entry in tsconfig or `tsc` fails on `describe`; explicit imports just work.
- **ADR helper**: the gist documents the workflow but not the script or the TOML
  schema, so the script is written from the documented behaviour.
- **Home page test**: the plan says trivial markup doesn't get tests. This one exists
  to prove RTL + jsdom + the `@/` alias are wired, not to test the page.

### Decision
- Vitest 3.2 + `@vitejs/plugin-react` 4 + jsdom 26, pinned to what Node 20.16 can run.
  Explicit `import { describe, it, expect } from "vitest"` in every test file.
- `adr-helper.sh` supports `new`, `list`, `complete`, `archive`. Index entries are
  single-line TOML inline tables (multi-line inline tables, as shown in the gist, are
  not valid TOML). `complete` refuses to run while any `[Template placeholder]` line
  remains. `archive` moves the file to `merged/YYYY-MM/<type>-<name>.md` and moves
  the index entry from `[active.<type>]` to `[merged.<type>]` with a merged date.
- The scaffold's default page, SVGs and README were removed rather than left as noise.
- `data/` added to `.gitignore` (the scaffold already ignores `.env*`).
- `.env.example` lists `APP_PASSWORD` and `AUTH_SECRET` now so the README can describe
  setup once; step 2 implements them.

### Trade-offs Accepted
- Pinned to Vitest 3 / jsdom 26 until Node is upgraded. Upgrading Node later unblocks
  the newer versions; nothing in the tests depends on the 3.x API specifically.
- The helper script uses BSD `sed -i ''`, so it is macOS-specific. Fine for now; if the
  friend's homelab is Linux and he wants to use the helper, that's a two-line change.

## Implementation
- `git init -b master`, work on `chore/project-setup`, `origin` = the new private repo.
- `create-next-app@15` run in a scratch dir (it refuses a non-empty folder) and copied in.
- `vitest.config.ts`: react plugin, jsdom, `src/test/setup.ts` (jest-dom matchers),
  `@` alias matching tsconfig.
- `npm test` = `vitest run`, `npm run test:watch` = `vitest`.
- Test-first: `src/app/page.test.tsx` asserted an `h1` "Meal Prep" and failed against
  the scaffold page, then `page.tsx` was replaced with the minimal heading.
- `.claude/`: guide copied from the gist, template, index, helper, directories with
  `.gitkeep`. Helper exercised end to end on a scratch copy before use.

## Investigation Notes
- `create-next-app` prompts for Turbopack even with `--yes`-style flags; pass
  `--turbopack` explicitly to run non-interactively.
- First `npm install` failed with an ERESOLVE on `@types/node` (vitest 5 wants ^22).
  Then jsdom 28 failed at runtime with `ERR_REQUIRE_ESM`. Both traced to Node 20.16.

## Challenges & Solutions
- Node version vs latest test tooling: pinned versions rather than forcing installs
  with `--legacy-peer-deps`, which would have hidden a real runtime incompatibility.
- `set -u` in the helper tripped on an empty tags array; fixed with the
  `${arr[@]+"${arr[@]}"}` idiom.

## Impact Assessment
- No runtime impact; nothing user-facing beyond a placeholder page.
- Maintenance: every later branch follows the conventions set here, so the cost of
  getting them wrong is paid in every step. Kept CLAUDE.md short so it's actually read.

## Quality Assurance
- `npm test`: 1 file, 1 test passing.
- `npm run lint`: clean.
- `npx tsc --noEmit`: clean.
- `./.claude/adr-helper.sh list` shows this ADR under active/chore.

## Outcome & Lessons
- Check the Node version before picking tooling versions; the latest of everything
  assumed a newer runtime than the machine has.
- Trying the helper on a throwaway copy of `.claude/` caught the empty-array bug
  before it touched the real index. Worth doing for any script that edits files in place.

## Tags
tooling setup testing
