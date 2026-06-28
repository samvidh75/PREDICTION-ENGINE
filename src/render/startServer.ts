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
import staticFiles from "@fastify/static";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import { dbAdapter } from "../db/DatabaseAdapter";
import { MigrationRunner } from "../db/MigrationRunner";
import registerApiRoutes from "./apiRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "10000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const SELF_ORIGIN = process.env.SELF_ORIGIN ?? "https://stockstory-api.onrender.com";

async function bootstrap() {
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

  // ── Health & status endpoints (always respond, even without DB) ────
  server.get("/healthz", async () => {
    try {
      await dbAdapter.query("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch {
      return { status: "degraded", db: "unavailable" };
    }
  });

  server.get("/readyz", async (_req, rep) => {
    try {
      await dbAdapter.query("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch (err) {
      rep.status(503);
      return { status: "not_ready", db: "unavailable", error: String(err) };
    }
  });

  server.get("/version", async () => ({
    name: "stockstory-render",
    node: process.version,
    env: process.env.NODE_ENV ?? "development",
    db: process.env.DATABASE_URL ? "configured" : "missing",
    api: "native (Render)",
    cwd: process.cwd(),
  }));

  // ── API routes: /api/stock, /api/search ────────────────────────────
  await registerApiRoutes(server);

  // ── Static SPA: serve dist/public/ folder ───────────────────────────
  const distPath = join(process.cwd(), "dist", "public");
  const indexPath = join(distPath, "index.html");
  server.log.info(`Serving static files from ${distPath}, index exists: ${existsSync(indexPath)}`);

  // Read index.html into memory for direct serving (avoids @fastify/static sendFile issues)
  let indexHtml: string | null = null;
  try {
    if (existsSync(indexPath)) {
      indexHtml = readFileSync(indexPath, "utf-8");
      server.log.info(`Loaded index.html (${indexHtml.length} bytes)`);
    } else {
      server.log.warn(`index.html not found at ${indexPath}`);
    }
  } catch (err) {
    server.log.warn(`Failed to read index.html: ${err}`);
  }

  // Register @fastify/static for assets (JS, CSS, images)
  await server.register(staticFiles, {
    root: distPath,
    prefix: "/",
    wildcard: false,
  });

  // ── Serve index.html for root and SPA routes ─────────────────────
  async function serveIndex(reply: any) {
    if (indexHtml) {
      reply.type("text/html").send(indexHtml);
    } else {
      // Fallback: try sendFile
      reply.sendFile("index.html");
    }
  }

  server.get("/", (req, reply) => {
    return serveIndex(reply);
  });

  // ── SPA fallback: serve index.html for client-side routes ──────────
  server.setNotFoundHandler((_req, reply) => {
    if (_req.url.startsWith("/api/")) {
      return reply.status(404).send({ error: "not found" });
    }
    return serveIndex(reply);
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
}

bootstrap().catch((err) => {
  console.error("Failed to start Render server:", err);
  process.exit(1);
});
