import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch, searchPersistedStocks } from "../src/lib/stockResearchSnapshot.js";
import { scanByType } from "../src/services/scanner/scoringEngine.js";
import { runScanner, type ScannerPreset, SCANNER_PRESETS } from "../src/research/scanner/scannerEngine.js";
import { compareCompanies } from "../src/research/compare/compareEngine.js";
import { trackThesis } from "../src/research/watchlist/watchlistEngine.js";
import type { CompareInput } from "../src/research/compare/compareEngine.js";
import type { WatchlistThesisView } from "../src/research/contracts/productContracts.js";

// ── Constants ────────────────────────────────────────────────────────────────
const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 120_000;
const watchlists = new Map<string, Set<string>>();
const thesisCache = new Map<string, { data: WatchlistThesisView; ts: number }>();

const PRESET_MAP: Record<string, ScannerPreset> = {
  quality: "Quality compounders",
  value: "Undervalued quality",
  momentum: "Improving momentum",
  stable: "Dividend stability",
  "low-debt": "Low debt leaders",
  growth: "Earnings acceleration",
  "risk-rising": "Risk rising",
  turnaround: "Turnaround watch",
  contrarian: "Good businesses out of favour",
  expensive: "High quality, expensive",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getUserId(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  return typeof fwd === "string" ? fwd.split(",")[0].trim() : "anonymous";
}

function getUserWatchlist(uid: string): Set<string> {
  if (!watchlists.has(uid)) watchlists.set(uid, new Set());
  return watchlists.get(uid)!;
}

function generateState(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(
    Array.isArray(req.query.action) ? req.query.action[0] : req.query.action || "scanner"
  ).toLowerCase();

  // ── SCANNER: /api/research?action=scanner&preset=quality&limit=20 ──────
  if (action === "scanner") {
    const presetKey = String(
      Array.isArray(req.query.preset) ? req.query.preset[0] : req.query.preset || "quality"
    ).toLowerCase();
    const preset = PRESET_MAP[presetKey] || PRESET_MAP.quality;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 50);

    const cacheKey = `scanner:${preset}:${limit}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, s-maxage=120");
      return res.status(200).json(cached.data);
    }

    try {
      const scanType = (["quality", "value", "momentum", "stable"] as const).find(
        t => PRESET_MAP[t] === preset
      ) || "quality";

      const scanned = scanByType(scanType).slice(0, limit);
      const enriched = await Promise.all(
        scanned.map(async (stock) => {
          const syn = await getPersistedStockResearch(stock.symbol).catch(() => null);
          return {
            symbol: stock.symbol,
            companyName: syn?.companyName || stock.name || stock.symbol,
            sector: stock.sector || syn?.sector || "Uncategorized",
            scores: {
              quality: stock.quality,
              valuation: stock.valuation,
              growth: stock.growth,
              risk: stock.risk,
              momentum: stock.technical,
              stability: syn?.scores?.stability ?? stock.quality,
            },
          };
        })
      );

      const results = enriched.length > 0
        ? runScanner(preset, enriched).slice(0, limit)
        : [];

      const def = SCANNER_PRESETS[preset];
      const payload = {
        action: "scanner",
        preset: presetKey,
        presetLabel: preset,
        explanation: def.explanation,
        riskCaveat: def.riskCaveat,
        total: results.length,
        results: results.map(r => ({
          symbol: r.symbol,
          companyName: r.companyName,
          sector: r.sector,
          rank: r.rank,
          conviction: r.conviction,
          score: r.score,
          keyReason: r.keyReason,
          riskMarker: r.riskMarker,
          oneLineThesis: r.oneLineThesis,
        })),
      };

      CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "public, s-maxage=120");
      return res.status(200).json(payload);
    } catch (err) {
      return res.status(502).json({ error: err instanceof Error ? err.message : String(err), action: "scanner" });
    }
  }

  // ── COMPARE: /api/research?action=compare&symbols=TCS,INFY,WIPRO ───────
  if (action === "compare") {
    const rawSymbols = Array.isArray(req.query.symbols)
      ? req.query.symbols[0]
      : req.query.symbols;
    if (!rawSymbols) {
      return res.status(400).json({ error: "symbols required", usage: "/api/research?action=compare&symbols=TCS,INFY" });
    }

    const symbols = String(rawSymbols).split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    if (symbols.length < 2) return res.status(400).json({ error: "Need at least 2 symbols" });
    if (symbols.length > 5) return res.status(400).json({ error: "Maximum 5 symbols" });

    const cacheKey = `compare:${symbols.sort().join(",")}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached.data);
    }

    const researchResults = await Promise.all(
      symbols.map(s => getPersistedStockResearch(s).catch(() => null))
    );

    const inputs: CompareInput[] = [];
    for (let i = 0; i < symbols.length; i++) {
      const syn = researchResults[i];
      inputs.push({
        symbol: symbols[i],
        companyName: syn?.companyName || symbols[i],
        scores: {
          quality: syn?.scores?.quality ?? null,
          valuation: syn?.scores?.valuation ?? null,
          growth: syn?.scores?.growth ?? null,
          risk: syn?.scores?.risk ?? null,
          momentum: syn?.scores?.momentum ?? null,
          stability: syn?.scores?.stability ?? null,
        },
      });
    }

    const result = compareCompanies(inputs);
    const payload = {
      action: "compare",
      ...result,
      comparedSymbols: symbols,
      _dataSource: "research_engine",
    };

    CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    res.setHeader("Cache-Control", "public, s-maxage=120");
    return res.status(200).json(payload);
  }

  // ── WATCHLIST: /api/research?action=watchlist ──
  //   POST: add symbol(s)  DELETE: remove symbol
  if (action === "watchlist") {
    const uid = getUserId(req);
    const wl = getUserWatchlist(uid);

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

        items.push({ symbol, name: syn?.companyName || symbol, thesis });
      }

      res.setHeader("Cache-Control", "private, max-age=60");
      return res.status(200).json({ action: "watchlist", userId: uid, items, count: items.length });
    }

    if (req.method === "POST") {
      const body = req.body as { symbol?: string; symbols?: string[] };
      const toAdd = body?.symbols || (body?.symbol ? [body.symbol] : []);
      if (toAdd.length === 0) return res.status(400).json({ error: "symbol or symbols[] required" });

      const added: string[] = [];
      for (const s of toAdd) {
        const clean = s.toUpperCase().trim();
        if (clean && !wl.has(clean)) { wl.add(clean); added.push(clean); }
      }
      return res.status(200).json({ action: "watchlist", added, watchlistSize: wl.size });
    }

    if (req.method === "DELETE") {
      const symbol = String(
        Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol || ""
      ).toUpperCase().trim();
      if (!symbol) return res.status(400).json({ error: "symbol required" });
      const removed = wl.delete(symbol);
      thesisCache.delete(symbol);
      return res.status(200).json({ action: "watchlist", removed, watchlistSize: wl.size });
    }

    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── BROKER: /api/research?action=broker&broker=upstox ──
  //   POST body: { broker, action: "auth_url", redirectUri }
  if (action === "broker") {
    if (req.method === "POST") {
      const { broker, action: brokerAction, redirectUri, code } = req.body || {} as Record<string, string>;
      const brokerName = (broker || "upstox").toLowerCase();

      if (brokerAction === "auth_url" || !brokerAction) {
        if (!redirectUri) return res.status(400).json({ error: "redirectUri required" });
        if (brokerName === "upstox") {
          const clientId = process.env.UPSTOX_CLIENT_ID || "";
          if (!clientId) return res.status(503).json({ error: "Upstox not configured", broker: brokerName });
          const state = generateState();
          const authUrl = `https://api.upstox.com/v2/login/authorization/dialog` +
            `?client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code&state=${encodeURIComponent(state)}`;
          return res.status(200).json({ action: "broker", broker: brokerName, authUrl, state });
        }
        return res.status(400).json({ error: `Unknown broker: ${brokerName}` });
      }

      if (brokerAction === "exchange") {
        if (!code) return res.status(400).json({ error: "code required" });
        if (brokerName === "upstox") {
          const clientId = process.env.UPSTOX_CLIENT_ID || "";
          const clientSecret = process.env.UPSTOX_CLIENT_SECRET || "";
          if (!clientId || !clientSecret) return res.status(503).json({ error: "Upstox credentials not configured" });
          try {
            const tokenRes = await fetch("https://api.upstox.com/v2/login/authorization/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
              body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri || "", grant_type: "authorization_code" }).toString(),
              signal: AbortSignal.timeout(10_000),
            });
            const data = await tokenRes.json();
            if (!tokenRes.ok) return res.status(502).json({ error: data?.errors?.[0]?.message || "Token exchange failed" });
            return res.status(200).json({ action: "broker", broker: brokerName, accessToken: data.access_token, tokenType: data.token_type || "Bearer", expiresIn: data.expires_in });
          } catch (err) {
            return res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      return res.status(400).json({ error: `Unknown action: ${brokerAction}` });
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(400).json({ error: `Unknown action: ${action}`, validActions: ["scanner", "compare", "watchlist", "broker"] });
}
