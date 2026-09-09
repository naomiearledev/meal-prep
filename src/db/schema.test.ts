// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "./client";
import {
  ingredients,
  recipes,
  recipeIngredients,
  recipeSteps,
  cartItems,
  orders,
  orderItems,
} from "./schema";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("ingredients", () => {
  it("stores a weight ingredient with its density", () => {
    db.insert(ingredients)
      .values({ name: "Olive oil", measureType: "volume", gramsPerMl: 0.92 })
      .run();
    const [row] = db.select().from(ingredients).all();
    expect(row).toMatchObject({
      name: "Olive oil",
      measureType: "volume",
      gramsPerMl: 0.92,
      countUnit: null,
      gramsEach: null,
    });
    expect(row.id).toBeTypeOf("number");
  });

  it("rejects two ingredients with the same name", () => {
    db.insert(ingredients).values({ name: "Salt", measureType: "weight" }).run();
    expect(() =>
      db.insert(ingredients).values({ name: "Salt", measureType: "weight" }).run(),
    ).toThrow(/UNIQUE/);
  });

  it("rejects an unknown measure type", () => {
    expect(() =>
      db
        .insert(ingredients)
        // @ts-expect-error deliberately invalid
        .values({ name: "Mystery", measureType: "handful" })
        .run(),
    ).toThrow(/CHECK/);
  });

  it("stores a count ingredient with its unit and optional weight each", () => {
    db.insert(ingredients)
      .values({ name: "Egg", measureType: "count", countUnit: "egg", gramsEach: 58 })
      .run();
    const [row] = db.select().from(ingredients).all();
    expect(row).toMatchObject({ countUnit: "egg", gramsEach: 58 });
  });
});

describe("recipes", () => {
  it("stores ingredient rows and steps in position order", () => {
    const [recipe] = db
      .insert(recipes)
      .values({ name: "Biryani", notes: null, photoUrl: null })
      .returning()
      .all();
    const [rice] = db
      .insert(ingredients)
      .values({ name: "Basmati rice", measureType: "weight" })
      .returning()
      .all();

    db.insert(recipeIngredients)
      .values({ recipeId: recipe.id, ingredientId: rice.id, amount: 75, unit: "g", position: 0 })
      .run();
    db.insert(recipeSteps)
      .values([
        { recipeId: recipe.id, position: 1, text: "Serve." },
        { recipeId: recipe.id, position: 0, text: "Rinse the rice." },
      ])
      .run();

    const rows = db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipe.id))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 75, unit: "g", position: 0 });

    const steps = db
      .select()
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, recipe.id))
      .orderBy(recipeSteps.position)
      .all();
    expect(steps.map((s) => s.text)).toEqual(["Rinse the rice.", "Serve."]);
    expect(recipe.createdAt).toBeInstanceOf(Date);
  });

  it("deletes ingredient rows and steps when the recipe is deleted", () => {
    const [recipe] = db.insert(recipes).values({ name: "Chilli" }).returning().all();
    const [beans] = db
      .insert(ingredients)
      .values({ name: "Kidney beans", measureType: "count", countUnit: "tin" })
      .returning()
      .all();
    db.insert(recipeIngredients)
      .values({ recipeId: recipe.id, ingredientId: beans.id, amount: 0.5, unit: "tin", position: 0 })
      .run();
    db.insert(recipeSteps).values({ recipeId: recipe.id, position: 0, text: "Cook." }).run();

    db.delete(recipes).where(eq(recipes.id, recipe.id)).run();

    expect(db.select().from(recipeIngredients).all()).toHaveLength(0);
    expect(db.select().from(recipeSteps).all()).toHaveLength(0);
  });

  it("refuses to delete an ingredient a recipe still uses", () => {
    const [recipe] = db.insert(recipes).values({ name: "Chilli" }).returning().all();
    const [cumin] = db
      .insert(ingredients)
      .values({ name: "Cumin", measureType: "weight" })
      .returning()
      .all();
    db.insert(recipeIngredients)
      .values({ recipeId: recipe.id, ingredientId: cumin.id, amount: 2, unit: "g", position: 0 })
      .run();

    expect(() => db.delete(ingredients).where(eq(ingredients.id, cumin.id)).run()).toThrow(
      /FOREIGN KEY/,
    );
  });
});

describe("cart and orders", () => {
  it("holds one cart row per recipe", () => {
    const [recipe] = db.insert(recipes).values({ name: "Chilli" }).returning().all();
    db.insert(cartItems).values({ recipeId: recipe.id, portions: 4 }).run();
    expect(() =>
      db.insert(cartItems).values({ recipeId: recipe.id, portions: 2 }).run(),
    ).toThrow(/UNIQUE/);
  });

  it("creates an order that is outstanding until fulfilled", () => {
    const [recipe] = db.insert(recipes).values({ name: "Chilli" }).returning().all();
    const [order] = db.insert(orders).values({}).returning().all();
    db.insert(orderItems).values({ orderId: order.id, recipeId: recipe.id, portions: 6 }).run();

    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.fulfilledAt).toBeNull();

    const fulfilledAt = new Date("2026-09-10T10:00:00Z");
    db.update(orders).set({ fulfilledAt }).where(eq(orders.id, order.id)).run();
    const [updated] = db.select().from(orders).all();
    expect(updated.fulfilledAt).toEqual(fulfilledAt);

    const items = db.select().from(orderItems).all();
    expect(items[0]).toMatchObject({ orderId: order.id, recipeId: recipe.id, portions: 6 });
  });
});
