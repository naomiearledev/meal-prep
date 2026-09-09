# Branch ADR: feat/prep-sheet

## Meta
- **Branch**: feat/prep-sheet
- **Type**: feat
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 8 of PLAN.md, the last. From the same order selection as the shopping list, a
print-optimised sheet: each recipe once with its portions merged across orders,
ingredients scaled to that total, the steps, and finally an allocation table saying how
many portions of each recipe go to each order.

### Goals
- `/orders/prep-sheet?ids=…` and a "Prep sheet" button beside "Shopping list".
- Merged portions per recipe; scaled quantities in the ingredient's base unit.
- Allocation table, orders by recipe, oldest first, dashes where a recipe isn't in an order.
- Print: page break between recipes, app chrome hidden, a Print button.

### Non-Goals
- A PDF library. The browser's print-to-PDF is the PDF.
- Per-order packing labels or portion sizes in grams.

## Decision Record
### Options Considered
- **Rounding on the prep sheet**: shopping rounding (nearest 5 g, counts up) vs exact.
  Exact. The cook needs 110.4 g and 1.5 eggs, not 115 g and 2. `scaleForPrep` uses
  `toBaseUnit` and `formatQuantity` directly and skips `roundForShopping`.
- **Per-portion hint**: show the original recipe amount beside the scaled one
  ("150 g per portion"). Cheap, and it lets her sanity-check a scale-up at a glance.
- **Recipe details**: fetch each recipe with `getRecipe` after `mergePortions` decides
  which are needed, rather than a bespoke join. A prep sheet covers a handful of recipes.
- **Merging logic location**: pure `mergePortions` in `src/lib/prep.ts` over plain
  order summaries, so it's unit tested without a database and reusable.
- **Second submit button**: `formAction="/orders/prep-sheet"` on a button in the same
  GET form as "Shopping list", so one set of tick boxes serves both.
- **Page breaks**: Tailwind's `print:break-after-page` on each recipe section. The
  allocation table follows the last recipe's break, so it starts on its own page.
- **Print CSS**: minimal; nav already `print:hidden` from step 4; links lose underline
  and colour in print; the Back link and Print button are `print:hidden`.

### Decision
As above.

### Trade-offs Accepted
- Two orders on the same day are indistinguishable in the allocation table (they show
  the same date). Already flagged in step 7 as a known wrinkle in "orders identified by
  date"; a time or order number can be added if it bites.
- Count quantities like "1.5 eggs" are shown as such. Correct for cooking; the shopping
  list is where the rounding up happens.

## Implementation
- `src/lib/prep.ts`: `mergePortions`, `scaleForPrep`.
- `src/components/PrintButton.tsx`.
- `src/app/(app)/orders/prep-sheet/{page,PrepSheetView}.tsx`; "Prep sheet" button in
  `OrdersList.tsx`; a few lines of `@media print` in `globals.css`.
- Tests: prep 5, PrepSheetView 3, OrdersList +1 assertion.

## Investigation Notes
- `textContent` of adjacent `<span>`s has no spaces between them; the test caught it and
  explicit `{" "}` separators fixed both the test and copy-paste from the page.

## Challenges & Solutions
- None beyond the above.

## Impact Assessment
- Completes the plan's end-to-end flow: recipes → cart → orders → shopping list and
  prep sheet. Nothing new in the database.

## Quality Assurance
- `npm test`: 23 files, 155 tests passing. `tsc --noEmit` and `eslint` clean.
- By hand against the dev server with two temporary orders (3 Sept: biryani × 3,
  chilli × 2; 7 Sept: biryani × 5): "Smoke biryani — 8 portions" with 1.2 kg chicken
  and 110.4 g olive oil, "Smoke chilli — 2 portions" with 1 egg, allocation rows
  `3 Sept | 3 | 2` and `7 Sept | 5 | —`, page-break class present. Page-break behaviour
  itself is checked by printing to PDF in the browser.

## Outcome & Lessons
- Keeping shopping rounding out of `formatQuantity` in step 3 paid off here: the same
  formatter serves both exact prep quantities and rounded shopping ones.

## Tags
ui prep-sheet print orders
