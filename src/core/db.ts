import { Pool } from "pg";
import { config } from "./config.js";

export const db = new Pool({
  host: config.PGHOST,
  port: config.PGPORT,
  database: config.PGDATABASE,
  user: config.PGUSER,
  password: config.PGPASSWORD
});
