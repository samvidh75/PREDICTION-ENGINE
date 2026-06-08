/**
 * TRACK-95Q — Attention API
 * GET /api/intelligence/attention
 * 
 * Returns prioritized attention items from AttentionEngine.
 * Every item is a real prediction_registry diff (today vs yesterday).
 * Zero synthetic generation.
 */
import type { FastifyPluginAsync } from "fastify";
import { attentionEngine } from "../../../../intelligence/AttentionEngine";

export const attentionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/intelligence/attention", async (request, reply) => {
    const query = request.query as {
      limit?: string;
      userId?: string;
    };

    const limit = query.limit ? parseInt(query.limit, 10) : 18;
    const userId = query.userId?.trim() || "";

    try {
      let items;
      if (userId) {
        items = attentionEngine.generate(userId);
      } else {
        items = attentionEngine.generateMarketWide();
      }

      // Split by priority
      const critical = items
        .filter((i) => i.priority === "critical")
        .slice(0, 3)
        .map(serialize);
      const important = items
        .filter((i) => i.priority === "important")
        .slice(0, 5)
        .map(serialize);
      const monitor = items
        .filter((i) => i.priority === "monitor")
        .slice(0, Math.max(0, limit - critical.length - important.length))
        .map(serialize);

      return reply.send({
        generatedAt: new Date().toISOString(),
        totalSymbolsAnalyzed: items.length,
        critical,
        important,
        monitor,
      });
    } catch (err: any) {
      console.error("[attention] Error:", err?.message ?? err);
      return reply.status(500).send({
        error: "Failed to generate attention items.",
        detail: err?.message ?? "Unknown error",
      });
    }
  });
};

function serialize(item: any) {
  return {
    symbol: item.symbol,
    priority: item.priority,
    title: item.title,
    detail: item.reason,
    explanation: item.reason,
    delta: item.delta,
    confidence: item.confidence,
    action: "View stock",
    actionUrl: item.destinationUrl,
    source: item.source,
  };
}

export default attentionRoutes;
