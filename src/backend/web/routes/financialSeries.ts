import type { FastifyPluginAsync } from "fastify";
import { getFinancialSeries } from "../../services/financials/FinancialSeriesService";

export const financialSeriesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/financial-series/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ error: "A valid symbol is required.", code: "INVALID_SYMBOL" });
    }

    const { periodType } = req.query as { periodType?: string };
    const clean = symbol.toUpperCase().trim();

    try {
      const result = await getFinancialSeries(clean, {
        periodType: periodType === "quarterly" ? "quarterly" : "annual",
      });

      let series = result.series;
      if (periodType === "quarterly") {
        series = series.filter((s) => s.periodType === "quarterly");
      } else {
        series = series.filter((s) => s.periodType === "annual");
      }

      return reply.send({
        symbol: clean,
        series,
        source: result.source,
        updatedAt: new Date().toISOString(),
        cacheTtlHours: 12,
      });
    } catch {
      return reply.send({
        symbol: clean,
        series: [],
        source: "unavailable",
        updatedAt: new Date().toISOString(),
        cacheTtlHours: 12,
      });
    }
  });
};
