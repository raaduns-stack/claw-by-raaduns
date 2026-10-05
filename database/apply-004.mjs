import { readFile } from "node:fs/promises";
import { db } from "../dist/core/db.js";
const sql = await readFile(new URL("./004_opportunity_change_tracking.sql", import.meta.url), "utf8");
await db.query(sql);
await db.end();
console.log("004 applied");
