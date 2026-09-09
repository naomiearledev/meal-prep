// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createDb, type Db } from "./client";
import { recipes, recipeIngredients } from "./schema";
import {
  validateIngredientInput,
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  IngredientError,
} from "./ingredients";

let db: Db;
beforeEach(() => {
  db = createDb(":memory:");
});

describe("validateIngredientInput", () => {
  it("accepts a weight ingredient with a density", () => {
    const result = validateIngredientInput({
      name: "  Olive oil ",
      measureType: "weight",
      gramsPerMl: "0.92",
      countUnit: "",
      gramsEach: "",
    });
    expect(result).toEqual({
      ok: true,
      value: { name: "Olive oil", measureType: "weight", gramsPerMl: 0.92, countUnit: null, gramsEach: null },
    });
  });

  it("requires a name", () => {
    const result = validateIngredientInput({ name: "   ", measureType: "weight" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toMatch(/name/i);
  });

  it("requires a known measure type", () => {
    const result = validateIngredientInput({ name: "Thing", measureType: "handful" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.measureType).toBeDefined();
  });

  it("requires a positive number for density when given", () => {
    for (const bad of ["0", "-1", "abc"]) {
      const result = validateIngredientInput({ name: "Thing", measureType: "weight", gramsPerMl: bad });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.gramsPerMl).toBeDefined();
    }
  });

  it("requires a count unit for count ingredients and accepts grams each", () => {
    const missing = validateIngredientInput({ name: "Egg", measureType: "count", countUnit: "" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.countUnit).toBeDefined();

    const good = validateIngredientInput({
      name: "Egg",
      measureType: "count",
      countUnit: " egg ",
      gramsEach: "58",
    });
    expect(good).toEqual({
      ok: true,
      value: { name: "Egg", measureType: "count", gramsPerMl: null, countUnit: "egg", gramsEach: 58 },
    });
  });

  it("drops count fields for non-count ingredients", () => {
    const result = validateIngredientInput({
      name: "Flour",
      measureType: "weight",
      gramsPerMl: "0.53",
      countUnit: "bag",
      gramsEach: "1000",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ countUnit: null, gramsEach: null });
  });

  it("reads a FormData too", () => {
    const form = new FormData();
    form.set("name", "Salt");
    form.set("measureType", "weight");
    form.set("gramsPerMl", "1.2");
    expect(validateIngredientInput(form)).toMatchObject({ ok: true, value: { name: "Salt", gramsPerMl: 1.2 } });
  });
});

describe("createIngredient / listIngredients / getIngredient", () => {
  it("creates and lists alphabetically regardless of case", () => {
    createIngredient(db, { name: "salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    createIngredient(db, { name: "Egg", measureType: "count", gramsPerMl: null, countUnit: "egg", gramsEach: 58 });
    createIngredient(db, { name: "Olive oil", measureType: "weight", gramsPerMl: 0.92, countUnit: null, gramsEach: null });
    expect(listIngredients(db).map((i) => i.name)).toEqual(["Egg", "Olive oil", "salt"]);
  });

  it("filters by a case-insensitive search", () => {
    createIngredient(db, { name: "Olive oil", measureType: "weight", gramsPerMl: 0.92, countUnit: null, gramsEach: null });
    createIngredient(db, { name: "Sunflower oil", measureType: "weight", gramsPerMl: 0.92, countUnit: null, gramsEach: null });
    createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    expect(listIngredients(db, "OIL").map((i) => i.name)).toEqual(["Olive oil", "Sunflower oil"]);
    expect(listIngredients(db, "  ")).toHaveLength(3);
  });

  it("refuses a duplicate name with a friendly error", () => {
    createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    expect(() =>
      createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: null, countUnit: null, gramsEach: null }),
    ).toThrow(IngredientError);
    expect(() =>
      createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: null, countUnit: null, gramsEach: null }),
    ).toThrow(/already/);
  });

  it("gets one by id, or undefined", () => {
    const created = createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    expect(getIngredient(db, created.id)).toEqual(created);
    expect(getIngredient(db, 999)).toBeUndefined();
  });
});

describe("updateIngredient", () => {
  it("changes the density and returns the updated row", () => {
    const salt = createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    const updated = updateIngredient(db, salt.id, { ...salt, gramsPerMl: 1.25 });
    expect(updated.gramsPerMl).toBe(1.25);
    expect(getIngredient(db, salt.id)?.gramsPerMl).toBe(1.25);
  });

  it("refuses to rename onto an existing name", () => {
    createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    const sugar = createIngredient(db, { name: "Sugar", measureType: "weight", gramsPerMl: 0.85, countUnit: null, gramsEach: null });
    expect(() => updateIngredient(db, sugar.id, { ...sugar, name: "Salt" })).toThrow(/already/);
  });

  it("refuses an unknown id", () => {
    expect(() =>
      updateIngredient(db, 42, { name: "X", measureType: "weight", gramsPerMl: null, countUnit: null, gramsEach: null }),
    ).toThrow(IngredientError);
  });
});

describe("deleteIngredient", () => {
  it("deletes an unused ingredient", () => {
    const salt = createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    deleteIngredient(db, salt.id);
    expect(listIngredients(db)).toHaveLength(0);
  });

  it("refuses to delete one a recipe uses, saying so", () => {
    const salt = createIngredient(db, { name: "Salt", measureType: "weight", gramsPerMl: 1.2, countUnit: null, gramsEach: null });
    const [recipe] = db.insert(recipes).values({ name: "Chilli" }).returning().all();
    db.insert(recipeIngredients)
      .values({ recipeId: recipe.id, ingredientId: salt.id, amount: 1, unit: "tsp", position: 0 })
      .run();
    expect(() => deleteIngredient(db, salt.id)).toThrow(/used by a recipe/i);
    expect(listIngredients(db)).toHaveLength(1);
  });
});
