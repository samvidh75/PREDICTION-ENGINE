/**
 * Render entry point — serves both the SPA (from dist/public/) and API.
 * Health endpoints work even without DB.
 *
 * Architecture:
 *   Frontend (SPA) + Backend (API) → Render
 *   Database → Neon (PostgreSQL)
 *   Cache → Upstash (Redis)
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { existsSync, readFile } from "fs";
import { dbAdapter } from "../db/DatabaseAdapter";
import { MigrationRunner } from "../db/MigrationRunner";
import registerApiRoutes from "./apiRouter.js";
import { StockUniverseAdapter } from "../services/data/providers/StockUniverseAdapter.js";
import { defaultDataAdapterRegistry } from "../services/data/dataAdapterRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "10000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const SELF_ORIGIN = process.env.SELF_ORIGIN ?? "https://stockstory-api.onrender.com";

// ── Lightweight metrics for /metrics endpoint ────────────────────
const metrics = {
  startTime: Date.now(),
  requestCount: 0,
  apiRequestCount: 0,
  lastRequestTime: 0,
  errors: 0,
};

// ── Credential validation at startup ─────────────────────────────
const PLACEHOLDER_PATTERNS = [
  /^your[-_]/, /^changeme$/i, /^test$/, /^placeholder$/i,
  /^sk-[a-zA-Z0-9]+$/, /^pk-[a-zA-Z0-9]+$/, // raw "sk-" / "pk-" without proper key suffix
  /^[a-zA-Z0-9]{8}$/,                        // too short to be real
];

const REQUIRED_PROD_SECRETS = [
  { key: "COOKIE_SECRET", minLen: 32, hint: "openssl rand -base64 64" },
  { key: "DATABASE_URL", minLen: 20, hint: "Neon PostgreSQL connection string" },
  { key: "FIREBASE_PRIVATE_KEY", minLen: 50, hint: "Firebase Admin private key" },
  { key: "INDIANAPI_KEY", minLen: 10, hint: "API key from stock.indianapi.in" },
];

function validateCredentials(isProduction: boolean): string[] {
  const issues: string[] = [];
  if (!isProduction) return issues;

  for (const { key, minLen, hint } of REQUIRED_PROD_SECRETS) {
    const val = process.env[key];
    if (!val || val.length < minLen) {
      issues.push(`INVALID: ${key} is missing or too short (min ${minLen} chars). Expected: ${hint}`);
      continue;
    }
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(val)) {
        issues.push(`INVALID: ${key} matches a placeholder pattern (${pattern.source}). Replace with a real credential.`);
      }
    }
  }

  // FIREBASE_PRIVATE_KEY must contain PEM header
  const fbKey = process.env.FIREBASE_PRIVATE_KEY;
  if (fbKey && !fbKey.includes("BEGIN PRIVATE KEY")) {
    issues.push("INVALID: FIREBASE_PRIVATE_KEY does not contain 'BEGIN PRIVATE KEY'. It must be a valid PEM-formatted private key.");
  }

  return issues;
}

async function bootstrap() {
  // Validate credentials before starting server (warn only, don't block)
  const credentialIssues = validateCredentials(process.env.NODE_ENV === "production");
  for (const issue of credentialIssues) {
    console.warn(`[credential-check] ${issue}`);
  }

  const server = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

  // ── CORS: allow the production domain + Render origin ──────────────
  await server.register(cors, {
    origin: [
      "https://stockstory-india.com",
      "https://www.stockstory-india.com",
      SELF_ORIGIN,
      ...(process.env.EXTRA_ALLOWED_ORIGINS?.split(",").map(s => s.trim()) ?? []),
    ],
    credentials: true,
  });

  // ── Security headers ──────────────────────────────────────────────
  server.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return payload;
  });

  // ── Request logging & metrics for /api/* routes ──────────────────
  server.addHook("onRequest", async (request) => {
    metrics.requestCount++;
    if (request.url.startsWith("/api/")) {
      metrics.apiRequestCount++;
      (request as any).__startTime = Date.now();
    }
  });

  server.addHook("onResponse", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    const duration = Date.now() - ((request as any).__startTime ?? Date.now());
    metrics.lastRequestTime = Date.now();
    if (reply.statusCode >= 500) metrics.errors++;
    server.log.info({ method: request.method, url: request.url, status: reply.statusCode, durationMs: duration },
      `${request.method} ${request.url} → ${reply.statusCode} (${duration}ms)`);
  });

  // ── Metrics endpoint ─────────────────────────────────────────────
  server.get("/metrics", async () => {
    const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
    let dbStatus: string;
    try {
      await dbAdapter.query("SELECT 1");
      dbStatus = "connected";
    } catch {
      dbStatus = "unavailable";
    }
    return {
      uptime,
      requestCount: metrics.requestCount,
      apiRequestCount: metrics.apiRequestCount,
      errors: metrics.errors,
      dbStatus,
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? "development",
    };
  });

  // ── Global error handler: sanitize all errors ─────────────────────
  server.setErrorHandler((error: unknown, _request, reply) => {
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      server.log.error({ err: error }, `Unhandled error: ${err.message ?? String(error)}`);
    }
    return reply.status(statusCode).send({
      error: statusCode < 500 ? (err.message ?? "Unknown error") : "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message ?? String(error) }),
    });
  });

  // ── Health & status endpoints (always respond, even without DB) ────
  server.get("/healthz", async () => {
    try {
      await dbAdapter.query("SELECT 1");
      return { ok: true, status: "ok", db: "connected" };
    } catch {
      return { ok: false, status: "degraded", db: "unavailable" };
    }
  });

  server.get("/readyz", async (_req, rep) => {
    try {
      await dbAdapter.query("SELECT 1");
      const diag = dbAdapter.diagnostics();
      return {
        ok: true,
        status: "ok",
        database: { kind: diag.kind, fallbackUsed: diag.fallbackUsed },
      };
    } catch (err) {
      rep.status(503);
      return {
        ok: false,
        status: "not_ready",
        database: { kind: "unavailable" as const, fallbackUsed: false },
        error: String(err),
      };
    }
  });

  server.get("/version", async () => {
    const distPath = join(process.cwd(), "dist", "public");
    const indexPath = join(distPath, "index.html");
    let indexExists = false;
    let distFiles: string[] = [];
    try {
      indexExists = existsSync(indexPath);
      const { readdirSync } = await import("fs");
      distFiles = readdirSync(distPath).slice(0, 20);
    } catch {
      // ignore — distPath may not exist on first deploy
    }
    return {
      name: "stockstory-render",
      node: process.version,
      env: process.env.NODE_ENV ?? "development",
      db: process.env.DATABASE_URL ? "configured" : "missing",
      api: "native (Render)",
      cwd: process.cwd(),
      distPath,
      indexExists,
      distFiles,
    };
  });

  // ── Data adapter initialization ────────────────────────────────────
  const adaptedRegistry = defaultDataAdapterRegistry;

  try {
    const companyMasterAdapter = StockUniverseAdapter.getInstance();
    server.log.info(`StockUniverseAdapter loaded: ${companyMasterAdapter.size} equities (generated ${companyMasterAdapter.dataGeneratedAt})`);
    // Inject into the default registry so all services get a real adapter
    Object.defineProperty(adaptedRegistry, 'companyMaster', {
      value: companyMasterAdapter,
      writable: false,
      configurable: false,
    });
    server.log.info("DefaultDataAdapterRegistry wired with StockUniverseAdapter");
  } catch (err) {
    server.log.warn(`CompanyMasterAdapter init error: ${err}`);
  }

  // ── Price adapter initialization ───────────────────────────────────
  try {
    const { PriceRealAdapter } = await import("../services/data/providers/PriceRealAdapter.js");
    const priceAdapter = new PriceRealAdapter();
    server.log.info(`PriceRealAdapter initialized — reading from daily_prices table (${priceAdapter.kind})`);
    Object.defineProperty(adaptedRegistry, 'price', {
      value: priceAdapter,
      writable: false,
      configurable: false,
    });
    server.log.info("DefaultDataAdapterRegistry wired with PriceRealAdapter");
  } catch (err) {
    server.log.warn(`PriceRealAdapter init error: ${err}`);
  }

  // ── API routes: /api/stock, /api/search ────────────────────────────
  await registerApiRoutes(server);

  // ── Static file serving ─────────────────────────────────────────
  const distPath = join(process.cwd(), "dist", "public");
  const indexPath = join(distPath, "index.html");
  server.log.info(
    `Static dir: ${distPath}, exists: ${existsSync(distPath)}, index: ${existsSync(indexPath)}`
  );

  const MIME_TYPES: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".map": "application/json",
  };

  function getContentType(p: string): string {
    return MIME_TYPES[extname(p).toLowerCase()] || "application/octet-stream";
  }

  function tryReadFile(p: string): Promise<Buffer | null> {
    return new Promise((resolve) => {
      readFile(p, (err, data) => {
        resolve(err ? null : data);
      });
    });
  }

  // ── Catch-all: serve static files or fall back to SPA index.html ─
  server.setNotFoundHandler(async (_req, reply) => {
    const url = new URL(_req.url, "http://localhost");

    // API routes → JSON 404
    if (url.pathname.startsWith("/api/")) {
      return reply.status(404).send({ error: "not found" });
    }

    // Try to serve the requested file from dist
    const filePath = join(distPath, url.pathname);
    if (filePath.startsWith(distPath)) {
      const content = await tryReadFile(filePath);
      if (content) {
        // Hashed assets (JS/CSS with hash in name) → 1 year cache
        const isHashed = /[.-][a-f0-9]{8,}\.(js|css)$/.test(url.pathname);
        const isImmutable = /\.(woff2?|png|jpg|jpeg|gif|webp|svg|ico)$/.test(url.pathname);
        if (isHashed) {
          reply.header("Cache-Control", "public, max-age=31536000, immutable");
        } else if (isImmutable) {
          reply.header("Cache-Control", "public, max-age=2592000, immutable");
        } else {
          reply.header("Cache-Control", "public, max-age=3600");
        }
        return reply.type(getContentType(filePath)).send(content);
      }
    }

    // SPA fallback: serve index.html
    const indexContent = await tryReadFile(indexPath);
    if (indexContent) {
      return reply.type("text/html").send(indexContent);
    }

    return reply.status(404).send({ error: "not found" });
  });

  // ── Database initialization (non-fatal) ────────────────────────────
  try {
    await dbAdapter.initialize();
    server.log.info("Database initialized");

    const migrationsDir = join(__dirname, "..", "db", "migrations");
    const runner = new MigrationRunner(dbAdapter, migrationsDir);
    const status = await runner.status();
    server.log.info(`Migrations: ${status.appliedCount} applied, ${status.pendingCount} pending`);

    if (status.pendingCount > 0) {
      server.log.info("Running pending migrations...");
      await runner.runPending(process.env.FORCE_MIGRATIONS === "true");
      server.log.info("Migrations complete");
    }

    if (status.checksumMismatch && process.env.FORCE_MIGRATIONS === "true") {
      server.log.warn("Checksum mismatch bypassed (FORCE_MIGRATIONS=true)");
    }
  } catch (err) {
    server.log.warn(`Database unavailable: ${err}. Health endpoint will report degraded.`);
  }

  await server.listen({ port: PORT, host: HOST });
  server.log.info(`Render server listening on ${HOST}:${PORT} — SPA served from ${distPath}`);

  // ── Warm-up: self-ping to pre-warm DB pool, caches, and connections ─
  server.inject({ method: "GET", url: "/healthz" }).then(res => {
    server.log.info(`Warm-up /healthz → ${res.statusCode}`);
  }).catch(() => {});
}

bootstrap().catch((err) => {
  console.error("Failed to start Render server:", err);
  process.exit(1);
});
