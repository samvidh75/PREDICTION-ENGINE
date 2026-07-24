import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const snapshotModule = path.resolve(root, "src/lib/stockResearchSnapshot.ts");

async function loadSnapshot(server: ViteDevServer) {
  return server.ssrLoadModule(snapshotModule) as Promise<typeof import("./src/lib/stockResearchSnapshot")>;
}

// Minimal VercelRequest/VercelResponse shim so the real serverless
// functions (api/search.ts, api/stock/[symbol].ts) can run unmodified
// under Vite's dev middleware — this is what makes `npm run dev` serve
// the exact same PSE data path as production, instead of a parallel
// hand-maintained mock pipeline that can drift out of sync with it.
async function callVercelHandler(
  server: ViteDevServer,
  modulePath: string,
  req: any,
  res: any,
  extraQuery: Record<string, string> = {},
) {
  const mod = (await server.ssrLoadModule(modulePath)) as { default: (req: any, res: any) => Promise<void> };
  const parsed = new URL(req.url ?? "", "http://localhost");
  const query: Record<string, string> = { ...extraQuery };
  for (const [key, value] of parsed.searchParams) query[key] = value;

  const vercelRes = {
    statusCode: 200,
    setHeader: (name: string, value: string) => res.setHeader(name, value),
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) {
      res.statusCode = this.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    },
  };

  await mod.default({ method: req.method, query }, vercelRes);
}

