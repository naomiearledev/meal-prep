// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mergePortions, scaleForPrep } from "./prep";

const sept3 = new Date(2026, 8, 3, 9, 0);
const sept7 = new Date(2026, 8, 7, 9, 0);

const orders = [
  {
    id: 2,
    createdAt: sept7,
    items: [{ recipeId: 10, recipeName: "Biryani", portions: 5 }],
  },
  {
    id: 1,
    createdAt: sept3,
    items: [
      { recipeId: 11, recipeName: "Chilli", portions: 2 },
      { recipeId: 10, recipeName: "Biryani", portions: 3 },
    ],
  },
];

describe("mergePortions", () => {
  it("totals each recipe across the orders, alphabetically", () => {
    expect(mergePortions(orders).recipes).toEqual([
      { recipeId: 10, name: "Biryani", portions: 8 },
      { recipeId: 11, name: "Chilli", portions: 2 },
    ]);
  });

  it("builds the allocation rows oldest first, with a portion count per recipe or nothing", () => {
    expect(mergePortions(orders).allocation).toEqual([
      { orderId: 1, date: sept3, portions: { 10: 3, 11: 2 } },
      { orderId: 2, date: sept7, portions: { 10: 5 } },
    ]);
  });

  it("is empty for no orders", () => {
    expect(mergePortions([])).toEqual({ recipes: [], allocation: [] });
  });
});

describe("scaleForPrep", () => {
  const oliveOil = { measureType: "weight" as const, gramsPerMl: 0.92, gramsEach: null, countUnit: null };
  const chicken = { measureType: "weight" as const, gramsPerMl: null, gramsEach: null, countUnit: null };
  const egg = { measureType: "count" as const, gramsPerMl: null, gramsEach: 58, countUnit: "egg" };
  const stock = { measureType: "volume" as const, gramsPerMl: null, gramsEach: null, countUnit: null };

  it("multiplies the per-portion amount and shows it in the ingredient's base unit", () => {
    expect(scaleForPrep(150, "g", 8, chicken)).toEqual({ value: 1200, unit: "g", display: "1.2 kg" });
    expect(scaleForPrep(1, "tbsp", 8, oliveOil)).toEqual({ value: 110.4, unit: "g", display: "110.4 g" });
    expect(scaleForPrep(200, "ml", 4, stock)).toEqual({ value: 800, unit: "ml", display: "800 ml" });
  });

  it("keeps exact counts rather than rounding up, because this is for cooking not buying", () => {
    expect(scaleForPrep(0.5, "egg", 3, egg)).toEqual({ value: 1.5, unit: "each", display: "1.5 eggs" });
    expect(scaleForPrep(0.5, "egg", 8, egg).display).toBe("4 eggs");
  });
});
