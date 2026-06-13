import { buildServer } from "./web/app.js";
import { AppHealthWatchdog } from "../services/health/AppHealthWatchdog";

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";

async function main(): Promise<void> {
  const app = await buildServer();

  await app.listen({ port, host });
  console.log(`[backend] fastify listening on http://${host}:${port}`);

  const watchdog = new AppHealthWatchdog({
    checkIntervalMs: 30_000,
    onStatusChange: (prev, curr) => {
      console.log(`[watchdog] status: ${prev} → ${curr}`);
    },
  });
  watchdog.start();
  app.decorate("watchdog", watchdog);
}

void main().catch((err) => {
  console.error("[backend] failed to start", err);
  process.exit(1);
});
