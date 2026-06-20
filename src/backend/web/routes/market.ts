import type { FastifyPluginAsync } from "fastify";
import { indianApiService } from "../../integrations/indianapi/IndianApiService";

const marketRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/market/stock/:symbol/summary", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const sym = symbol.toUpperCase().trim();
    const result = await indianApiService.getFullSnapshot(sym);
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
    const result = await indianApiService.getFundamentals(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Fundamental data is not yet available." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial" };
  });

  app.get("/api/market/stock/:symbol/shareholding", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = await indianApiService.getShareholding(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Shareholding is not yet available." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial" };
  });

  app.get("/api/market/stock/:symbol/financials", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const { view } = request.query as { view?: string };
    const result = await indianApiService.getFinancials(symbol.toUpperCase().trim());
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Financial statements are not yet available." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial", periodType: view || "quarterly" };
  });

  app.get("/api/market/stock/:symbol/full", async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const { include } = request.query as { include?: string };
    const layers = include ? include.split(",").map((l) => l.trim()) as any[] : undefined;
    const result = await indianApiService.getFullSnapshot(symbol.toUpperCase().trim(), layers);
    if (!result.ok && !result.data) {
      return reply.status(404).send({ ok: false, dataState: "partial", message: "Not enough information for this view yet." });
    }
    return { ok: true, data: result.data, dataState: result.data?.dataState ?? "partial" };
  });
};

export default marketRoutes;
