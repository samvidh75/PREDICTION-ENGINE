import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const indianApiKey = process.env.INDIANAPI_KEY;
  const checks = {
    indianapi: indianApiKey ? "configured" : "MISSING - add indianapi-key secret in Vercel",
    screener: process.env.VITE_SCREENER_ENABLED === "true" ? "enabled" : "disabled",
    upstox: process.env.UPSTOX_ACCESS_TOKEN ? "configured" : "optional - not set",
    historical_proxy: "available at /api/historical/:symbol",
    build: "1926 modules",
    timestamp: new Date().toISOString(),
  };
  const allHealthy = !!indianApiKey;
  const body = JSON.stringify({ status: allHealthy ? "ok" : "degraded", checks });
  res.writeHead(allHealthy ? 200 : 503, { "Content-Type": "application/json" });
  res.end(body);
}
