import { asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db, Queryable } from "./client";
import { ingredients, orderItems, orders, recipeIngredients, recipes } from "./schema";
import { clearCart, getCart } from "./cart";
import type { ShoppingSource } from "@/lib/aggregate";

export type Order = typeof orders.$inferSelect;

export type OrderItemSummary = { recipeId: number; recipeName: string; portions: number };

export type OrderSummary = Order & { items: OrderItemSummary[]; totalPortions: number };

export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}

function summarise(db: Queryable, rows: Order[]): OrderSummary[] {
  if (rows.length === 0) return [];
  const items = db
    .select({
      orderId: orderItems.orderId,
      recipeId: orderItems.recipeId,
      recipeName: recipes.name,
      portions: orderItems.portions,
    })
    .from(orderItems)
    .innerJoin(recipes, eq(orderItems.recipeId, recipes.id))
    .where(inArray(orderItems.orderId, rows.map((row) => row.id)))
    .orderBy(asc(sql`lower(${recipes.name})`))
    .all();

  return rows.map((order) => {
    const own = items
      .filter((item) => item.orderId === order.id)
      .map(({ recipeId, recipeName, portions }) => ({ recipeId, recipeName, portions }));
    return { ...order, items: own, totalPortions: own.reduce((sum, item) => sum + item.portions, 0) };
  });
}

/** Turns the cart into a new outstanding order and empties the cart. */
export function createOrderFromCart(db: Db): OrderSummary {
  return db.transaction((tx) => {
    const lines = getCart(tx);
    if (lines.length === 0) throw new OrderError("The cart is empty");

    const order = tx.insert(orders).values({}).returning().get();
    tx.insert(orderItems)
      .values(lines.map((line) => ({ orderId: order.id, recipeId: line.recipeId, portions: line.portions })))
      .run();
    clearCart(tx);
    return summarise(tx, [order])[0];
  });
}

/** Newest first. Outstanding only unless `includeFulfilled` is set. */
export function listOrders(db: Db, options: { includeFulfilled?: boolean } = {}): OrderSummary[] {
  const base = db.select().from(orders);
  const filtered = options.includeFulfilled ? base : base.where(isNull(orders.fulfilledAt));
  const rows = filtered.orderBy(desc(orders.createdAt), desc(orders.id)).all();
  return summarise(db, rows);
}

export function setOrderFulfilled(db: Db, id: number, fulfilled: boolean): Order {
  const updated = db
    .update(orders)
    .set({ fulfilledAt: fulfilled ? new Date() : null })
    .where(eq(orders.id, id))
    .returning()
    .get();
  if (!updated) throw new OrderError("That order no longer exists");
  return updated;
}

/** The given orders, oldest first. Unknown ids are ignored. */
export function getOrdersByIds(db: Db, ids: number[]): OrderSummary[] {
  if (ids.length === 0) return [];
  const rows = db
    .select()
    .from(orders)
    .where(inArray(orders.id, ids))
    .orderBy(asc(orders.createdAt), asc(orders.id))
    .all();
  return summarise(db, rows);
}

/**
 * Every recipe line across the given orders, each paired with the portions that order
 * asked for. Feed straight into `aggregateShoppingList`.
 */
export function shoppingSourcesForOrders(db: Db, ids: number[]): ShoppingSource[] {
  if (ids.length === 0) return [];
  return db
    .select({
      portions: orderItems.portions,
      amount: recipeIngredients.amount,
      unit: recipeIngredients.unit,
      ingredient: ingredients,
    })
    .from(orderItems)
    .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, orderItems.recipeId))
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(inArray(orderItems.orderId, ids))
    .all();
}