export function localApiPlugin(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) {
          next();
          return;
        }

        try {
          // ── Health ──────────────────────────────────────────
          if (url.startsWith("/api/health")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          // ── Search — delegates to the real api/search.ts handler, so
          // dev mode searches the same real PSE universe as production. ──
          if (url.startsWith("/api/search")) {
            await callVercelHandler(server, path.resolve(root, "api/search.ts"), req, res);
            return;
          }

          // ── Stock Detail — delegates to the real api/stock/[symbol].ts
          // handler (real phisix PSE prices, no fabricated fundamentals). ──
          if (url.startsWith("/api/stock")) {
            const parsed = new URL(url, "http://localhost");
            const symbol = (parsed.searchParams.get("symbol") ?? decodeURIComponent(url.replace("/api/stock/", "").split("?")[0] ?? "")).toUpperCase();
            await callVercelHandler(server, path.resolve(root, "api/stock/[symbol].ts"), req, res, { symbol });
            return;
          }

          // ── Corporate Actions ──────────────────────────────────
          if (url.startsWith("/api/corporate-actions")) {
            const { corporateActionsService } = await import("./src/services/corporate-actions/CorporateActionsService.ts");
            const parsed = new URL(url, "http://localhost");
            const symbol = parsed.searchParams.get("symbol") ?? "";
            const days = Number(parsed.searchParams.get("days") ?? 30);
            const data = symbol
              ? corporateActionsService.getActionsBySymbol(symbol.toUpperCase())
              : corporateActionsService.getUpcomingActions(days);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, count: data.length, data }));
            return;
          }

          // ── Insider Trades ────────────────────────────────────
          if (url.startsWith("/api/insider-trades")) {
            const { corporateActionsService } = await import("./src/services/corporate-actions/CorporateActionsService.ts");
            const parsed = new URL(url, "http://localhost");
            const symbol = parsed.searchParams.get("symbol") ?? "";
            const days = Number(parsed.searchParams.get("days") ?? 30);
            const data = symbol
              ? corporateActionsService.getInsiderTradesBySymbol(symbol.toUpperCase())
              : corporateActionsService.getRecentInsiderTrades(days);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, count: data.length, data }));
            return;
          }

          // ── Bulk Deals ─────────────────────────────────────────
          if (url.startsWith("/api/bulk-deals")) {
            const { corporateActionsService } = await import("./src/services/corporate-actions/CorporateActionsService.ts");
            const parsed = new URL(url, "http://localhost");
            const symbol = parsed.searchParams.get("symbol") ?? "";
            const days = Number(parsed.searchParams.get("days") ?? 30);
            const data = symbol
              ? corporateActionsService.getBulkDealsBySymbol(symbol.toUpperCase())
              : corporateActionsService.getRecentBulkDeals(days);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, count: data.length, data }));
            return;
          }

          // ── Valuation DCF ──────────────────────────────────────
          if (url.startsWith("/api/valuation/dcf")) {
            const { dcfValuationService } = await import("./src/services/valuation/DCFValuationService.ts");
            const parsed = new URL(url, "http://localhost");
            const symbol = parsed.searchParams.get("symbol") ?? "";
            const price = Number(parsed.searchParams.get("price") ?? 0);
            if (!symbol) { res.statusCode = 400; res.end(JSON.stringify({ error: "symbol required" })); return; }
            const { getPersistedStockResearch } = await loadSnapshot(server);
            const synData = await getPersistedStockResearch(symbol.toUpperCase()).catch(() => null) || {};
            const revenue = (synData as any)?.revenue ?? 5000;
            const netMargin = (synData as any)?.netMargin ?? 0.10;
            const revenueGrowth = (synData as any)?.revenueGrowth ?? 12;
            const marketCap = (synData as any)?.marketCap ?? (price * 100000000);
            const de = (synData as any)?.debtToEquity ?? 0.5;
            const netDebt = marketCap * (de / (1 + de));
            const cashEq = marketCap * 0.05;
            const sharesOut = price > 0 ? marketCap / price : 100000000;
            const result = dcfValuationService.estimateFromFinancials(
              revenue * 10000000, netMargin, revenueGrowth / 100,
              marketCap * 10000000, netDebt * 10000000, cashEq * 10000000, sharesOut, price > 0 ? price : 100
            );
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, symbol, dcf: result }));
            return;
          }

          // ── Company Master ────────────────────────────────────
          if (url.startsWith("/api/company-master")) {
            const parsed = new URL(url, "http://localhost");
            const symbol = parsed.searchParams.get("symbol") ?? "";
            if (!symbol) { res.statusCode = 400; res.end(JSON.stringify({ error: "symbol required" })); return; }
            const { searchPersistedStocks } = await loadSnapshot(server);
            const results = await searchPersistedStocks(symbol, 1);
            const entry = results?.[0];
            if (!entry) { res.statusCode = 404; res.end(JSON.stringify({ error: "not_found" })); return; }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, symbol: entry.symbol, companyName: entry.name, sector: entry.sector, industry: entry.industry, exchange: entry.exchange }));
            return;
          }

          // ── Intelligence ──────────────────────────────────────
          if (url.startsWith("/api/intelligence")) {
            if (url.startsWith("/api/intelligence/stock")) {
              const parsed = new URL(url, "http://localhost");
              const symbol = parsed.searchParams.get("symbol") ?? "";
              if (!symbol) { res.statusCode = 400; res.end(JSON.stringify({ error: "symbol required" })); return; }
              const { getPersistedStockResearch } = await loadSnapshot(server);
              const synData = await getPersistedStockResearch(symbol.toUpperCase()).catch(() => null) || {};
              const { orchestrator } = await import("./src/services/intelligence/Orchestrator.ts");
              const inputs = {
                symbol: symbol.toUpperCase(),
                financial: { roe: (synData as any)?.roe, roa: (synData as any)?.roa, roic: (synData as any)?.roic, netMargin: (synData as any)?.netMargin, operatingMargin: (synData as any)?.operatingMargin, revenueGrowth: (synData as any)?.revenueGrowth, epsGrowth: (synData as any)?.epsGrowth, ebitdaGrowth: (synData as any)?.ebitdaGrowth, profitGrowth: (synData as any)?.profitGrowth, debtToEquity: (synData as any)?.debtToEquity, debtToAssets: (synData as any)?.debtToAssets, interestCoverage: (synData as any)?.interestCoverage, currentRatio: (synData as any)?.currentRatio, marketCap: (synData as any)?.marketCap, revenue: (synData as any)?.revenue, assetTurnover: (synData as any)?.assetTurnover, equityTurnover: (synData as any)?.equityTurnover, lastUpdated: new Date(), fiscalYear: 2025 },
                technical: { currentPrice: (synData as any)?.price ?? 0, rsi: (synData as any)?.rsi, ma50: (synData as any)?.ma50, ma200: (synData as any)?.ma200, priceChange1W: (synData as any)?.priceChange1W, priceChange1M: (synData as any)?.priceChange1M, priceChange3M: (synData as any)?.priceChange3M, priceChange6M: (synData as any)?.priceChange6M, priceChange1Y: (synData as any)?.priceChange1Y, volatility30: (synData as any)?.volatility30, volume: (synData as any)?.volume, lastUpdated: new Date(), period: "1D" },
                valuation: { peRatio: (synData as any)?.pe, pbRatio: (synData as any)?.pb, dividendYield: (synData as any)?.dividendYield, lastUpdated: new Date() },
                earnings: { history: [], currentGuidance: { epsGrowth: 0, revenueGrowth: 0 }, lastUpdated: new Date(), fiscalYear: 2025 },
                risk: { volatility: (synData as any)?.volatility, debtToEquity: (synData as any)?.debtToEquity, currentRatio: (synData as any)?.currentRatio, interestCoverage: (synData as any)?.interestCoverage, lastUpdated: new Date() },
                sector: { stockPE: (synData as any)?.pe, stockROE: (synData as any)?.roe, sectorName: (synData as any)?.sector, lastUpdated: new Date() },
                news: { articles: [], lastUpdated: new Date() },
                events: { events: [], lastUpdated: new Date(), fiscalYear: 2025,               currency: 'PKR'  },
                rag: { patterns: [], knowledgeItems: [], macroSignals: [], lastUpdated: new Date() },
              };
              const result = await orchestrator.analyzeStock(inputs);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ symbol: symbol.toUpperCase(), overallScore: result.overallScore, investmentState: result.investmentState, confidence: result.confidence, engines: result.engines, thesis: result.thesis, weights: result.weights, timestamp: result.timestamp.toISOString() }));
              return;
            }

            if (url.startsWith("/api/intelligence/health")) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true, status: 'ready', engines: ['financial', 'technical', 'valuation', 'risk', 'sector', 'news', 'earnings', 'event', 'rag'] }));
              return;
            }
          }

          // ── Market Stream ─────────────────────────────────────
          if (url.startsWith("/api/v1/market-stream")) {
            const { getPersistedStockResearch } = await loadSnapshot(server);
            const parts = url.split("/");
            const ticker = parts[parts.length - 1]?.toUpperCase() ?? "";
            if (!ticker) { res.statusCode = 400; res.end(JSON.stringify({ error: "ticker required" })); return; }
            const data = await getPersistedStockResearch(ticker).catch(() => null);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ticker, price: (data as any)?.price ?? 0, change: (data as any)?.change ?? 0, timestamp: new Date().toISOString() }));
            return;
          }

          // ── Chat ─────────────────────────────────────────────
          if (url.startsWith("/api/chat") && req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => body += chunk.toString());
            req.on("end", async () => {
              try {
                const msg = JSON.parse(body);
                const { DeterministicResearchProvider } = await import("./src/services/ai/DeterministicResearchProvider.ts");
                const provider = new DeterministicResearchProvider();
                const response = await provider.chat(msg.symbol ?? "", msg.message ?? "", msg.context ?? "");
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ response }));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }

        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: String(error) }));
          return;
        }

        next();
      });
    },
  };
}
