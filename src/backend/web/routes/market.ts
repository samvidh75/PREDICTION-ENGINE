import type { FastifyPluginAsync } from "fastify";
import { indianApiService } from "../../integrations/indianapi/IndianApiService";
import { unifiedMarketDataService } from "../../integrations/market/UnifiedMarketDataService";

function safeNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[₹,CrL%,\s]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const marketRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/market/stock/:symbol/summary", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();
    const result = await unifiedMarketDataService.getFullSnapshot(sym);
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Not enough information for this view yet." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial" };
  });

  app.get("/api/market/stock/:symbol/price", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = await indianApiService.getPrice(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Price context is not yet available." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial", cacheTtlSeconds: result.cacheTtlSeconds };
  });

  app.get("/api/market/stock/:symbol/profile", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = await indianApiService.getProfile(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Company profile is not yet available." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial" };
  });

  app.get("/api/market/stock/:symbol/fundamentals", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = indianApiService.getFundamentals(symbol.toUpperCase().trim());
    const enriched = unifiedMarketDataService.getFullSnapshot(symbol.toUpperCase().trim());
    const [base, snapshot] = await Promise.all([result, enriched]);
    const data = snapshot.data?.fundamentals ?? base.data;
    if (!data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Fundamental data is not yet available." });
    }
    return { ok: true, data, dataState: data.dataState ?? "partial" };
  });

  app.get("/api/market/stock/:symbol/shareholding", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const enriched = await unifiedMarketDataService.getFullSnapshot(symbol.toUpperCase().trim());
    const data = enriched.data?.shareholding;
    if (!data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Shareholding is not yet available." });
    }
    return { ok: true, data, dataState: data.dataState ?? "partial" };
  });

  app.get("/api/market/stock/:symbol/financials", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const { view } = request.query as { view?: string };
    const enriched = await unifiedMarketDataService.getFullSnapshot(symbol.toUpperCase().trim());
    const tables = enriched.data?.stockEdge?.financialTables ?? [];
    if (tables.length > 0) {
      return { ok: true, data: tables, dataState: "available", periodType: view || "quarterly" };
    }
    const result = await indianApiService.getFinancials(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Financial statements are not yet available." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial", periodType: view || "quarterly" };
  });

  app.get("/api/market/stock/:symbol/full", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = await unifiedMarketDataService.getFullSnapshot(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Not enough information for this view yet." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial" };
  });

  app.get("/api/stock/:symbol", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();
    try {
      const [priceResult, profileResult, fundaResult, ssResult, indiaRawResult] = await Promise.all([
        indianApiService.getPrice(sym).catch(() => ({ ok: false, data: null } as any)),
        indianApiService.getProfile(sym).catch(() => ({ ok: false, data: null } as any)),
        indianApiService.getFundamentals(sym).catch(() => ({ ok: false, data: null } as any)),
        fetch(`${process.env.RAILWAY_URL || "https://prediction-engine-production-f7a8.up.railway.app"}/api/stockstory/${sym}`)
          .then(r => r.ok ? r.json() : null).catch(() => null) as any,
        fetch(`https://stock.indianapi.in/stock?name=${encodeURIComponent(sym)}`, {
          headers: { "X-API-KEY": process.env.INDIANAPI_KEY || "" },
        }).then(r => r.ok ? r.json() : null).catch(() => null) as any,
      ]);
      const price = priceResult?.data ?? null;
      const profile = profileResult?.data ?? null;
      const fundamentals = fundaResult?.data ?? null;
      const stockstoryData = ssResult?.data ?? null;
      const indiaRaw = indiaRawResult ?? null;

      const hasAnyData = price || profile || fundamentals || stockstoryData;
      const dataCompleteness = stockstoryData ? 0.6 : (hasAnyData ? 0.3 : 0.0);

      return {
        symbol: sym,
        price: {
          current: price?.price ?? null,
          change: price?.change ?? null,
          changeAbs: price?.changePercent ?? null,
          open: price?.open ?? null,
          high: price?.high ?? null,
          low: price?.low ?? null,
          volume: price?.volume ?? null,
          weekHigh52: price?.week52High ?? null,
          weekLow52: price?.week52Low ?? null,
          marketCap: (price?.marketCap ?? profile?.marketCap)
            ? (price?.marketCap ?? profile?.marketCap ?? 0) * 10000000
            : null,
          exchange: profile?.exchange ?? "NSE",
          companyName: profile?.companyName ?? sym,
          sector: profile?.sector ?? stockstoryData?.sector ?? null,
          industry: profile?.industry ?? null,
          description: profile?.description ?? null,
          website: profile?.website ?? null,
          error: null,
        },
        fundamentals: {
          peRatio: fundamentals?.peRatio ?? null,
          pbRatio: fundamentals?.pbRatio ?? null,
          roe: fundamentals?.roe ?? null,
          roce: fundamentals?.roce ?? null,
          dividendYield: fundamentals?.dividendYield ?? null,
          eps: fundamentals?.eps ?? null,
          debtToEquity: fundamentals?.debtToEquity ?? null,
          currentRatio: fundamentals?.currentRatio ?? null,
          revenueGrowth: fundamentals?.salesGrowth ?? null,
          profitGrowth: fundamentals?.profitGrowth ?? null,
          marketCap: profile?.marketCap ?? null,
          error: null,
        },
        health: stockstoryData ? {
          score: stockstoryData.healthScore ?? null,
          classification: stockstoryData.classification ?? null,
          confidence: stockstoryData.confidence ?? null,
          sector: stockstoryData.sector ?? null,
        } : null,
        annualFinancials: (() => {
          const raw = indiaRaw?.financials ?? [];
          if (!Array.isArray(raw) || raw.length === 0) return [];
          const entries: Array<{ fiscalYear: string; revenue: number | null; pat: number | null; operatingProfit: number | null }> = [];
          for (const entry of raw) {
            if (entry.Type !== "Annual") continue;
            const fy = entry.FiscalYear;
            if (!fy) continue;
            const inc = entry.stockFinancialMap?.INC ?? [];
            const revenue = inc.find((i: any) => /^revenue$/i.test(i.key || "") || /^(total\s+)?revenue$/i.test((i.displayName||"").trim()));
            const netIncome = inc.find((i: any) => /^net\s*income$/i.test(i.key || "") || /^net\s*income$/i.test((i.displayName||"").trim()));
            const opIncome = inc.find((i: any) => /^operating\s*income$/i.test(i.key || "") || /^operating\s*income$/i.test((i.displayName||"").trim()));
            entries.push({
              fiscalYear: `FY${fy}`,
              revenue: revenue ? safeNum(revenue.value) : null,
              pat: netIncome ? safeNum(netIncome.value) : null,
              operatingProfit: opIncome ? safeNum(opIncome.value) : null,
            });
          }
          return entries.sort((a: any, b: any) => a.fiscalYear.localeCompare(b.fiscalYear));
        })(),
        historical: { closes: [], highs: [], lows: [], timestamps: [], error: null },
        dataCompleteness,
        fetchedAt: new Date().toISOString(),
        errors: [],
      };
    } catch (err: any) {
      return {
        symbol: sym,
        price: { current: null, change: null, changeAbs: null, open: null, high: null, low: null, volume: null, weekHigh52: null, weekLow52: null, marketCap: null, exchange: "NSE", companyName: sym, sector: null, industry: null, description: null, website: null, error: null },
        fundamentals: { peRatio: null, pbRatio: null, roe: null, roce: null, dividendYield: null, eps: null, debtToEquity: null, currentRatio: null, revenueGrowth: null, profitGrowth: null, marketCap: null, error: null },
        health: null,
        historical: { closes: [], highs: [], lows: [], timestamps: [], error: null },
        dataCompleteness: 0.0,
        fetchedAt: new Date().toISOString(),
        errors: [],
      };
    }
  });

  app.get("/api/market/stock/:symbol/enrichment", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = await unifiedMarketDataService.getFullSnapshot(symbol.toUpperCase().trim());
    if (!result.data?.stockEdge) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Additional research context is not yet available." });
    }
    return {
      ok: true,
      dataState: result.data.dataState,
      enrichment: result.data.enrichment,
      data: result.data.stockEdge,
    };
  });
};

export default marketRoutes;
