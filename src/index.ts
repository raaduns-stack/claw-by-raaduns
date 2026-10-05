import { startServer } from "./core/server.js";

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});