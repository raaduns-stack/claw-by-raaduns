import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";

const COOKIE = "staff_claw_session";
const MAX_AGE = 60 * 60 * 8;

function passwordOk(password: string) {
  const [salt, expected] = config.ADMIN_PASSWORD_HASH.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const target = Buffer.from(expected, "hex");
  return target.length === actual.length && timingSafeEqual(actual, target);
}

function sign(payload: string) {
  return createHmac("sha256", Buffer.from(config.ADMIN_SESSION_SECRET, "hex")).update(payload).digest("base64url");
}

function issueSession() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${config.ADMIN_USERNAME}:${exp}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

function validSession(token?: string) {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = sign(payload);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  const [username, exp] = payload.split(":");
  return username === config.ADMIN_USERNAME && Number(exp) > Math.floor(Date.now() / 1000);
}

function cookieValue(request: FastifyRequest) {
  const raw = String(request.headers.cookie ?? "");
  const match = raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  return match?.slice(COOKIE.length + 1);
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!validSession(cookieValue(request))) {
    reply.code(401).send({ error: "Authentication required." });
    return false;
  }
  return true;
}

export function registerAdminAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/login", async (request, reply) => {
    const body = request.body as { username?: string; password?: string } | undefined;
    if (body?.username !== config.ADMIN_USERNAME || !body.password || !passwordOk(body.password)) {
      return reply.code(401).send({ error: "Invalid credentials." });
    }
    reply.header("Set-Cookie", `${COOKIE}=${issueSession()}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Strict`);
    return reply.send({ authenticated: true });
  });
  app.post("/api/auth/logout", async (_request, reply) => {
    reply.header("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`);
    return reply.send({ authenticated: false });
  });
  app.get("/api/auth/session", async request => ({ authenticated: validSession(cookieValue(request)) }));
}

export function createAdminSessionSecret() {
  return randomBytes(32).toString("hex");
}
