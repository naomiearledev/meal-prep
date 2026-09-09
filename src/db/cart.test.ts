// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { createDb, type Db } from "./client";
import { recipes } from "./schema";
import { getCart, addToCart, setCartPortions, removeFromCart, clearCart, CartError } from "./cart";

let db: Db;
let biryani: number;
let chilli: number;

beforeEach(() => {
  db = createDb(":memory:");
  [chilli] = db.insert(recipes).values({ name: "Chilli" }).returning({ id: recipes.id }).all().map((r) => r.id);
  [biryani] = db.insert(recipes).values({ name: "Biryani", photoUrl: "/api/photos/b.jpg" }).returning({ id: recipes.id }).all().map((r) => r.id);
});

describe("addToCart / getCart", () => {
  it("adds a recipe with portions and lists lines by recipe name with its details", () => {
    addToCart(db, chilli, 2);
    addToCart(db, biryani, 4);
    expect(getCart(db)).toEqual([
      expect.objectContaining({ recipeId: biryani, portions: 4, recipe: expect.objectContaining({ name: "Biryani", photoUrl: "/api/photos/b.jpg" }) }),
      expect.objectContaining({ recipeId: chilli, portions: 2, recipe: expect.objectContaining({ name: "Chilli" }) }),
    ]);
  });

  it("adds to the existing portions when the recipe is already in the cart", () => {
    addToCart(db, chilli, 2);
    addToCart(db, chilli, 3);
    expect(getCart(db)).toEqual([expect.objectContaining({ recipeId: chilli, portions: 5 })]);
  });

  it("refuses portions that are not a whole number of at least 1", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => addToCart(db, chilli, bad)).toThrow(CartError);
    }
    expect(getCart(db)).toEqual([]);
  });

  it("refuses an unknown recipe", () => {
    expect(() => addToCart(db, 999, 1)).toThrow(CartError);
  });
});

describe("setCartPortions / removeFromCart / clearCart", () => {
  it("replaces the portions", () => {
    addToCart(db, chilli, 2);
    setCartPortions(db, chilli, 6);
    expect(getCart(db)[0].portions).toBe(6);
  });

  it("removes the line when portions are set to 0", () => {
    addToCart(db, chilli, 2);
    setCartPortions(db, chilli, 0);
    expect(getCart(db)).toEqual([]);
  });

  it("refuses fractional or negative portions", () => {
    addToCart(db, chilli, 2);
    expect(() => setCartPortions(db, chilli, 1.5)).toThrow(CartError);
    expect(() => setCartPortions(db, chilli, -2)).toThrow(CartError);
  });

  it("removes a line and clears everything", () => {
    addToCart(db, chilli, 2);
    addToCart(db, biryani, 1);
    removeFromCart(db, chilli);
    expect(getCart(db).map((line) => line.recipeId)).toEqual([biryani]);
    clearCart(db);
    expect(getCart(db)).toEqual([]);
  });
});
