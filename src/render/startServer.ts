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

  // ── Static file serving ─────────────────────────────────────────
  const distPath = join(process.cwd(), "dist", "public");
  const indexPath = join(distPath, "index.html");
  const distExists = existsSync(distPath);
  const indexExists = existsSync(indexPath);
  server.log.info(`Serving static files from ${distPath}, dist exists: ${distExists}, index exists: ${indexExists}`);

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

  function getContentType(filePath: string): string {
    return MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
  }

  async function tryServeFile(filePath: string, reply: any): Promise<boolean> {
    try {
      const content = await new Promise<Buffer>((resolve, reject) => {
        readFile(filePath, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      reply.type(getContentType(filePath)).send(content);
      return true;
    } catch {
      return false;
    }
  }

  async function serveIndex(reply: any): Promise<void> {
    try {
      const content = await new Promise<Buffer>((resolve, reject) => {
        readFile(indexPath, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      reply.type("text/html").send(content);
    } catch {
      reply.status(404).send({ error: "not found" });
    }
  }

  // ── Serve known extension routes statically ────────────────────
  server.get("/assets/*", async (req, reply) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const filePath = join(distPath, pathname);
    if (!filePath.startsWith(distPath)) return reply.status(403).send({ error: "forbidden" });
    if (await tryServeFile(filePath, reply)) return;
    return serveIndex(reply);
  });

  server.get("/fonts/*", async (req, reply) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const filePath = join(distPath, pathname);
    if (!filePath.startsWith(distPath)) return reply.status(403).send({ error: "forbidden" });
    if (await tryServeFile(filePath, reply)) return;
    return serveIndex(reply);
  });

  // ── Root → index.html ──────────────────────────────────────────
  server.get("/", async (_req, reply) => {
    return serveIndex(reply);
  });

  // ── Root-level files (favicon, robots.txt, sitemap, etc.) ──────
  server.get("/:file", async (req, reply) => {
    const url = new URL(req.url, "http://localhost");
    const filePath = join(distPath, url.pathname);
    if (!filePath.startsWith(distPath)) return reply.status(403).send({ error: "forbidden" });
    if (await tryServeFile(filePath, reply)) return;
    return serveIndex(reply);
  });

  // ── SPA fallback: serve index.html for client-side routes ──────
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
