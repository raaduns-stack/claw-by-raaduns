import { readFile } from "node:fs/promises";
import { Client } from "pg";
import "dotenv/config";
const sql=await readFile(new URL("./007_business_knowledge_base.sql",import.meta.url),"utf8");
const client=new Client({host:process.env.PGHOST,port:Number(process.env.PGPORT),database:process.env.PGDATABASE,user:process.env.PGUSER,password:process.env.PGPASSWORD});
await client.connect();await client.query(sql);await client.end();console.log("007 applied");