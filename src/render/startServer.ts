/**
 * Render backend entry point.
 * Minimal Fastify server with DB, migrations, health check, and CORS for Vercel frontend.
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { dbAdapter } from "../db/DatabaseAdapter";
import { MigrationRunner } from "../db/MigrationRunner";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "4001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const ALLOWED_ORIGINS = (process.env.EXTRA_ALLOWED_ORIGINS ?? "https://stockstory-india.com").split(",").map(s => s.trim());

async function bootstrap() {
  const server = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

  // CORS — allow Vercel frontend
  await server.register(cors, {
    origin: ["https://stockstory-india.com", "https://www.stockstory-india.com", ...ALLOWED_ORIGINS],
    credentials: true,
  });

  // Health check — used by Render
  server.get("/healthz", async (_req, _rep) => {
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

  // Initialize database and run migrations
  await dbAdapter.initialize();
  const migrationsDir = join(__dirname, "..", "db", "migrations");
  const runner = new MigrationRunner(dbAdapter, migrationsDir);
  const status = await runner.status();
  server.log.info(`Migrations: ${status.appliedCount} applied, ${status.pendingCount} pending`);

  if (status.pendingCount > 0) {
    server.log.info("Running pending migrations...");
    await runner.runPending();
    server.log.info("Migrations complete");
  }

  if (status.checksumMismatch && process.env.FORCE_MIGRATIONS === "true") {
    server.log.warn("Checksum mismatch ignored (FORCE_MIGRATIONS=true)");
  }

  // Start listening
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`Render backend listening on ${HOST}:${PORT}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start Render backend:", err);
  process.exit(1);
});
