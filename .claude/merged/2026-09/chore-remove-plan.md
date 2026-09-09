# Branch ADR: chore/remove-plan

## Meta
- **Branch**: chore/remove-plan
- **Type**: chore
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
PLAN.md was the build plan for the first eight steps. All eight are merged and each has
an archived ADR carrying its context, decisions and outcomes. Naomi asked for the plan to
be removed from the repo and for a check of what else is tracked.

### Goals
- Remove PLAN.md from the tree and fix the two references to it (CLAUDE.md, README).
- Confirm nothing else tracked shouldn't be.

### Non-Goals
- Rewriting git history. PLAN.md remains in earlier commits.

## Decision Record
### Options Considered
- Keep PLAN.md as a design doc vs remove it. Removed as asked; the ADRs are the living
  record and the plan would drift from the code.
- Rewrite history to purge it vs leave history alone. Left alone: it contains nothing
  sensitive, and rewriting a shared branch is disruptive.

### Decision
Delete the file, repoint CLAUDE.md at `.claude/merged/`, drop the README sentence.
The "Step N of PLAN.md" lines in archived ADRs stay as historical context.

### Trade-offs Accepted
- Archived ADRs reference a file that is now only in history.

## Implementation
- `git rm PLAN.md`; one-line edits to CLAUDE.md and README.md.

## Investigation Notes
- Audit of `git ls-files`: source, migrations, config, README, CLAUDE.md, `.env.example`,
  the ADR system. No `data/`, `.env`, uploads, `.next/` or `node_modules/`. The only
  file over 50 KB is `package-lock.json`, which belongs. No `.gitignore` additions needed.

## Challenges & Solutions
- None.

## Impact Assessment
- Documentation only.

## Quality Assurance
- `git ls-files` after the change shows no PLAN.md; `grep PLAN.md` outside
  `.claude/merged/` finds nothing.

## Outcome & Lessons
- None.

## Tags
docs housekeeping
