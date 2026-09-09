# Branch ADR: fix/env-example-ignored

## Meta
- **Branch**: fix/env-example-ignored
- **Type**: fix
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
The plan's final verification is a clean clone: `npm install`, copy `.env.example`,
migrate, seed, run. Doing that from GitHub, `cp .env.example .env` failed: the file was
never committed. The `create-next-app` `.gitignore` has `.env*`, which matches
`.env.example` as well as real secrets. Every step's "what to check" ran in the working
copy where the file existed, so nothing noticed.

### Goals
- `.env.example` tracked; real `.env` files still ignored.

### Non-Goals
- Changing how env vars are read.

## Decision Record
### Options Considered
- Rename to `env.example` (not matched by the pattern) vs add `!.env.example` after
  `.env*`. The negation keeps the conventional name the README already uses.

### Decision
Add `!.env.example` immediately after `.env*` in `.gitignore`.

### Trade-offs Accepted
- None.

## Implementation
- One line in `.gitignore`; `.env.example` (unchanged since step 5) now shows as
  untracked and is committed with this fix.

## Investigation Notes
- `git check-ignore -v .env.example` pointed straight at `.gitignore:34:.env*`.

## Challenges & Solutions
- None.

## Impact Assessment
- Onboarding only. Without it the README's first instruction fails for anyone else.

## Quality Assurance
- `git check-ignore` now matches the negation rule. Fresh clone verified end to end
  with a hand-written `.env`: install, migrate, seed (207 ingredients), 155 tests pass,
  dev server redirects unauthenticated requests to `/login`. Without `.env` the server
  returns a 500 whose log message says exactly what to do.

## Outcome & Lessons
- "Check it from a clean clone" belongs in step 1's checklist, not only at the end.
  Scaffold-provided ignore files deserve a read before trusting them.

## Tags
setup gitignore onboarding
