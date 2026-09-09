import { asc, eq, sql } from "drizzle-orm";
import type { Db, Queryable } from "./client";
import { cartItems, recipes } from "./schema";

export type CartLine = typeof cartItems.$inferSelect & {
  recipe: { id: number; name: string; photoUrl: string | null };
};

export class CartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartError";
  }
}

function assertWholePortions(portions: number, minimum: number) {
  if (!Number.isInteger(portions) || portions < minimum) {
    throw new CartError(`Portions must be a whole number of at least ${minimum}`);
  }
}

function assertRecipeExists(db: Db, recipeId: number) {
  if (!db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, recipeId)).get()) {
    throw new CartError("That recipe no longer exists");
  }
}

/** The single cart, one line per recipe, in recipe name order. */
export function getCart(db: Queryable): CartLine[] {
  return db
    .select({
      line: cartItems,
      recipe: { id: recipes.id, name: recipes.name, photoUrl: recipes.photoUrl },
    })
    .from(cartItems)
    .innerJoin(recipes, eq(cartItems.recipeId, recipes.id))
    .orderBy(asc(sql`lower(${recipes.name})`))
    .all()
    .map(({ line, recipe }) => ({ ...line, recipe }));
}

/** Adds portions to the recipe's line, creating it if needed. */
export function addToCart(db: Db, recipeId: number, portions: number): void {
  assertWholePortions(portions, 1);
  assertRecipeExists(db, recipeId);
  db.insert(cartItems)
    .values({ recipeId, portions })
    .onConflictDoUpdate({
      target: cartItems.recipeId,
      set: { portions: sql`${cartItems.portions} + ${portions}` },
    })
    .run();
}

/** Replaces the portions on a line. Zero removes it. */
export function setCartPortions(db: Db, recipeId: number, portions: number): void {
  assertWholePortions(portions, 0);
  if (portions === 0) {
    removeFromCart(db, recipeId);
    return;
  }
  db.update(cartItems).set({ portions }).where(eq(cartItems.recipeId, recipeId)).run();
}

export function removeFromCart(db: Db, recipeId: number): void {
  db.delete(cartItems).where(eq(cartItems.recipeId, recipeId)).run();
}

export function clearCart(db: Queryable): void {
  db.delete(cartItems).run();
}
