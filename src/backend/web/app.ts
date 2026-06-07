import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import routes from "./routes";
import { errorHandlerPlugin } from "../monitoring/errorHandler";
import { requestIdPlugin } from "../monitoring/requestIdPlugin";
import { rateLimiterPlugin } from "../../middleware/RateLimiter";
import { envPlugin } from "../config/envPlugin";
import { postgresPlugin } from "../persistence/postgres/postgresPlugin";
import { persistencePlugin } from "../persistence/persistencePlugin";
import { cachePlugin } from "../persistence/cache/cachePlugin";
import { loadEnv } from "../config/env";

export async function buildServer(): Promise<ReturnType<typeof Fastify>> {
  const env = loadEnv();
  const app = Fastify({ logger: false });

  // ── CORS ─────────────────────────────────────────────────────────────────
  // In production: only the canonical domain is allowed.
  // In development: localhost origins are also permitted.
  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      if (!origin) {
        // Server-to-server or same-origin – allow
        cb(null, true);
        return;
      }
      if (env.allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // ── Cookie support ────────────────────────────────────────────────────────
  await app.register(cookie, {
    secret: env.cookieSecret,
    hook: "onRequest",
    parseOptions: {
      secure: env.isProduction,
      sameSite: env.isProduction ? "strict" : "lax",
      httpOnly: true,
    },
  });

  // ── Core plugins ──────────────────────────────────────────────────────────
  // Websocket support (no routes yet; skeleton only)
  await app.register(websocketPlugin);

  // Correlation + observability primitives
  await app.register(requestIdPlugin);

  // Typed configuration injection
  await app.register(envPlugin);

  // Optional persistence client (only active if DATABASE_URL is configured)
  await app.register(postgresPlugin, { encapsulate: false } as any);

  // Domain persistence wiring + migration manager
  await app.register(persistencePlugin, { encapsulate: false } as any);

  // Cache hierarchy for stale-while-revalidate continuity
  await app.register(cachePlugin, { encapsulate: false } as any);

  // Rate limiting — protects all public endpoints
  await app.register(rateLimiterPlugin);

  // Structured error isolation (keeps failures safe + consistent)
  await app.register(errorHandlerPlugin);

  await app.register(routes, { encapsulate: false } as any);

  return app;
}
