import { asc, eq, sql } from "drizzle-orm";
import type { Db, Queryable } from "./client";
import { ingredients, recipeIngredients, recipeSteps, recipes } from "./schema";
import type { Ingredient } from "./ingredients";
import { toBaseUnit, ConversionError, type IngredientMeasure } from "@/lib/units";

export type Recipe = typeof recipes.$inferSelect;
export type RecipeStep = typeof recipeSteps.$inferSelect;
export type RecipeIngredientRow = typeof recipeIngredients.$inferSelect & { ingredient: Ingredient };
export type RecipeDetail = Recipe & { ingredients: RecipeIngredientRow[]; steps: RecipeStep[] };

export type RecipeIngredientInput = { ingredientId: number; amount: number; unit: string };

/** Ingredient amounts are per portion. */
export type RecipeInput = {
  name: string;
  notes: string | null;
  photoUrl: string | null;
  ingredients: RecipeIngredientInput[];
  steps: string[];
};

export type RecipeValidation =
  | { ok: true; value: RecipeInput }
  | { ok: false; errors: Record<string, string> };

export class RecipeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeError";
  }
}

type RawInput = Record<string, unknown> | FormData;

function one(raw: RawInput, key: string): string {
  const value = raw instanceof FormData ? raw.get(key) : raw[key];
  return typeof value === "string" ? value.trim() : "";
}

function many(raw: RawInput, key: string): string[] {
  const values = raw instanceof FormData ? raw.getAll(key) : raw[key];
  const list = Array.isArray(values) ? values : values == null ? [] : [values];
  return list.map((value) => (typeof value === "string" ? value.trim() : ""));
}

/**
 * Turns form input into a typed recipe or field errors. Ingredient rows are validated
 * against the library so a unit that can't convert is caught here, not on the shopping
 * list. Row errors are keyed `ingredient.<index>` by their position in the form.
 */
export function validateRecipeInput(
  raw: RawInput,
  ingredientsById: Map<number, IngredientMeasure & { id: number; name: string }>,
): RecipeValidation {
  const errors: Record<string, string> = {};

  const name = one(raw, "name");
  if (!name) errors.name = "Give the recipe a name";
  const notes = one(raw, "notes") || null;
  const photoUrl = one(raw, "photoUrl") || null;

  const ids = many(raw, "ingredientId");
  const amounts = many(raw, "amount");
  const units = many(raw, "unit");
  const rowCount = Math.max(ids.length, amounts.length, units.length);

  const rows: RecipeIngredientInput[] = [];
  for (let i = 0; i < rowCount; i++) {
    const id = ids[i] ?? "";
    const amountText = amounts[i] ?? "";
    const unit = units[i] ?? "";
    if (!id && !amountText) continue; // an untouched blank row

    const ingredient = ingredientsById.get(Number(id));
    if (!id || !ingredient) {
      errors[`ingredient.${i}`] = "Choose an ingredient";
      continue;
    }
    const amount = Number(amountText);
    if (!amountText || !Number.isFinite(amount) || amount <= 0) {
      errors[`ingredient.${i}`] = "Amount must be a number above 0";
      continue;
    }
    try {
      toBaseUnit(amount, unit, ingredient);
    } catch (error) {
      if (error instanceof ConversionError) {
        errors[`ingredient.${i}`] = `Can't measure ${ingredient.name} in ${unit || "that unit"}: ${error.message}`;
        continue;
      }
      throw error;
    }
    rows.push({ ingredientId: ingredient.id, amount, unit });
  }
  if (rows.length === 0 && !Object.keys(errors).some((key) => key.startsWith("ingredient."))) {
    errors.ingredients = "Add at least one ingredient";
  }

  const steps = many(raw, "step").filter((text) => text !== "");

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, notes, photoUrl, ingredients: rows, steps } };
}

export function listRecipes(db: Db, query = ""): Recipe[] {
  const trimmed = query.trim().toLowerCase();
  const base = db.select().from(recipes);
  const filtered = trimmed ? base.where(sql`lower(${recipes.name}) like ${`%${trimmed}%`}`) : base;
  return filtered.orderBy(sql`lower(${recipes.name})`).all();
}

export function getRecipe(db: Queryable, id: number): RecipeDetail | undefined {
  const recipe = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!recipe) return undefined;

  const rows = db
    .select({ row: recipeIngredients, ingredient: ingredients })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.position))
    .all()
    .map(({ row, ingredient }) => ({ ...row, ingredient }));

  const steps = db
    .select()
    .from(recipeSteps)
    .where(eq(recipeSteps.recipeId, id))
    .orderBy(asc(recipeSteps.position))
    .all();

  return { ...recipe, ingredients: rows, steps };
}

function writeRows(db: Queryable, recipeId: number, input: RecipeInput) {
  db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId)).run();
  db.delete(recipeSteps).where(eq(recipeSteps.recipeId, recipeId)).run();
  if (input.ingredients.length > 0) {
    db.insert(recipeIngredients)
      .values(input.ingredients.map((row, position) => ({ recipeId, ...row, position })))
      .run();
  }
  if (input.steps.length > 0) {
    db.insert(recipeSteps)
      .values(input.steps.map((text, position) => ({ recipeId, text, position })))
      .run();
  }
}

export function createRecipe(db: Db, input: RecipeInput): RecipeDetail {
  return db.transaction((tx) => {
    const recipe = tx
      .insert(recipes)
      .values({ name: input.name, notes: input.notes, photoUrl: input.photoUrl })
      .returning()
      .get();
    writeRows(tx, recipe.id, input);
    return getRecipe(tx, recipe.id)!;
  });
}

export function updateRecipe(db: Db, id: number, input: RecipeInput): RecipeDetail {
  if (!db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, id)).get()) {
    throw new RecipeError("That recipe no longer exists");
  }
  return db.transaction((tx) => {
    tx.update(recipes)
      .set({ name: input.name, notes: input.notes, photoUrl: input.photoUrl })
      .where(eq(recipes.id, id))
      .run();
    writeRows(tx, id, input);
    return getRecipe(tx, id)!;
  });
}

export function deleteRecipe(db: Db, id: number): void {
  try {
    db.delete(recipes).where(eq(recipes.id, id)).run();
  } catch (error) {
    if (error instanceof Error && /FOREIGN KEY constraint failed/.test(error.message)) {
      throw new RecipeError("This recipe is in an order, so it can't be deleted");
    }
    throw error;
  }
}
