# Branch ADR: feat/recipes

## Meta
- **Branch**: feat/recipes
- **Type**: feat
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 5 of PLAN.md. Recipes with per-portion ingredient rows drawn from the library,
ordered steps, and a photo taken on a phone. The recipe grid is the home page.

### Goals
- `/` recipe grid with search; `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit`.
- Ingredient rows that only offer units the chosen ingredient can convert.
- Phone photo upload: shrunk in the browser, stored under `data/uploads/`, served back
  behind the login.
- Validation that catches a unit that can't convert at entry time (the trade-off
  accepted in step 3).

### Non-Goals
- Portions selector and "Add to cart" on the recipe page: they need the cart (step 6).
- Recipe scaling display, nutrition, tags, import from URLs.

## Decision Record
### Options Considered
- **Unit choice per row**: free text vs a select limited by `allowedUnits(ingredient)`
  (new in `units.ts`, tested). The select makes an unconvertible unit impossible to pick;
  server validation still runs `toBaseUnit` on every row as the real guard.
- **Row/step submission shape**: JSON blob in a hidden field vs repeated form fields
  (`ingredientId`, `amount`, `unit`, `step`) read with `FormData.getAll`. Repeated
  fields keep the form a real form, and validation errors map back to rows by index.
- **Blank rows**: a row with neither ingredient nor amount is ignored; a row with one
  but not the other is an error. So the trailing empty row the form starts with never
  blocks saving.
- **Photo storage**: `public/` vs `data/uploads/` served by a route handler. The plan
  chose `data/` so one directory is the whole backup; the route also means photos sit
  behind the login like everything else (the middleware matcher already covers `/api`).
- **Photo names**: server-generated UUID plus an extension from the content type.
  Reads accept only that exact shape, so path traversal is impossible by construction.
- **Client-side resize**: `createImageBitmap` with `imageOrientation: "from-image"` so
  phone photos come out upright, drawn to a canvas at max 1600 px, JPEG at 0.85.
  The pure size maths (`fitWithin`) is tested; the canvas glue is browser-only and
  checked by hand.
- **Images**: plain `<img>` rather than `next/image`. The photos are local, already
  resized, and served by our own route; the optimiser adds nothing here.
- **Deleting a recipe**: cascades to its rows, steps and cart entry; refused if it is
  in an order (FK restrict), with a message.
- **Duplicate recipe names**: allowed. Two "Chilli" recipes are a legitimate choice.

### Decision
As above. `Queryable = Db | Tx` added to `client.ts` so helpers can run inside a
transaction; `createRecipe` and `updateRecipe` write the recipe, rows and steps
atomically.

### Trade-offs Accepted
- Updating a recipe replaces all rows and steps rather than diffing. Simple, and row
  ids are not referenced anywhere else.
- `resizeImage` is untested. It is small and browser-only; a wrong resize is cosmetic.
- Large ingredient library in a native `<select>` per row. Works well on phones (native
  picker) and is testable; a searchable combobox can come later if it grates.

## Implementation
- `src/lib/units.ts` `allowedUnits`; `src/lib/images.ts` `fitWithin`, `resizeImage`;
  `src/lib/photos.ts` `savePhoto`, `readPhoto`, `isSafePhotoName`, `photoContentType`.
- `src/db/recipes.ts`: `validateRecipeInput`, `listRecipes`, `getRecipe` (rows joined
  to ingredients, ordered), `createRecipe`, `updateRecipe`, `deleteRecipe`, `RecipeError`.
- `src/app/api/photos/route.ts` (POST) and `src/app/api/photos/[name]/route.ts` (GET,
  immutable cache headers since names are unique).
- `src/app/(app)/RecipeGrid.tsx`, `page.tsx` (grid + search),
  `recipes/{RecipeForm,PhotoField}.tsx`, `recipes/actions.ts`,
  `recipes/new/page.tsx`, `recipes/[id]/page.tsx`, `recipes/[id]/edit/page.tsx`.
- Tests: units +4, images 4, photos 8, recipes 12, RecipeForm 5, RecipeGrid 2. The
  placeholder home-page test from step 1 is gone; the grid has a real test instead.

## Investigation Notes
- jsdom enforces `required` on `requestSubmit`, so a test that submits an empty
  required field never reaches the action. The error-display test types a name first.
- Placeholder option text "Choose an ingredient" collided with the validation message
  of the same wording in a `getByText`. Renamed the placeholder.
- Drizzle's transaction object is not assignable to the `Db` type; hence `Queryable`.

## Challenges & Solutions
- See Investigation Notes.

## Impact Assessment
- Photos are the first thing that writes outside the database. `UPLOADS_DIR` is
  documented alongside `DATABASE_PATH` so hosting can mount one `data/` volume.
- Validation rejecting unconvertible units means the shopping list (step 7) can treat
  a `ConversionError` as a bug rather than a user-facing state.

## Quality Assurance
- `npm test`: 13 files, 116 tests passing. `tsc --noEmit` and `eslint` clean.
- By hand against the dev server: grid lists a recipe and links to it; search with no
  match shows the message; show, new and edit pages render (200), unknown id 404;
  photo upload returns a URL, fetching it returns identical bytes with `image/jpeg`;
  a GIF upload is refused (400); a traversal attempt on the photo route is refused;
  the photo route redirects without the login cookie.

## Outcome & Lessons
- Reading repeated form fields with `getAll` kept the multi-row form plain HTML and
  made server validation trivially testable with both objects and `FormData`.

## Tags
ui data recipes photos
