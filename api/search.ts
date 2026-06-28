// api/search.ts — Proxy to Render API
// GET /api/search?q=reliance&limit=10
import type { VercelRequest, VercelResponse } from "@vercel/node";

const RENDER_API = "https://stockstory-api.onrender.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  try {
    const resp = await fetch(`${RENDER_API}/api/search?${queryString}`, {
      headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await resp.json();
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(resp.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: err.message || String(err) });
  }
}
