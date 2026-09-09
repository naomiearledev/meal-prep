# Branch ADR: feat/unit-conversion

## Meta
- **Branch**: feat/unit-conversion
- **Type**: feat
- **Created**: 2026-09-09
- **Status**: Merged
- **Author**: Claude
- **PR**: (not yet created)

## Problem Statement
### Context
Step 3 of PLAN.md. Recipes are written in tsp/tbsp/cups; shopping and cooking happen
by weight. There is no universal volume→weight factor, so conversion is per ingredient.
A wrong conversion is a silently wrong shopping list, so this module is built and
tested before anything uses it.

### Goals
- `src/lib/units.ts`: `toBaseUnit`, `roundForShopping`, `formatQuantity`, pure and
  fully tested. UK metric spoons (tsp 5 ml, tbsp 15 ml, cup 250 ml).
- `src/lib/aggregate.ts`: merge recipe lines across orders on ingredient ID.

### Non-Goals
- Any UI. Any database access; both modules take plain objects.
- Prep sheet merging of portions per recipe (step 8; it is a trivial grouping).

## Decision Record
### Options Considered
- **Which base unit an ingredient lands in**: fixed by the ingredient's `measureType`,
  not by the unit the recipe used. So olive oil classed as `weight` shows in grams
  even when the recipe says tbsp; stock classed as `volume` shows in ml even if a
  recipe weighs it. The plan's "liquids show in ml" is therefore a data decision made
  per ingredient in the library, which is where it belongs.
- **Count ingredients written by weight** (e.g. 116 g egg): allowed via `gramsEach`;
  refused with a clear error when it isn't set. Volume → count needs both density and
  `gramsEach` (a tsp of garlic ≈ 0.6 clove).
- **Errors vs silent fallbacks** when a density is missing: throw `ConversionError`.
  A guess would be exactly the silent wrong list the plan warns about. `aggregate`
  prefixes the message with the ingredient name so the UI can point at the fix.
- **Where rounding happens**: once, on the summed total, not per line. Three lines of
  2.5 g must give 10 g, not 15 g. Tested explicitly.
- **Rounding rules**: weight nearest 5 g, volume nearest 5 ml, never rounding a
  positive amount down to zero (0.6 g of something still needs buying), counts
  rounded up.
- **Floating point**: results are cleaned to 6 dp with the `Number("1.255e2")` string
  trick rather than `toFixed`, because `(1.255).toFixed(2)` is `"1.25"`. Without the
  cleanup, `0.1 kg` came out as 100.00000000000001 g.
- **Formatting**: `formatQuantity` rolls into kg/L at 1000, grams and ml to 1 dp,
  kg/L to 2 dp, counts pluralised by adding "s" (egg→eggs, clove→cloves, tin→tins).
  Naive pluralisation is fine for the count units in use; revisit if one ends in "s".
- **Unit strings**: matched case-insensitively after trimming. A count ingredient
  accepts `each` or its own `countUnit` name.

### Decision
All of the above. `IngredientMeasure` is the minimal shape the module needs
(`measureType`, `gramsPerMl`, `gramsEach`, `countUnit`), structurally satisfied by a
database ingredient row, so no adapter is needed later.

### Trade-offs Accepted
- Throwing on missing density means a recipe can be saved that later blocks a shopping
  list. Step 5 (recipes) should validate units against the chosen ingredient at entry
  time using the same function, so the error surfaces where it can be fixed.
- `cup` is fixed at 250 ml (metric). US cups (240 ml) are not supported.

## Implementation
- `units.ts` exports `toBaseUnit`, `roundForShopping`, `formatQuantity`, `roundTo`,
  `ConversionError`, `WEIGHT_UNITS_IN_GRAMS`, `VOLUME_UNITS_IN_ML`, unit name lists
  for forms later.
- `aggregate.ts` exports `aggregateShoppingList(sources)` → lines sorted by name with
  `display` ready for the Copy button, plus `ShoppingSource`/`ShoppingLine` types.
- 28 tests for units, 9 for aggregate. Written first; the implementation passed them
  on the first run.

## Investigation Notes
- Plan test case "tbsp olive oil → 13.8 g" only holds if olive oil is a `weight`
  ingredient (15 ml × 0.92). The seed data in step 4 should class it as weight.

## Challenges & Solutions
- None beyond the floating point cleanup noted above.

## Impact Assessment
- Everything downstream (shopping list, prep sheet) depends on these functions. The
  CLAUDE.md rule that conversion goes through `units.ts` and nowhere else is what makes
  the 37 tests here sufficient.

## Quality Assurance
- `npm test`: 6 files, 54 tests passing. `tsc --noEmit` and `eslint` clean.

## Outcome & Lessons
- Deciding the base unit from the ingredient (not the recipe unit) resolved the
  apparent conflict in the plan between "everything in weight" and "liquids in ml".

## Tags
core-logic units conversion
