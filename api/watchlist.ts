import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch } from "../src/lib/stockResearchSnapshot.js";
import { trackThesis } from "../src/research/watchlist/watchlistEngine.js";
import type { WatchlistThesisView } from "../src/research/contracts/productContracts.js";

// ── In-memory watchlist store (production: backed by Upstash Redis) ──────
const watchlists = new Map<string, Set<string>>();
const thesisCache = new Map<string, { data: WatchlistThesisView; ts: number }>();
const CACHE_TTL = 120_000; // 2 min

function getUserId(req: VercelRequest): string {
  // Simple anonymous user tracking via IP or header
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "anonymous";
}

function getUserWatchlist(userId: string): Set<string> {
  if (!watchlists.has(userId)) watchlists.set(userId, new Set());
  return watchlists.get(userId)!;
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const uid = getUserId(req);
  const wl = getUserWatchlist(uid);

  // GET — list watchlist with thesis tracking
  if (req.method === "GET") {
    const symbols = Array.from(wl);
    const items: Array<{ symbol: string; name: string; thesis: WatchlistThesisView | null }> = [];

    for (const symbol of symbols) {
      const syn = await getPersistedStockResearch(symbol).catch(() => null);
      const cached = thesisCache.get(symbol);
      let thesis: WatchlistThesisView | null = null;

      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        thesis = cached.data;
      } else if (syn) {
        thesis = trackThesis({
          symbol,
          companyName: syn.companyName || symbol,
          currentScore: syn.scores?.health ?? null,
          previousScore: syn.scores?.health ?? null,
          factorChanges: syn.whatChanged || [],
          riskChanges: [],
          lastUpdated: new Date().toISOString(),
        });
        thesisCache.set(symbol, { data: thesis, ts: Date.now() });
      }

      items.push({
        symbol,
        name: syn?.companyName || symbol,
        thesis,
      });
    }

    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json({ userId: uid, items, count: items.length });
  }

  // POST — add symbol(s) to watchlist
  if (req.method === "POST") {
    const body = req.body as { symbol?: string; symbols?: string[] };
    const toAdd = body.symbols || (body.symbol ? [body.symbol] : []);
    if (toAdd.length === 0) return res.status(400).json({ error: "symbol or symbols[] required" });

    const added: string[] = [];
    for (const s of toAdd) {
      const clean = s.toUpperCase().trim();
      if (clean && !wl.has(clean)) {
        wl.add(clean);
        added.push(clean);
      }
    }

    return res.status(200).json({ added, watchlistSize: wl.size });
  }

  // DELETE — remove symbol from watchlist
  if (req.method === "DELETE") {
    const symbol = String(
      Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol || ""
    ).toUpperCase().trim();
    if (!symbol) return res.status(400).json({ error: "symbol required" });

    const removed = wl.delete(symbol);
    thesisCache.delete(symbol);
    return res.status(200).json({ removed, watchlistSize: wl.size });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
