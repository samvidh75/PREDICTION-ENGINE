// api/v2/health.ts — Proxy to Render API
// GET /api/v2/health
import type { VercelRequest, VercelResponse } from "@vercel/node";

const RENDER_API = "https://stockstory-api.onrender.com";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const resp = await fetch(`${RENDER_API}/api/v2/health`, {
      headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: err.message || String(err) });
  }
}
