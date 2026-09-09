// @vitest-environment node
import { describe, it, expect } from "vitest";
import { aggregateShoppingList, shoppingListText, type ShoppingSource } from "./aggregate";

const oliveOil = {
  id: 1,
  name: "Olive oil",
  measureType: "weight" as const,
  gramsPerMl: 0.92,
  gramsEach: null,
  countUnit: null,
};
const chicken = {
  id: 2,
  name: "Chicken thigh",
  measureType: "weight" as const,
  gramsPerMl: null,
  gramsEach: null,
  countUnit: null,
};
const stock = {
  id: 3,
  name: "Chicken stock",
  measureType: "volume" as const,
  gramsPerMl: null,
  gramsEach: null,
  countUnit: null,
};
const egg = {
  id: 4,
  name: "Egg",
  measureType: "count" as const,
  gramsPerMl: null,
  gramsEach: 58,
  countUnit: "egg",
};

describe("aggregateShoppingList", () => {
  it("multiplies each line by its portions", () => {
    const list = aggregateShoppingList([
      { portions: 4, ingredient: chicken, amount: 150, unit: "g" },
    ]);
    expect(list).toEqual([
      expect.objectContaining({ ingredientId: 2, name: "Chicken thigh", value: 600, unit: "g" }),
    ]);
  });

  it("merges the same ingredient from different recipes into one line", () => {
    const list = aggregateShoppingList([
      { portions: 2, ingredient: chicken, amount: 150, unit: "g" },
      { portions: 3, ingredient: chicken, amount: 100, unit: "g" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].value).toBe(600);
  });

  it("merges tablespoons in one recipe with grams in another", () => {
    const list = aggregateShoppingList([
      { portions: 2, ingredient: oliveOil, amount: 1, unit: "tbsp" }, // 27.6 g
      { portions: 1, ingredient: oliveOil, amount: 20, unit: "g" },
    ]);
    // 47.6 g rounds to 50 g
    expect(list).toEqual([expect.objectContaining({ ingredientId: 1, value: 50, unit: "g" })]);
  });

  it("rounds once, after summing, not per line", () => {
    const list = aggregateShoppingList([
      { portions: 1, ingredient: chicken, amount: 2.5, unit: "g" },
      { portions: 1, ingredient: chicken, amount: 2.5, unit: "g" },
      { portions: 1, ingredient: chicken, amount: 2.5, unit: "g" },
    ]);
    // 7.5 g -> 10 g. Rounding per line (5 + 5 + 5) would give 15 g.
    expect(list[0].value).toBe(10);
  });

  it("keeps liquids in millilitres and counts whole", () => {
    const list = aggregateShoppingList([
      { portions: 3, ingredient: stock, amount: 2, unit: "tbsp" }, // 90 ml
      { portions: 3, ingredient: egg, amount: 0.5, unit: "each" }, // 1.5 -> 2
    ]);
    expect(list).toEqual([
      expect.objectContaining({ name: "Chicken stock", value: 90, unit: "ml" }),
      expect.objectContaining({ name: "Egg", value: 2, unit: "each", countUnit: "egg" }),
    ]);
  });

  it("includes a ready-to-print display string per line", () => {
    const list = aggregateShoppingList([
      { portions: 8, ingredient: chicken, amount: 150, unit: "g" },
      { portions: 1, ingredient: egg, amount: 3, unit: "each" },
    ]);
    expect(list.map((line) => line.display)).toEqual(["1.2 kg", "3 eggs"]);
  });

  it("sorts lines alphabetically by ingredient name", () => {
    const list = aggregateShoppingList([
      { portions: 1, ingredient: stock, amount: 100, unit: "ml" },
      { portions: 1, ingredient: egg, amount: 1, unit: "each" },
      { portions: 1, ingredient: chicken, amount: 100, unit: "g" },
    ]);
    expect(list.map((line) => line.name)).toEqual(["Chicken stock", "Chicken thigh", "Egg"]);
  });

  it("returns an empty list for no items", () => {
    expect(aggregateShoppingList([])).toEqual([]);
  });

  it("names the ingredient when a line cannot be converted", () => {
    const bad: ShoppingSource = { portions: 1, ingredient: chicken, amount: 1, unit: "tbsp" };
    expect(() => aggregateShoppingList([bad])).toThrow(/Chicken thigh/);
  });
});

describe("shoppingListText", () => {
  it("puts one ingredient per line, name then quantity, ready for Reminders", () => {
    const lines = aggregateShoppingList([
      { portions: 8, ingredient: chicken, amount: 150, unit: "g" },
      { portions: 1, ingredient: egg, amount: 3, unit: "each" },
      { portions: 2, ingredient: stock, amount: 250, unit: "ml" },
    ]);
    expect(shoppingListText(lines)).toBe("Chicken stock 500 ml\nChicken thigh 1.2 kg\nEgg 3 eggs");
  });

  it("is empty for no lines", () => {
    expect(shoppingListText([])).toBe("");
  });
});
