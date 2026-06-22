import type { FastifyPluginAsync } from "fastify";
import { indianApiService } from "../../integrations/indianapi/IndianApiService";
import { unifiedMarketDataService } from "../../integrations/market/UnifiedMarketDataService";

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
