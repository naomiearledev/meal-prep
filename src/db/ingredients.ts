import { eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { ingredients, measureTypes, type MeasureType } from "./schema";

export type Ingredient = typeof ingredients.$inferSelect;

export type IngredientInput = {
  name: string;
  measureType: MeasureType;
  gramsPerMl: number | null;
  countUnit: string | null;
  gramsEach: number | null;
};

export type ValidationResult =
  | { ok: true; value: IngredientInput }
  | { ok: false; errors: Record<string, string> };

export class IngredientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngredientError";
  }
}

type RawInput = Record<string, unknown> | FormData;

function field(raw: RawInput, key: string): string {
  const value = raw instanceof FormData ? raw.get(key) : raw[key];
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value);
}

function optionalPositiveNumber(text: string): number | null | "invalid" {
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : "invalid";
}

/** Turns form input (all strings) into a typed, trimmed ingredient or a set of field errors. */
export function validateIngredientInput(raw: RawInput): ValidationResult {
  const errors: Record<string, string> = {};

  const name = field(raw, "name");
  if (!name) errors.name = "Give the ingredient a name";

  const measureType = field(raw, "measureType") as MeasureType;
  if (!measureTypes.includes(measureType)) {
    errors.measureType = "Choose weight, volume or count";
  }

  const gramsPerMl = optionalPositiveNumber(field(raw, "gramsPerMl"));
  if (gramsPerMl === "invalid") errors.gramsPerMl = "Density must be a number above 0";

  let countUnit: string | null = null;
  let gramsEach: number | null | "invalid" = null;
  if (measureType === "count") {
    countUnit = field(raw, "countUnit") || null;
    if (!countUnit) errors.countUnit = "Say what one of these is called, e.g. egg, clove, tin";
    gramsEach = optionalPositiveNumber(field(raw, "gramsEach"));
    if (gramsEach === "invalid") errors.gramsEach = "Grams each must be a number above 0";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      measureType,
      gramsPerMl: gramsPerMl as number | null,
      countUnit,
      gramsEach: gramsEach as number | null,
    },
  };
}

export function listIngredients(db: Db, query = ""): Ingredient[] {
  const trimmed = query.trim().toLowerCase();
  const base = db.select().from(ingredients);
  const filtered = trimmed
    ? base.where(sql`lower(${ingredients.name}) like ${`%${trimmed}%`}`)
    : base;
  return filtered.orderBy(sql`lower(${ingredients.name})`).all();
}

export function getIngredient(db: Db, id: number): Ingredient | undefined {
  return db.select().from(ingredients).where(eq(ingredients.id, id)).get();
}

function assertNameFree(db: Db, name: string, exceptId?: number) {
  const clash = db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(sql`lower(${ingredients.name}) = lower(${name})`)
    .get();
  if (clash && clash.id !== exceptId) {
    throw new IngredientError(`An ingredient called ${name} already exists`);
  }
}

export function createIngredient(db: Db, input: IngredientInput): Ingredient {
  assertNameFree(db, input.name);
  return db.insert(ingredients).values(input).returning().get();
}

export function updateIngredient(db: Db, id: number, input: IngredientInput): Ingredient {
  if (!getIngredient(db, id)) throw new IngredientError("That ingredient no longer exists");
  assertNameFree(db, input.name, id);
  return db.update(ingredients).set(input).where(eq(ingredients.id, id)).returning().get();
}

export function deleteIngredient(db: Db, id: number): void {
  try {
    db.delete(ingredients).where(eq(ingredients.id, id)).run();
  } catch (error) {
    if (isForeignKeyError(error)) {
      throw new IngredientError("This ingredient is used by a recipe, so it can't be deleted");
    }
    throw error;
  }
}

/**
 * SQLite reports an ON DELETE RESTRICT violation as SQLITE_CONSTRAINT_TRIGGER (restrict
 * is implemented with internal triggers), and a plain FK failure as
 * SQLITE_CONSTRAINT_FOREIGNKEY. The message is the same for both.
 */
function isForeignKeyError(error: unknown): boolean {
  return error instanceof Error && /FOREIGN KEY constraint failed/.test(error.message);
}
