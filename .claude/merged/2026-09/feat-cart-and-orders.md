# Branch ADR: feat/cart-and-orders

## Meta
- **Branch**: feat/cart-and-orders
- **Type**: feat
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 6 of PLAN.md. A cart of recipes and portions that becomes an order, and an orders
page where orders are identified by date, can be marked fulfilled, and filtered to
outstanding or all.

### Goals
- "Add to cart" with a portions count on the recipe page.
- `/cart`: adjust portions, remove lines, create order.
- `/orders`: newest first, items per order, fulfilled toggle, outstanding/all filter.
- Orders reference recipes (no snapshot), as the plan decided.

### Non-Goals
- Order selection tick boxes, shopping list, prep sheet (steps 7 and 8).
- Deleting or editing an order. Marking it outstanding again covers mistakes.
- A cart count in the nav.

## Decision Record
### Options Considered
- **Cart interaction**: client component with optimistic state vs plain server-rendered
  forms per line. Chose forms: one `Update` form and one `Remove` form per line. No
  client JavaScript needed, works on a phone, trivially testable as a presentational
  component with stubbed actions.
- **Adding a recipe already in the cart**: replace vs add. Add (an upsert with
  `portions + n`), so pressing "Add to cart" twice does what it says.
- **Portions of 0 on Update**: error vs remove. Remove; it's the obvious intent.
- **Errors from cart actions**: `useActionState` vs query string. Query string, since
  the forms are server-rendered and there's nothing typed to preserve.
- **Order creation**: one transaction that reads the cart, inserts the order and its
  items, and clears the cart. Empty cart is an `OrderError`.
- **Fulfilled toggle**: server action that revalidates `/orders` without redirecting,
  so the current filter (`?show=all`) stays put.
- **Dates**: `Intl.DateTimeFormat("en-GB", { day, month: "short", year })` gives
  "3 Sept 2026". `formatShortDate` ("3 Sept") is there for the allocation table in step 8.
- **Recipe page default portions**: 1. No basis for guessing a typical batch.

### Decision
As above. `getCart` and `clearCart` take `Queryable` so `createOrderFromCart` can call
them inside its transaction without casts.

### Trade-offs Accepted
- Each cart change is a full round trip. Fine at this scale; a cart has a handful of lines.
- `listOrders` loads all orders then fetches their items in one `IN` query. No paging.
  Personal use; revisit if the list ever grows into the hundreds.

## Implementation
- `src/db/cart.ts`: `getCart`, `addToCart`, `setCartPortions`, `removeFromCart`,
  `clearCart`, `CartError`.
- `src/db/orders.ts`: `createOrderFromCart`, `listOrders({ includeFulfilled })`,
  `setOrderFulfilled`, `OrderError`, `OrderSummary` with items and `totalPortions`.
- `src/lib/dates.ts`: `formatOrderDate`, `formatShortDate`.
- `src/app/(app)/cart/{page,CartView,actions}`, `src/app/(app)/orders/{page,OrdersList,actions}`,
  add-to-cart form on `recipes/[id]/page.tsx`.
- Tests: cart 8, orders 7, dates 2, CartView 3, OrdersList 2.

## Investigation Notes
- Node 20's ICU already formats September as "Sept" for en-GB, matching British usage.

## Challenges & Solutions
- None of note.

## Impact Assessment
- Orders reference recipes by id; editing a recipe changes what past orders mean. The
  plan accepts this for a personal tool. Deleting a recipe in an order is refused
  (step 5), so an order can never point at nothing.

## Quality Assurance
- `npm test`: 18 files, 137 tests passing. `tsc --noEmit` and `eslint` clean.
- By hand against the dev server with a temporary recipe: recipe page shows the
  add-to-cart form; `/cart` lists the line with its portions, the total and the Create
  order button; `?error=` renders the alert; `/orders` shows only the outstanding order
  with "Mark fulfilled"; `?show=all` shows both, the fulfilled one with its date and
  "Mark outstanding". Temporary data removed afterwards.

## Outcome & Lessons
- Plain forms with bound server actions cover a surprising amount of UI without any
  client state. Worth defaulting to before reaching for a client component.

## Tags
ui data cart orders
