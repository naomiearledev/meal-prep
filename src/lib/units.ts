/**
 * The only place quantities are converted. Recipes are written in whatever unit is
 * natural (tsp, tbsp, cups, grams, tins); shopping and prep work in one base unit per
 * ingredient: grams for things bought by weight, millilitres for liquids, a count for
 * eggs, cloves, tins. Conversion between volume and weight is per ingredient via its
 * density (`gramsPerMl`); between weight and count via `gramsEach`.
 */
import type { MeasureType } from "@/db/schema";

export type BaseUnit = "g" | "ml" | "each";

export type IngredientMeasure = {
  measureType: MeasureType;
  gramsPerMl: number | null;
  gramsEach: number | null;
  countUnit: string | null;
};

export type Quantity = { value: number; unit: BaseUnit };

export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversionError";
  }
}

/** UK metric measures. */
export const WEIGHT_UNITS_IN_GRAMS: Record<string, number> = { g: 1, kg: 1000 };
export const VOLUME_UNITS_IN_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 250,
};

export const WEIGHT_UNITS = Object.keys(WEIGHT_UNITS_IN_GRAMS);
export const VOLUME_UNITS = Object.keys(VOLUME_UNITS_IN_ML);

/** Rounds to `decimals` places without the usual binary floating point surprises. */
export function roundTo(value: number, decimals: number): number {
  return Number(`${Math.round(Number(`${value}e${decimals}`))}e-${decimals}`);
}

const cleanup = (value: number) => roundTo(value, 6);

type UnitKind = "weight" | "volume" | "count";

function classifyUnit(unit: string, ingredient: IngredientMeasure): UnitKind {
  if (unit in WEIGHT_UNITS_IN_GRAMS) return "weight";
  if (unit in VOLUME_UNITS_IN_ML) return "volume";
  if (unit === "each" || (ingredient.countUnit !== null && unit === ingredient.countUnit)) {
    return "count";
  }
  throw new ConversionError(`Unknown unit "${unit}"`);
}

function density(ingredient: IngredientMeasure): number {
  if (ingredient.gramsPerMl === null || ingredient.gramsPerMl <= 0) {
    throw new ConversionError(
      "Cannot convert between volume and weight without a density (grams per ml)",
    );
  }
  return ingredient.gramsPerMl;
}

function gramsEach(ingredient: IngredientMeasure): number {
  if (ingredient.gramsEach === null || ingredient.gramsEach <= 0) {
    throw new ConversionError("Cannot convert to a count without knowing the weight of one");
  }
  return ingredient.gramsEach;
}

/** Converts a recipe amount into the ingredient's base unit. */
export function toBaseUnit(amount: number, unit: string, ingredient: IngredientMeasure): Quantity {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ConversionError(`Amount must be a non-negative number, got ${amount}`);
  }
  const normalisedUnit = unit.trim().toLowerCase();
  const kind = classifyUnit(normalisedUnit, ingredient);

  const grams = () => amount * WEIGHT_UNITS_IN_GRAMS[normalisedUnit];
  const millilitres = () => amount * VOLUME_UNITS_IN_ML[normalisedUnit];

  switch (ingredient.measureType) {
    case "weight": {
      if (kind === "weight") return { value: cleanup(grams()), unit: "g" };
      if (kind === "volume") return { value: cleanup(millilitres() * density(ingredient)), unit: "g" };
      throw new ConversionError("A weight ingredient cannot be measured as a count");
    }
    case "volume": {
      if (kind === "volume") return { value: cleanup(millilitres()), unit: "ml" };
      if (kind === "weight") return { value: cleanup(grams() / density(ingredient)), unit: "ml" };
      throw new ConversionError("A volume ingredient cannot be measured as a count");
    }
    case "count": {
      if (kind === "count") return { value: cleanup(amount), unit: "each" };
      if (kind === "weight") return { value: cleanup(grams() / gramsEach(ingredient)), unit: "each" };
      return {
        value: cleanup((millilitres() * density(ingredient)) / gramsEach(ingredient)),
        unit: "each",
      };
    }
  }
}

/**
 * Shopping list rounding: weight to the nearest 5 g, volume to the nearest 5 ml, never
 * down to zero; counts up to whole numbers.
 */
export function roundForShopping(value: number, unit: BaseUnit): number {
  if (value <= 0) return 0;
  if (unit === "each") return Math.ceil(roundTo(value, 6));
  return Math.max(5, Math.round(value / 5) * 5);
}

function pluralise(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

/** Human-readable quantity: 1200 g → "1.2 kg", 1500 ml → "1.5 L", 3 each egg → "3 eggs". */
export function formatQuantity(value: number, unit: BaseUnit, countUnit?: string | null): string {
  switch (unit) {
    case "g":
      return value >= 1000 ? `${roundTo(value / 1000, 2)} kg` : `${roundTo(value, 1)} g`;
    case "ml":
      return value >= 1000 ? `${roundTo(value / 1000, 2)} L` : `${roundTo(value, 1)} ml`;
    case "each": {
      const number = roundTo(value, 2);
      return countUnit ? `${number} ${pluralise(countUnit, number)}` : `${number}`;
    }
  }
}
