import { sql } from "drizzle-orm";
import { check, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const measureTypes = ["weight", "volume", "count"] as const;
export type MeasureType = (typeof measureTypes)[number];

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

/**
 * The ingredient library. Every conversion between volume, weight and count for an
 * ingredient comes from the densities stored here, never from the recipe.
 */
export const ingredients = sqliteTable(
  "ingredients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    measureType: text("measure_type", { enum: measureTypes }).notNull(),
    /** Density: grams per millilitre, e.g. olive oil 0.92, salt 1.2, plain flour 0.53. */
    gramsPerMl: real("grams_per_ml"),
    /** Count ingredients only: egg, clove, tin. */
    countUnit: text("count_unit"),
    /** Optional weight of one item, so a count ingredient can still be weighed. */
    gramsEach: real("grams_each"),
  },
  (table) => [
    uniqueIndex("ingredients_name_unique").on(table.name),
    check(
      "ingredients_measure_type_check",
      sql`${table.measureType} in ('weight', 'volume', 'count')`,
    ),
  ],
);

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: createdAt(),
});

/** Amounts are per portion. */
export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  amount: real("amount").notNull(),
  unit: text("unit").notNull(),
  position: integer("position").notNull(),
});

export const recipeSteps = sqliteTable("recipe_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  text: text("text").notNull(),
});

/** Single cart, one user: at most one row per recipe. */
export const cartItems = sqliteTable("cart_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .unique()
    .references(() => recipes.id, { onDelete: "cascade" }),
  portions: integer("portions").notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: createdAt(),
  /** Null means outstanding. */
  fulfilledAt: integer("fulfilled_at", { mode: "timestamp_ms" }),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "restrict" }),
  portions: integer("portions").notNull(),
});
