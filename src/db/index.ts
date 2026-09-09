import { createDb, type Db } from "./client";

export const databasePath = process.env.DATABASE_PATH ?? "data/app.db";

// Cached on globalThis so Next's dev-mode module reloads don't open a new connection each time.
const globalForDb = globalThis as unknown as { __mealPrepDb?: Db };

export function getDb(): Db {
  globalForDb.__mealPrepDb ??= createDb(databasePath);
  return globalForDb.__mealPrepDb;
}
