import "dotenv/config";
import pg from "pg";
import { createCipheriv, randomBytes } from "node:crypto";
import readline from "node:readline/promises";

const key = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY ?? "", "hex");
if (key.length !== 32) throw new Error("Invalid credential encryption key.");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const sourceId = await rl.question("Source ID: ");
const username = await rl.question("Username/email: ");
const password = await new Promise(resolve => {
  process.stdout.write("Password: ");
  process.stdin.setRawMode?.(true);
  let value = "";
  const onData = chunk => {
    const text = chunk.toString();
    if (text === "\u0003") process.exit(130);
    if (text === "\r" || text === "\n") {
      process.stdin.setRawMode?.(false);
      process.stdin.off("data", onData);
      process.stdout.write("\n");
      resolve(value);
      return;
    }
    if (text === "\u007f") value = value.slice(0, -1);
    else value += text;
  };
  process.stdin.on("data", onData);
});
rl.close();

const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ username, password }), "utf8"), cipher.final()]);

const pool = new pg.Pool({host:process.env.PGHOST,port:Number(process.env.PGPORT),database:process.env.PGDATABASE,user:process.env.PGUSER,password:process.env.PGPASSWORD});
await pool.query(
  `UPDATE source_platforms
   SET credentials_ciphertext=$2, credentials_iv=$3, credentials_auth_tag=$4,
       auth_state='NOT_AUTHENTICATED', last_error=NULL, updated_at=NOW()
   WHERE source_id=$1`,
  [sourceId, ciphertext.toString("base64"), iv.toString("base64"), cipher.getAuthTag().toString("base64")]
);
await pool.end();
console.log("Credentials stored encrypted.");
