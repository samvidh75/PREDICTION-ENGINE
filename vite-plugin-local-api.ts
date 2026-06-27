import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const snapshotModule = path.resolve(root, "src/lib/stockResearchSnapshot.ts");

async function loadSnapshot(server: ViteDevServer) {
  return server.ssrLoadModule(snapshotModule) as Promise<typeof import("./src/lib/stockResearchSnapshot")>;
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
          if (url.startsWith("/api/search")) {
            const parsed = new URL(url, "http://localhost");
            const query = parsed.searchParams.get("q") ?? "";
            const limit = Number(parsed.searchParams.get("limit") ?? 20);
            const { searchPersistedStocks, getPersistedUniverseCount } = await loadSnapshot(server);
            const results = await searchPersistedStocks(query, limit);
            const totalUniverse = await getPersistedUniverseCount();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ query, totalUniverse, results }));
            return;
          }

          if (url.startsWith("/api/stock/")) {
            const symbol = decodeURIComponent(url.replace("/api/stock/", "").split("?")[0] ?? "");
            const { getPersistedStockResearch } = await loadSnapshot(server);
            const research = await getPersistedStockResearch(symbol);
            if (!research) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "not_found", symbol }));
              return;
            }

            const payload = {
              symbol: research.symbol,
              companyName: research.companyName,
              exchange: research.exchangeBadge,
              sector: research.sector,
              industry: research.industry,
              price: {
                current: research.price,
                changeAbs: research.change,
                changePercent: research.changePercent,
                marketCap: research.marketCap,
              },
              fundamentals: {
                pe: research.pe,
                industryPe: research.industryPe,
                pb: research.pb,
                dividendYield: research.dividendYield,
                eps: research.eps,
              },
              roe: research.roe,
              debtToEquity: research.debtToEquity,
              revenueGrowth: research.revenueGrowth,
              profitGrowth: research.profitGrowth,
              rsi: research.rsi,
              scores: research.scores,
              confidenceMeter: research.confidenceMeter,
              timeline: research.timeline,
              whatChanged: research.whatChanged,
              sectorRelative: research.sectorRelative,
              description: research.description,
              companyProfile: {
                founded: research.founded,
                ceo: research.ceo,
                hq: research.hq,
                employees: research.employees,
                website: research.website,
                isin: research.isin,
                businessSegments: research.businessSegments,
              },
              priceHistory: research.priceHistory,
              financials: research.financials,
              shareholding: research.shareholding,
              news: research.news,
              thesis: research.thesis,
            };

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
            return;
          }

          if (url.startsWith("/api/health")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
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
