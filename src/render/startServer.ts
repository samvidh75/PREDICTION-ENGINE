/**
 * Render backend entry point.
 * Resilient Fastify server — health endpoints work even without DB.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { dbAdapter } from "../db/DatabaseAdapter";
import { MigrationRunner } from "../db/MigrationRunner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "10000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function bootstrap() {
  const server = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

  await server.register(cors, {
    origin: [
      "https://stockstory-india.com",
      "https://www.stockstory-india.com",
      ...(process.env.EXTRA_ALLOWED_ORIGINS?.split(",").map(s => s.trim()) ?? []),
    ],
    credentials: true,
  });

  // Health check — responds even if DB is down / env vars missing
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

  // Version info
  server.get("/version", async () => ({
    name: "stockstory-api",
    node: process.version,
    env: process.env.NODE_ENV ?? "development",
    db: process.env.DATABASE_URL ? "configured" : "missing",
    redis: process.env.REDIS_URL ? "configured" : "not configured",
    sglang: process.env.SGLANG_URL ? process.env.SGLANG_URL : "not configured",
  }));

  // Initialize DB (non-fatal if missing — health endpoint still responds)
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
  server.log.info(`Render backend listening on ${HOST}:${PORT}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start Render backend:", err);
  process.exit(1);
});
