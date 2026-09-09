/**
 * Prep sheet maths: how many portions of each recipe to cook across a set of orders,
 * and how to split them back out per order afterwards.
 */
import { formatQuantity, toBaseUnit, type BaseUnit, type IngredientMeasure } from "./units";

export type OrderForPrep = {
  id: number;
  createdAt: Date;
  items: { recipeId: number; recipeName: string; portions: number }[];
};

export type RecipePortions = { recipeId: number; name: string; portions: number };

export type AllocationRow = { orderId: number; date: Date; portions: Record<number, number> };

export type MergedPortions = { recipes: RecipePortions[]; allocation: AllocationRow[] };

export function mergePortions(orders: OrderForPrep[]): MergedPortions {
  const totals = new Map<number, RecipePortions>();
  for (const order of orders) {
    for (const item of order.items) {
      const existing = totals.get(item.recipeId);
      if (existing) existing.portions += item.portions;
      else totals.set(item.recipeId, { recipeId: item.recipeId, name: item.recipeName, portions: item.portions });
    }
  }

  const recipes = [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

  const allocation = [...orders]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)
    .map((order) => ({
      orderId: order.id,
      date: order.createdAt,
      portions: Object.fromEntries(order.items.map((item) => [item.recipeId, item.portions])) as Record<number, number>,
    }));

  return { recipes, allocation };
}

/**
 * A recipe line scaled to the portions being cooked, in the ingredient's base unit.
 * Exact, not rounded for shopping: 1.5 eggs is what the cook needs to know.
 */
export function scaleForPrep(
  amount: number,
  unit: string,
  portions: number,
  ingredient: IngredientMeasure,
): { value: number; unit: BaseUnit; display: string } {
  const base = toBaseUnit(amount, unit, ingredient);
  const value = Number((base.value * portions).toPrecision(12));
  return { value, unit: base.unit, display: formatQuantity(value, base.unit, ingredient.countUnit) };
}
