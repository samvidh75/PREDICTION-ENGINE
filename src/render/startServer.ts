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

  server.get("/version", async () => {
    const distPath = join(process.cwd(), "dist", "public");
    const indexPath = join(distPath, "index.html");
    let indexExists = false;
    let distFiles: string[] = [];
    try {
      indexExists = existsSync(indexPath);
      const { readdirSync } = await import("fs");
      distFiles = readdirSync(distPath).slice(0, 20);
    } catch {}
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
}

bootstrap().catch((err) => {
  console.error("Failed to start Render server:", err);
  process.exit(1);
});
