// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createDb } from "./client";
import { seedIngredients } from "./seed-data";
import { seed } from "./seed";
import { validateIngredientInput, listIngredients, updateIngredient } from "./ingredients";

describe("seed data", () => {
  it("has at least 120 ingredients", () => {
    expect(seedIngredients.length).toBeGreaterThanOrEqual(120);
  });

  it("has no duplicate names, ignoring case", () => {
    const names = seedIngredients.map((i) => i.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("is valid ingredient input throughout", () => {
    for (const ingredient of seedIngredients) {
      const result = validateIngredientInput({
        ...ingredient,
        gramsPerMl: ingredient.gramsPerMl?.toString() ?? "",
        gramsEach: ingredient.gramsEach?.toString() ?? "",
        countUnit: ingredient.countUnit ?? "",
      });
      expect(result, `${ingredient.name}: ${JSON.stringify(result)}`).toMatchObject({ ok: true });
    }
  });

  it("gives every weight and volume ingredient a density so spoons and cups convert", () => {
    const missing = seedIngredients
      .filter((i) => i.measureType !== "count" && !i.gramsPerMl)
      .map((i) => i.name);
    expect(missing).toEqual([]);
  });

  it("classes olive oil as weight at 0.92 g/ml, so a tbsp is 13.8 g", () => {
    const oliveOil = seedIngredients.find((i) => i.name === "Olive oil");
    expect(oliveOil).toMatchObject({ measureType: "weight", gramsPerMl: 0.92 });
  });
});

describe("seed", () => {
  it("inserts every seed ingredient", () => {
    const db = createDb(":memory:");
    const inserted = seed(db);
    expect(inserted).toBe(seedIngredients.length);
    expect(listIngredients(db)).toHaveLength(seedIngredients.length);
  });

  it("is safe to run twice and keeps edits made since", () => {
    const db = createDb(":memory:");
    seed(db);
    const salt = listIngredients(db, "Table salt").find((i) => i.name === "Table salt")!;
    updateIngredient(db, salt.id, { ...salt, gramsPerMl: 1.5 });

    const insertedAgain = seed(db);
    expect(insertedAgain).toBe(0);
    expect(listIngredients(db)).toHaveLength(seedIngredients.length);
    expect(listIngredients(db, "Table salt").find((i) => i.name === "Table salt")?.gramsPerMl).toBe(1.5);
  });
});
