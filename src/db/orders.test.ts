// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "./client";
import { orders, recipes, recipeIngredients } from "./schema";
import { addToCart, getCart } from "./cart";
import { createIngredient } from "./ingredients";
import {
  createOrderFromCart,
  listOrders,
  setOrderFulfilled,
  getOrdersByIds,
  shoppingSourcesForOrders,
  OrderError,
} from "./orders";

let db: Db;
let biryani: number;
let chilli: number;

beforeEach(() => {
  db = createDb(":memory:");
  [biryani] = db.insert(recipes).values({ name: "Biryani" }).returning({ id: recipes.id }).all().map((r) => r.id);
  [chilli] = db.insert(recipes).values({ name: "Chilli" }).returning({ id: recipes.id }).all().map((r) => r.id);
});

describe("createOrderFromCart", () => {
  it("turns the cart into an outstanding order and empties the cart", () => {
    addToCart(db, biryani, 3);
    addToCart(db, chilli, 2);
    const order = createOrderFromCart(db);
    expect(order.fulfilledAt).toBeNull();
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.items).toEqual([
      expect.objectContaining({ recipeId: biryani, recipeName: "Biryani", portions: 3 }),
      expect.objectContaining({ recipeId: chilli, recipeName: "Chilli", portions: 2 }),
    ]);
    expect(order.totalPortions).toBe(5);
    expect(getCart(db)).toEqual([]);
  });

  it("refuses an empty cart", () => {
    expect(() => createOrderFromCart(db)).toThrow(OrderError);
    expect(listOrders(db)).toEqual([]);
  });
});

describe("listOrders", () => {
  it("lists newest first, with items", () => {
    addToCart(db, biryani, 1);
    const first = createOrderFromCart(db);
    db.update(orders).set({ createdAt: new Date("2026-09-03T09:00:00Z") }).where(eq(orders.id, first.id)).run();
    addToCart(db, chilli, 2);
    const second = createOrderFromCart(db);
    db.update(orders).set({ createdAt: new Date("2026-09-07T09:00:00Z") }).where(eq(orders.id, second.id)).run();

    const listed = listOrders(db);
    expect(listed.map((o) => o.id)).toEqual([second.id, first.id]);
    expect(listed[0].items[0]).toMatchObject({ recipeName: "Chilli", portions: 2 });
  });

  it("hides fulfilled orders unless asked for everything", () => {
    addToCart(db, biryani, 1);
    const done = createOrderFromCart(db);
    addToCart(db, chilli, 1);
    const open = createOrderFromCart(db);
    setOrderFulfilled(db, done.id, true);

    expect(listOrders(db).map((o) => o.id)).toEqual([open.id]);
    expect(listOrders(db, { includeFulfilled: true }).map((o) => o.id).sort()).toEqual([done.id, open.id].sort());
  });
});

describe("setOrderFulfilled", () => {
  it("stamps the time when fulfilled and clears it when reopened", () => {
    addToCart(db, biryani, 1);
    const order = createOrderFromCart(db);

    const fulfilled = setOrderFulfilled(db, order.id, true);
    expect(fulfilled.fulfilledAt).toBeInstanceOf(Date);

    const reopened = setOrderFulfilled(db, order.id, false);
    expect(reopened.fulfilledAt).toBeNull();
  });

  it("refuses an unknown order", () => {
    expect(() => setOrderFulfilled(db, 42, true)).toThrow(OrderError);
  });
});

describe("getOrdersByIds / shoppingSourcesForOrders", () => {
  it("returns just the asked-for orders, oldest first, ignoring unknown ids", () => {
    addToCart(db, biryani, 1);
    const first = createOrderFromCart(db);
    db.update(orders).set({ createdAt: new Date("2026-09-03T09:00:00Z") }).where(eq(orders.id, first.id)).run();
    addToCart(db, chilli, 1);
    const second = createOrderFromCart(db);
    db.update(orders).set({ createdAt: new Date("2026-09-07T09:00:00Z") }).where(eq(orders.id, second.id)).run();
    addToCart(db, chilli, 1);
    createOrderFromCart(db);

    const picked = getOrdersByIds(db, [second.id, first.id, 999]);
    expect(picked.map((o) => o.id)).toEqual([first.id, second.id]);
    expect(getOrdersByIds(db, [])).toEqual([]);
  });

  it("produces one source per recipe line per order, carrying that order's portions", () => {
    const oil = createIngredient(db, { name: "Olive oil", measureType: "weight", gramsPerMl: 0.92, countUnit: null, gramsEach: null });
    const beef = createIngredient(db, { name: "Minced beef", measureType: "weight", gramsPerMl: null, countUnit: null, gramsEach: null });
    db.insert(recipeIngredients)
      .values([
        { recipeId: biryani, ingredientId: oil.id, amount: 1, unit: "tbsp", position: 0 },
        { recipeId: chilli, ingredientId: beef.id, amount: 125, unit: "g", position: 0 },
        { recipeId: chilli, ingredientId: oil.id, amount: 5, unit: "g", position: 1 },
      ])
      .run();

    addToCart(db, biryani, 3);
    addToCart(db, chilli, 2);
    const first = createOrderFromCart(db);
    addToCart(db, chilli, 4);
    const second = createOrderFromCart(db);

    const sources = shoppingSourcesForOrders(db, [first.id, second.id]);
    const summary = sources
      .map((s) => `${s.ingredient.name}:${s.amount}${s.unit}x${s.portions}`)
      .sort();
    expect(summary).toEqual([
      "Minced beef:125gx2",
      "Minced beef:125gx4",
      "Olive oil:1tbspx3",
      "Olive oil:5gx2",
      "Olive oil:5gx4",
    ]);
    expect(sources[0].ingredient).toMatchObject({ measureType: "weight" });
  });
});
