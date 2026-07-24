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
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { existsSync, readFile, readFileSync } from "fs";
import { dbAdapter } from "../db/DatabaseAdapter";
import { MigrationRunner } from "../db/MigrationRunner";
import registerApiRoutes from "./apiRouter.js";
import { StockUniverseAdapter } from "../services/data/providers/StockUniverseAdapter.js";
import { defaultDataAdapterRegistry } from "../services/data/dataAdapterRegistry.js";
import { startWebSocketDataProducer } from "../services/market/websocketDataProducer.js";
import { MetricsCollector } from "../commercial/api/monitoring/MetricsCollector.js";
import { registerLiveQuotesWs } from "../backend/routes/liveQuotesWs.js";
import { registerFeatureRoutes } from "../backend/web/routes/index.js";
import { registerAIRoutes } from "./aiRoutes.js";
import { registerModelInferenceRoutes } from "../services/ai/ModelInferenceServer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "10000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const SELF_ORIGIN = process.env.SELF_ORIGIN ?? "https://stockstory-api.onrender.com";
const BUILD_TIME = __filename.includes("node_modules") ? "" : __filename;

// ── Capture deploy commit & build timestamp at import time ─────────────
const GIT_HEAD: string = (() => {
  try {
    return readFileSync(join(__dirname, "..", "..", ".git", "HEAD"), "utf-8").trim();
  } catch { return "unknown"; }
})();
const COMMIT_SHA: string = (() => {
  try {
    // HEAD might be a ref like "ref: refs/heads/main"
    if (GIT_HEAD.startsWith("ref: ")) {
      const refPath = GIT_HEAD.slice(5).trim();
      const ref = readFileSync(join(__dirname, "..", "..", ".git", refPath), "utf-8").trim();
      return ref;
    }
    return GIT_HEAD;
  } catch { return "unknown"; }
})();
const BUILD_ISO: string = new Date().toISOString();

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
  { key: "PSXAPI_KEY", minLen: 10, hint: "API key from api.psx.com.pk" },
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
      "https://stockstory-ph.com",
      "https://www.stockstory-ph.com",
      SELF_ORIGIN,
      ...(process.env.EXTRA_ALLOWED_ORIGINS?.split(",").map(s => s.trim()) ?? []),
    ],
    credentials: true,
  });

  // ── WebSocket support for live price streaming ────────────────────
  await server.register(websocket);

  // ── Live quote WebSocket (new cascading provider) ──────────────────
  await registerLiveQuotesWs(server);
  await registerFeatureRoutes(server);

  // ── Rate limiting — 60 req/min per IP ───────────────────────────────
  await server.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    cache: 10000,
    keyGenerator: (req) =>
      (req.headers["x-real-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string) ||
      req.ip,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: "Rate Limit Exceeded",
      message: `StockEX rate limit hit (60 req/min). Resets in ${context.after}.`,
    }),
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

  // ── SMTP health check (Phase 43) ────────────────────────────────────
  server.get("/health/smtp", async (_req, reply) => {
    const { SMTP_HOST, SMTP_PORT } = process.env;
    if (!SMTP_HOST) {
      return reply.send({ ok: false, status: "not_configured", message: "SMTP not configured" });
    }
    try {
      const { connect } = await import("net");
      const { hostname } = await import("os");
      await new Promise<void>((resolve, reject) => {
        const socket = connect(parseInt(SMTP_PORT || "587", 10), SMTP_HOST, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
        socket.setTimeout(5000, () => { socket.destroy(); reject(new Error("timeout")); });
      });
      return reply.send({ ok: true, status: "reachable", host: SMTP_HOST });
    } catch (err: any) {
      return reply.send({ ok: false, status: "unreachable", message: err.message });
    }
  });

  // ── WebSocket: Live price streaming ──────────────────────────────
  const wsConnections = new Set<any>();

  server.get("/ws/v1/live-stream", { websocket: true }, (socket) => {
    // Per-connection ticker subscription set (Phase 43 filtering)
    (socket as any).subscribedTickers = new Set<string>();

    wsConnections.add(socket);
    server.log.info(`[ws] Client connected. Pool size: ${wsConnections.size}`);

    socket.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === "subscribe" && Array.isArray(msg.tickers)) {
          (socket as any).subscribedTickers = new Set(msg.tickers.map((t: string) => t.toUpperCase()));
          server.log.info(`[ws] Client subscribed to ${msg.tickers.length} tickers`);
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on("close", () => {
      wsConnections.delete(socket);
      server.log.info(`[ws] Client disconnected. Pool size: ${wsConnections.size}`);
    });

    socket.on("error", () => {
      wsConnections.delete(socket);
    });

    // Send initial connection confirmation
    socket.send(JSON.stringify({ type: "connected", message: "Live price stream active" }));
  });

  // Broadcast helper — sends tick only to clients subscribed to that ticker
  function broadcastTickerTick(ticker: string, price: number, changePct: number) {
    const upper = ticker.toUpperCase();
    const payload = JSON.stringify({
      type: "ticker_tick",
      ticker: upper,
      price,
      change_pct: changePct,
    });
    for (const conn of wsConnections) {
      const subs = (conn as any).subscribedTickers as Set<string> | undefined;
      if (subs && subs.size > 0 && !subs.has(upper)) continue; // skip unsubscribed
      try { conn.send(payload); } catch { wsConnections.delete(conn); }
    }
  }

  // Attach broadcast function to server for external access
  (server as any).broadcastTickerTick = broadcastTickerTick;

  // Start WebSocket data producer — polls Postgres and broadcasts price ticks
  startWebSocketDataProducer(broadcastTickerTick);

  // ── WebSocket: Event alerts (corporate actions, breakouts, etc) ──────
  const alertConnections = new Set<any>();

  server.get("/ws/v1/event-alerts", { websocket: true }, (socket) => {
    alertConnections.add(socket);
    server.log.info(`[alerts-ws] Client connected. Pool size: ${alertConnections.size}`);

    socket.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === "subscribe" && Array.isArray(msg.tickers)) {
          (socket as any).subscribedAlerts = new Set(msg.tickers.map((t: string) => t.toUpperCase()));
          server.log.info(`[alerts-ws] Client subscribed to alerts for ${msg.tickers.length} tickers`);
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on("close", () => {
      alertConnections.delete(socket);
      server.log.info(`[alerts-ws] Client disconnected. Pool size: ${alertConnections.size}`);
    });

    socket.on("error", () => {
      alertConnections.delete(socket);
    });

    // Send initial connection confirmation
    socket.send(JSON.stringify({ type: "connected", message: "Event alerts stream active" }));
  });

  // Broadcast alert to subscribed clients
  function broadcastAlert(ticker: string, message: string, alertType: string) {
    const upper = ticker.toUpperCase();
    const payload = JSON.stringify({
      type: "event_alert_push",
      ticker: upper,
      message,
      alertType,
      timestamp: Date.now(),
    });
    for (const conn of alertConnections) {
      const subs = (conn as any).subscribedAlerts as Set<string> | undefined;
      if (subs && subs.size > 0 && !subs.has(upper)) continue; // skip unsubscribed
      try { conn.send(payload); } catch { alertConnections.delete(conn); }
    }
  }

  // Attach broadcast function to server
  (server as any).broadcastAlert = broadcastAlert;

  server.get("/version", async () => {
    const { readdirSync } = await import("fs");
    const distPath = join(process.cwd(), "dist", "public");
    let indexExists = false;
    let distFiles: string[] = [];
    try {
      indexExists = existsSync(indexPath);
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
      commitSha: COMMIT_SHA,
      commitShaShort: COMMIT_SHA.length > 8 ? COMMIT_SHA.slice(0, 8) : COMMIT_SHA,
      buildTime: BUILD_ISO,
      uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    };
  });

  // ── /api/health: same as /healthz but under /api namespace ─────────
  server.get("/api/health", async () => {
    try {
      await dbAdapter.query("SELECT 1");
      return { ok: true, status: "ok", db: "connected", commitSha: COMMIT_SHA.slice(0, 8) };
    } catch {
      return { ok: false, status: "degraded", db: "unavailable", commitSha: COMMIT_SHA.slice(0, 8) };
    }
  });

  // ── /api/version: same as /version but under /api namespace ────────
  server.get("/api/version", async () => ({
    name: "equity-lens-api",
    version: "1.0.0",
    commitSha: COMMIT_SHA,
    commitShaShort: COMMIT_SHA.slice(0, 8),
    nodeVersion: process.version,
    env: process.env.NODE_ENV ?? "development",
    buildTime: BUILD_ISO,
    uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
  }));

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

  // ── Raw body parser for webhook HMAC verification ───────────────
  // Captures the raw JSON payload so Razorpay webhook handlers can
  // verify HMAC SHA256 signatures before parsing.
  server.addContentTypeParser(
    "application/json",
    { parseAs: "string", bodyLimit: 1024 * 1024 },
    function (this: any, req: any, body: string, done: (err: Error | null, result?: any) => void) {
      try {
        // Store raw body for webhook signature verification
        (req as any).__rawBody = body;
        done(null, JSON.parse(body));
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );

  // ── API routes: /api/stock, /api/search ────────────────────────────
  await registerApiRoutes(server);

  // ── AI Inference routes: /api/ai/analyze, /api/ai/chat, /api/ai/status
  await registerAIRoutes(server);

  // ── WebGPU + WebSocket Model Inference routes: /ws/ai, /api/ai/models
  try {
    registerModelInferenceRoutes(server);
    console.log('[Server] Model inference routes registered (WebSocket + WebGPU)');
  } catch (error) {
    console.warn('[Server] Model inference routes setup failed (non-critical):', error);
  }

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

  // ── Start background metrics collector ───────────────────────
  MetricsCollector.startCollector();

  await server.listen({ port: PORT, host: HOST });
  server.log.info(`Render server listening on ${HOST}:${PORT} — SPA served from ${distPath}`);
  server.log.info(`Deployed commit: ${COMMIT_SHA.slice(0, 8)} | Build time: ${BUILD_ISO} | Node: ${process.version}`);

  // ── Warm-up: self-ping to pre-warm DB pool, caches, and connections ─
  server.inject({ method: "GET", url: "/healthz" }).then(res => {
    server.log.info(`Warm-up /healthz → ${res.statusCode}`);
  }).catch(() => {});
}

bootstrap().catch((err) => {
  console.error("Failed to start Render server:", err);
  process.exit(1);
});
