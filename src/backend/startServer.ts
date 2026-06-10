import { buildServer } from "./web/app.js";

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";

async function main(): Promise<void> {
  const app = await buildServer();

  await app.listen({ port, host });
  // eslint-disable-next-line no-console
  console.log(`[backend] fastify listening on http://${host}:${port}`);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] failed to start", err);
  process.exit(1);
});
