import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import type { Plugin, ViteDevServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const snapshotModule = path.resolve(root, "src/lib/stockResearchSnapshot.ts");

// Symbol aliases for common shortforms
const symbolAliases: Record<string, string> = {
  "HDFC": "HDFCBANK",
  "ICICI": "ICICIBANK",
  "AXIS": "AXISBANK",
  "KOTAK": "KOTAKBANK",
  "INDUSIND": "INDUSINDBK",
};

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
          // ── Health ──────────────────────────────────────────
          if (url.startsWith("/api/health")) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          // ── Search ──────────────────────────────────────────
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

          // ── Stock Detail (LIVE DATA FIRST, snapshot fallback) ──
          if (url.startsWith("/api/stock")) {
            const parsed = new URL(url, "http://localhost");
            let symbol = (parsed.searchParams.get("symbol") ?? decodeURIComponent(url.replace("/api/stock/", "").split("?")[0] ?? "")).toUpperCase();

            // Resolve symbol aliases
            symbol = symbolAliases[symbol] || symbol;

            const { getPersistedStockResearch } = await loadSnapshot(server);
            const research = await getPersistedStockResearch(symbol).catch(() => null) as any;

            // Fetch LIVE data via child_process (guaranteed to work in any Node.js context)
            let livePrice: any = null;
            let liveFundamentals: any = null;
            let liveHistory: any = null;
            let liveNews: any = null;
            let liveFinancials: any = null;
            let liveShareholding: any = null;
            let sourceLabel = 'snapshot';

            try {
              const script = path.resolve(root, 'scripts/fetch-yahoo-quote.cjs');
              const raw = execSync(`node "${script}" "${symbol}"`, { timeout: 15000, encoding: 'utf-8' });
              const parsed = JSON.parse(raw.trim());
              if (parsed.price) {
                livePrice = parsed;
                sourceLabel = 'yahoo';
              }
            } catch { /* yahoo script failed */ }

            if (livePrice) {
              // Layer 2: Real fundamentals via yfinance Python (most reliable)
              try {
                const script = path.resolve(root, 'scripts/fetch-python-fundamentals.cjs');
                const raw = execSync(`node "${script}" "${symbol}"`, { timeout: 25000, encoding: 'utf-8' });
                const parsed = JSON.parse(raw.trim());
                if (parsed.pe || parsed.pb || parsed.roe) {
                  liveFundamentals = parsed;
                }
              } catch { /* fundamentals script failed */ }

              // Fallback: snapshot fundamentals if yfinance failed
              if (!liveFundamentals && research) {
                liveFundamentals = {
                  pe: research.pe ?? null,
                  pb: research.pb ?? null,
                  eps: research.eps ?? null,
                  dividendYield: research.dividendYield ?? null,
                  roe: research.roe ?? null,
                  debtToEquity: research.debtToEquity ?? null,
                  revenueGrowth: research.revenueGrowth ?? null,
                };
              }

              try {
                const script = path.resolve(root, 'scripts/fetch-yahoo-history.cjs');
                const raw = execSync(`node "${script}" "${symbol}"`, { timeout: 15000, encoding: 'utf-8' });
                liveHistory = JSON.parse(raw.trim());
              } catch { /* history script failed */ }

              try {
                const script = path.resolve(root, 'scripts/fetch-yfinance-news.cjs');
                const raw = execSync(`node "${script}" "${symbol}"`, { timeout: 25000, encoding: 'utf-8' });
                liveNews = JSON.parse(raw.trim());
              } catch { /* yfinance news failed */
                try {
                  const script2 = path.resolve(root, 'scripts/fetch-yahoo-news.cjs');
                  const raw2 = execSync(`node "${script2}" "${symbol}"`, { timeout: 10000, encoding: 'utf-8' });
                  liveNews = JSON.parse(raw2.trim());
                } catch { /* yahoo news also failed */ }
              }

              // Layer 5: Real financial statements via yfinance Python
              try {
                const script = path.resolve(root, 'scripts/fetch-yfinance-financials.cjs');
                const raw = execSync(`node "${script}" "${symbol}"`, { timeout: 30000, encoding: 'utf-8' });
                const parsed = JSON.parse(raw.trim());
                if (parsed.financials?.annual?.revenue?.length || parsed.info?.revenue) {
                  liveFinancials = parsed.financials;
                }
              } catch { /* financials script failed */ }

              // Layer 6: Real shareholding via Screener.in scraper
              try {
                const script = path.resolve(root, 'scripts/screener-shareholding.cjs');
                const raw = execSync(`node "${script}" "${symbol}"`, { timeout: 20000, encoding: 'utf-8' });
                const parsed = JSON.parse(raw.trim());
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].promoter) {
                  liveShareholding = parsed;
                }
              } catch { /* shareholding script failed */ }
            }

            const useLive = livePrice !== null;
            const price = useLive ? livePrice.price : (research?.price ?? 0);
            const marketCapCr = useLive ? livePrice.marketCap : (research?.marketCap ?? 0);

            let dcf = null;
            try {
              const { dcfValuationService } = await import("./src/services/valuation/DCFValuationService.ts");
              const pe = useLive ? (liveFundamentals?.pe ?? 20) : (research?.pe ?? 20);
              const de = useLive ? (liveFundamentals?.debtToEquity ?? 0.5) : (research?.debtToEquity ?? 0.5);
              const roe = useLive ? (liveFundamentals?.roe ?? 10) : (research?.roe ?? 10);
              const revGrowth = useLive ? (liveFundamentals?.revenueGrowth ?? 12) / 100 : Math.max(0.02, (research?.revenueGrowth ?? 12) / 100);
              const netMargin = Math.max(0.02, roe / 500);
              const yfinanceRev = liveFundamentals?.revenue ? Math.round(liveFundamentals.revenue / 10000000) : 0;
              const annualRev = research?.financials?.annual?.revenue || [];
              const snapshotRev = annualRev.length > 0 ? annualRev[annualRev.length - 1].value : 0;
              const revenue = yfinanceRev || snapshotRev || Math.round((marketCapCr || 100000) / (pe / 10));
              const netDebt = (marketCapCr || 100000) * (de / (1 + de)) * 0.3;
              const cashEq = (marketCapCr || 100000) * 0.05;
              const sharesOut = price > 0 ? ((marketCapCr || 100000) * 10000000) / price : 100000000;
              const result = dcfValuationService.estimateFromFinancials(
                revenue * 10000000, netMargin, revGrowth,
                (marketCapCr || 100000) * 10000000, netDebt * 10000000, cashEq * 10000000, sharesOut, price
              );
              dcf = {
                fairValuePerShare: result.fairValuePerShare, currentPrice: result.currentPrice,
                upside: result.upside, assessment: result.assessment,
                impliedReturn: result.impliedReturn, enterpriseValue: result.enterpriseValue,
                equityValue: result.equityValue, terminalValue: result.terminalValue, years: result.years,
              };
            } catch { /* DCF optional */ }

            let priceHistory = research?.priceHistory || {};
            if (liveHistory && liveHistory.length > 0) {
              priceHistory = {
                '1W': liveHistory.slice(-7).map((p: any) => ({ label: p.date.slice(5), price: p.close })),
                '1M': liveHistory.slice(-30).map((p: any) => ({ label: p.date.slice(5), price: p.close })),
                '3M': liveHistory.slice(-90).map((p: any) => ({ label: p.date.slice(5), price: p.close })),
                '1Y': liveHistory.slice(-365).map((p: any) => ({ label: p.date.slice(5), price: p.close })),
                '5Y': liveHistory.map((p: any) => ({ label: p.date.slice(5), price: p.close })),
              };
            }

            const liveCompanyName = liveFundamentals?.companyName || research?.companyName || symbol;
            const liveSector = liveFundamentals?.sector || research?.sector || 'Diversified';
            const liveIndustry = liveFundamentals?.industry || research?.industry || 'General';
            const payload = {
              symbol: research?.symbol || symbol,
              companyName: liveCompanyName,
              exchange: 'NSE', sector: liveSector, industry: liveIndustry,
              price: { current: price, changeAbs: useLive ? livePrice.change : (research?.change ?? 0), changePercent: useLive ? livePrice.changePercent : (research?.changePercent ?? 0), marketCap: marketCapCr || (liveFundamentals?.marketCap ? Math.round(liveFundamentals.marketCap / 10000000 * 100) / 100 : null) },
              fundamentals: { pe: liveFundamentals?.pe ?? null, industryPe: research?.industryPe ?? null, pb: liveFundamentals?.pb ?? null, dividendYield: liveFundamentals?.dividendYield ?? null, eps: liveFundamentals?.eps ?? null },
              roe: liveFundamentals?.roe ?? null,
              debtToEquity: liveFundamentals?.debtToEquity ?? null,
              revenueGrowth: liveFundamentals?.revenueGrowth ?? null,
              profitGrowth: liveFundamentals?.profitGrowth ?? null,
              returnOnAssets: liveFundamentals?.returnOnAssets ?? null,
              rsi: research?.rsi ?? null,
              scores: research?.scores ?? null, confidenceMeter: research?.confidenceMeter ?? null,
              timeline: research?.timeline ?? null, whatChanged: research?.whatChanged ?? null,
              sectorRelative: research?.sectorRelative ?? null,
              description: research?.description || `${symbol} operates in the ${liveSector} sector.`,
              companyProfile: { founded: research?.founded || '', ceo: '', hq: 'India', employees: research?.employees || '', website: '', isin: '', businessSegments: research?.businessSegments || ['Diversified'] },
              priceHistory,
              financials: liveFinancials || research?.financials || null,
              shareholding: liveShareholding || research?.shareholding || null,
              news: liveNews || research?.news || [],
              thesis: research?.thesis || null,
              dataSources: { price: sourceLabel, fundamentals: liveFundamentals?.pe ? 'yfinance' : 'snapshot', history: liveHistory ? 'yahoo_finance' : 'snapshot', news: liveNews ? 'yfinance' : 'snapshot', financials: liveFinancials?.annual?.revenue?.length ? 'yfinance' : 'snapshot', shareholding: liveShareholding ? 'screener_in' : 'snapshot' },
              dcf,
            };

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
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
                events: { events: [], lastUpdated: new Date(), fiscalYear: 2025, currency: 'INR' },
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
