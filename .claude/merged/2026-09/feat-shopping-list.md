# Branch ADR: feat/shopping-list

## Meta
- **Branch**: feat/shopping-list
- **Type**: feat
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 7 of PLAN.md. From any selection of orders, one merged shopping list with a Copy
button whose output pastes into Apple Reminders as one item per line. This is where
`units.ts` and `aggregate.ts` (step 3) finally meet real data.

### Goals
- Tick boxes on `/orders`, a "Shopping list" button, `/orders/shopping-list?ids=…`.
- Lines merged on ingredient id across all selected orders, scaled by each order's
  portions, rounded once, formatted for shopping.
- Copy to clipboard with feedback.

### Non-Goals
- Prep sheet (step 8), which will reuse the same selection form.
- Ticking off items, saving lists, or excluding pantry staples.

## Decision Record
### Options Considered
- **Selection form vs per-order forms**: each order already has a fulfilled-toggle form,
  and forms cannot nest. Tick boxes use the HTML `form` attribute to belong to a
  separate GET form that holds the submit button. Plain HTML, no client state.
- **URL shape**: a GET form with repeated `ids` gives `?ids=1&ids=2`. `parseIds` also
  accepts `?ids=1,2` so a hand-typed or shared URL works, and drops junk/duplicates.
- **Query**: one join from order items through recipe ingredients to ingredients,
  returning `ShoppingSource[]` directly in the shape `aggregateShoppingList` wants.
  No per-recipe fetching.
- **Text format**: `Name quantity` per line ("Chicken thigh 1.2 kg"). Name first reads
  best in a Reminders list; the quantity uses `formatQuantity` from step 3.
- **Clipboard**: `navigator.clipboard.writeText` with a "Copied" status and a fallback
  message if the browser refuses (it requires a secure context or localhost; a homelab
  on plain HTTP over a LAN would hit this, so the visible list is always there to
  select and copy by hand).
- **Conversion failure at list time**: can only happen if an ingredient's density was
  removed after a recipe used it. The page catches `ConversionError` and shows the
  ingredient name with a link to the library, rather than a 500.

### Decision
As above.

### Trade-offs Accepted
- No memory of which orders were ticked; the URL is the state. Bookmarkable, and the
  prep sheet will take the same `ids`.
- Clipboard needs HTTPS or localhost. Documented for the friend's hosting via the
  fallback message rather than an alternative copy mechanism.

## Implementation
- `src/db/orders.ts`: `getOrdersByIds` (oldest first), `shoppingSourcesForOrders`.
- `src/lib/aggregate.ts`: `shoppingListText`. `src/lib/ids.ts`: `parseIds`.
- `src/components/CopyButton.tsx`; `src/app/(app)/orders/OrdersList.tsx` gains the
  selection form and tick boxes; `src/app/(app)/orders/shopping-list/{page,ShoppingListView}.tsx`.
- Tests: orders +2, aggregate +2, ids 2, OrdersList +1, CopyButton 1, ShoppingListView 2.

## Investigation Notes
- jest-dom refuses `toHaveValue` on checkboxes; assert the `value` attribute instead.
- `userEvent.setup()` installs a working clipboard stub in jsdom, so the copy test can
  read back what was written.

## Challenges & Solutions
- None beyond the above.

## Impact Assessment
- The end-to-end plan verification case ("tsp in one recipe and grams in another
  summing to one line") is now reachable in the UI.

## Quality Assurance
- `npm test`: 21 files, 147 tests passing. `tsc --noEmit` and `eslint` clean.
- By hand against the dev server with two temporary orders sharing olive oil (one
  recipe in tbsp, one in grams): the list showed one olive oil line at 115 g
  (6 × 13.8 g + 3 × 10 g = 112.8 g, rounded to 5 g), chicken thigh 900 g, eggs rounded
  up from 1.5 to 2. Repeated and comma-separated ids both work; no ids shows the
  explanation. Temporary data removed afterwards.

## Outcome & Lessons
- **Known issue**: Naomi reports that pasting the copied text into Apple Reminders does
  not create one item per line as the plan assumed. Accepted for now; to be refined in a
  later step (likely a different line separator or a Shortcuts/x-callback route).
- The `form` attribute on inputs is the clean answer to "a checkbox inside something
  that is already a form".

## Tags
ui shopping-list orders
