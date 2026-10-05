import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";
const pool = new pg.Pool({host:process.env.PGHOST,port:Number(process.env.PGPORT),database:process.env.PGDATABASE,user:process.env.PGUSER,password:process.env.PGPASSWORD});
await pool.query(await readFile(new URL("./003_seed_naijabusiness.sql", import.meta.url), "utf8"));
await pool.end();
console.log("migration 003 applied");
