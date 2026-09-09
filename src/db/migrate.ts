import { databasePath, getDb } from "./index";

getDb();
console.log(`Database at ${databasePath} is up to date.`);
