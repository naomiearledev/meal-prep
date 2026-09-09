import { databasePath, getDb } from "./index";
import { seed } from "./seed";

const inserted = seed(getDb());
console.log(`Seeded ${inserted} ingredient${inserted === 1 ? "" : "s"} into ${databasePath}.`);
