/**
 * Merging recipe lines across orders into one shopping list. Everything is grouped on
 * ingredient ID, converted to the ingredient's base unit, scaled by portions and summed.
 * Rounding happens once, on the total.
 */
import {
  ConversionError,
  formatQuantity,
  roundForShopping,
  toBaseUnit,
  type BaseUnit,
  type IngredientMeasure,
} from "./units";

export type ShoppingIngredient = IngredientMeasure & { id: number; name: string };

/** One recipe line, with the portions it is being cooked for. Amounts are per portion. */
export type ShoppingSource = {
  portions: number;
  ingredient: ShoppingIngredient;
  amount: number;
  unit: string;
};

export type ShoppingLine = {
  ingredientId: number;
  name: string;
  value: number;
  unit: BaseUnit;
  countUnit: string | null;
  display: string;
};

export function aggregateShoppingList(sources: ShoppingSource[]): ShoppingLine[] {
  const totals = new Map<number, { ingredient: ShoppingIngredient; value: number; unit: BaseUnit }>();

  for (const { portions, ingredient, amount, unit } of sources) {
    const converted = convert(amount, unit, ingredient);
    const existing = totals.get(ingredient.id);
    if (existing) {
      existing.value += converted.value * portions;
    } else {
      totals.set(ingredient.id, {
        ingredient,
        value: converted.value * portions,
        unit: converted.unit,
      });
    }
  }

  return [...totals.values()]
    .map(({ ingredient, value, unit }) => {
      const rounded = roundForShopping(value, unit);
      return {
        ingredientId: ingredient.id,
        name: ingredient.name,
        value: rounded,
        unit,
        countUnit: ingredient.countUnit,
        display: formatQuantity(rounded, unit, ingredient.countUnit),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}

function convert(amount: number, unit: string, ingredient: ShoppingIngredient) {
  try {
    return toBaseUnit(amount, unit, ingredient);
  } catch (error) {
    if (error instanceof ConversionError) {
      throw new ConversionError(`${ingredient.name}: ${error.message}`);
    }
    throw error;
  }
}
