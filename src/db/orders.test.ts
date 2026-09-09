// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "./client";
import { orders, recipes } from "./schema";
import { addToCart, getCart } from "./cart";
import { createOrderFromCart, listOrders, setOrderFulfilled, OrderError } from "./orders";

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
