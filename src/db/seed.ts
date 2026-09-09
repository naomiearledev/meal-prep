import type { Db } from "./client";
import { ingredients } from "./schema";
import { seedIngredients } from "./seed-data";

/**
 * Inserts the starter ingredient library. Skips any name already present, so it is safe
 * to run again and never overwrites densities that have been edited.
 * Returns how many rows were inserted.
 */
export function seed(db: Db): number {
  return db.transaction((tx) => {
    let inserted = 0;
    for (const ingredient of seedIngredients) {
      const result = tx
        .insert(ingredients)
        .values({
          name: ingredient.name,
          measureType: ingredient.measureType,
          gramsPerMl: ingredient.gramsPerMl ?? null,
          countUnit: ingredient.countUnit ?? null,
          gramsEach: ingredient.gramsEach ?? null,
        })
        .onConflictDoNothing({ target: ingredients.name })
        .run();
      inserted += result.changes;
    }
    return inserted;
  });
}
