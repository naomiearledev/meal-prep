// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createDb, type Db } from "./client";
import { orders, orderItems, cartItems } from "./schema";
import { createIngredient, type Ingredient } from "./ingredients";
import {
  validateRecipeInput,
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  RecipeError,
} from "./recipes";

let db: Db;
let oliveOil: Ingredient;
let chicken: Ingredient;
let egg: Ingredient;
let byId: Map<number, Ingredient>;

beforeEach(() => {
  db = createDb(":memory:");
  oliveOil = createIngredient(db, { name: "Olive oil", measureType: "weight", gramsPerMl: 0.92, countUnit: null, gramsEach: null });
  chicken = createIngredient(db, { name: "Chicken thigh", measureType: "weight", gramsPerMl: null, countUnit: null, gramsEach: null });
  egg = createIngredient(db, { name: "Egg", measureType: "count", gramsPerMl: null, countUnit: "egg", gramsEach: 58 });
  byId = new Map([oliveOil, chicken, egg].map((i) => [i.id, i]));
});

const biryaniInput = () => ({
  name: "Biryani",
  notes: "Serve with raita",
  photoUrl: null,
  ingredients: [
    { ingredientId: 0, amount: 150, unit: "g" },
    { ingredientId: 0, amount: 1, unit: "tbsp" },
  ],
  steps: ["Brown the chicken.", "Layer with rice and bake."],
});

function biryani() {
  const input = biryaniInput();
  input.ingredients[0].ingredientId = chicken.id;
  input.ingredients[1].ingredientId = oliveOil.id;
  return input;
}

describe("validateRecipeInput", () => {
  it("accepts a recipe with rows and steps, trimming text and dropping blank rows and steps", () => {
    const result = validateRecipeInput(
      {
        name: "  Biryani ",
        notes: " Serve with raita ",
        photoUrl: "",
        ingredientId: [String(chicken.id), "", String(oliveOil.id)],
        amount: ["150", "", "1"],
        unit: ["g", "", "tbsp"],
        step: [" Brown the chicken. ", "", "Bake."],
      },
      byId,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Biryani",
        notes: "Serve with raita",
        photoUrl: null,
        ingredients: [
          { ingredientId: chicken.id, amount: 150, unit: "g" },
          { ingredientId: oliveOil.id, amount: 1, unit: "tbsp" },
        ],
        steps: ["Brown the chicken.", "Bake."],
      },
    });
  });

  it("requires a name and at least one ingredient", () => {
    const result = validateRecipeInput({ name: "", ingredientId: [], amount: [], unit: [], step: [] }, byId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.ingredients).toBeDefined();
    }
  });

  it("flags a row with an unknown ingredient, a bad amount, or a unit that can't convert", () => {
    const result = validateRecipeInput(
      {
        name: "X",
        ingredientId: ["999", String(chicken.id), String(chicken.id), String(egg.id)],
        amount: ["1", "0", "abc", "2"],
        unit: ["g", "g", "g", "tbsp"],
        step: [],
      },
      byId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors["ingredient.0"]).toMatch(/choose an ingredient/i);
      expect(result.errors["ingredient.1"]).toMatch(/amount/i);
      expect(result.errors["ingredient.2"]).toMatch(/amount/i);
      expect(result.errors["ingredient.3"]).toMatch(/tbsp/);
    }
  });

  it("flags a row with an amount but no ingredient chosen", () => {
    const result = validateRecipeInput(
      { name: "X", ingredientId: [""], amount: ["100"], unit: ["g"], step: [] },
      byId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["ingredient.0"]).toMatch(/choose an ingredient/i);
  });

  it("reads a FormData with repeated fields", () => {
    const form = new FormData();
    form.set("name", "Eggs");
    form.append("ingredientId", String(egg.id));
    form.append("amount", "2");
    form.append("unit", "egg");
    form.append("step", "Boil.");
    expect(validateRecipeInput(form, byId)).toMatchObject({
      ok: true,
      value: { name: "Eggs", ingredients: [{ ingredientId: egg.id, amount: 2, unit: "egg" }], steps: ["Boil."] },
    });
  });
});

describe("createRecipe / getRecipe / listRecipes", () => {
  it("creates a recipe with ordered ingredient rows and steps", () => {
    const created = createRecipe(db, biryani());
    const fetched = getRecipe(db, created.id);
    expect(fetched).toBeDefined();
    expect(fetched).toMatchObject({ name: "Biryani", notes: "Serve with raita", photoUrl: null });
    expect(fetched!.ingredients.map((row) => [row.ingredient.name, row.amount, row.unit, row.position])).toEqual([
      ["Chicken thigh", 150, "g", 0],
      ["Olive oil", 1, "tbsp", 1],
    ]);
    expect(fetched!.steps.map((s) => s.text)).toEqual(["Brown the chicken.", "Layer with rice and bake."]);
    expect(fetched!.createdAt).toBeInstanceOf(Date);
  });

  it("lists alphabetically and filters by name", () => {
    createRecipe(db, { ...biryani(), name: "chilli" });
    createRecipe(db, biryani());
    createRecipe(db, { ...biryani(), name: "Aubergine curry" });
    expect(listRecipes(db).map((r) => r.name)).toEqual(["Aubergine curry", "Biryani", "chilli"]);
    expect(listRecipes(db, "CURRY").map((r) => r.name)).toEqual(["Aubergine curry"]);
  });

  it("returns undefined for an unknown recipe", () => {
    expect(getRecipe(db, 42)).toBeUndefined();
  });
});

describe("updateRecipe", () => {
  it("replaces the rows and steps and keeps the id", () => {
    const created = createRecipe(db, biryani());
    const updated = updateRecipe(db, created.id, {
      name: "Chicken biryani",
      notes: null,
      photoUrl: "/api/photos/x.jpg",
      ingredients: [{ ingredientId: egg.id, amount: 1, unit: "egg" }],
      steps: ["Boil an egg."],
    });
    expect(updated.id).toBe(created.id);
    const fetched = getRecipe(db, created.id)!;
    expect(fetched.name).toBe("Chicken biryani");
    expect(fetched.photoUrl).toBe("/api/photos/x.jpg");
    expect(fetched.ingredients.map((row) => row.ingredient.name)).toEqual(["Egg"]);
    expect(fetched.steps.map((s) => s.text)).toEqual(["Boil an egg."]);
  });

  it("refuses an unknown recipe", () => {
    expect(() => updateRecipe(db, 42, biryani())).toThrow(RecipeError);
  });
});

describe("deleteRecipe", () => {
  it("deletes a recipe and its rows, and drops it from the cart", () => {
    const created = createRecipe(db, biryani());
    db.insert(cartItems).values({ recipeId: created.id, portions: 2 }).run();
    deleteRecipe(db, created.id);
    expect(getRecipe(db, created.id)).toBeUndefined();
    expect(db.select().from(cartItems).all()).toHaveLength(0);
  });

  it("refuses to delete a recipe that is in an order, saying so", () => {
    const created = createRecipe(db, biryani());
    const [order] = db.insert(orders).values({}).returning().all();
    db.insert(orderItems).values({ orderId: order.id, recipeId: created.id, portions: 3 }).run();
    expect(() => deleteRecipe(db, created.id)).toThrow(/in an order/i);
    expect(getRecipe(db, created.id)).toBeDefined();
  });
});
