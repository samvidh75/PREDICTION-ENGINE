import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { trendlyneAdapter, type TrendlyneWidgetKind } from "../../integrations/trendlyne/TrendlyneAdapter";

const VALID_WIDGETS = new Set<TrendlyneWidgetKind>(["technicals", "checklist", "ipo"]);

function publicReason(statusCode: string): string {
  switch (statusCode) {
    case "TRENDLYNE_READY":
      return "available";
    case "TRENDLYNE_EMBED_NOT_ALLOWED":
    case "TRENDLYNE_DISABLED":
      return "not_configured";
    case "TRENDLYNE_INVALID_CONFIG":
    case "TRENDLYNE_WIDGET_URL_INVALID":
      return "unavailable";
    default:
      return "unavailable";
  }
}

const trendlyneRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/api/integrations/trendlyne/status", async (_request, reply) => {
    const status = trendlyneAdapter.getStatus();
    return reply.send({
      available: status.ok,
      widgetMode: status.ok ? status.widgetMode : "disabled",
      reason: publicReason(status.statusCode),
      widgets: status.ok ? status.availableWidgets.map((widget) => ({ kind: widget.kind, needsSymbol: widget.needsSymbol })) : [],
      updatedAt: new Date().toISOString(),
    });
  });

  app.get("/api/integrations/trendlyne/widget/:kind/:symbol", async (request, reply) => {
    const params = request.params as { kind?: string; symbol?: string };
    const kind = params.kind as TrendlyneWidgetKind;
    if (!VALID_WIDGETS.has(kind)) {
      return reply.status(400).send({ available: false, reason: "unavailable", updatedAt: new Date().toISOString() });
    }

    const result = trendlyneAdapter.getWidget(kind, params.symbol);
    if (!result.available) {
      return reply.send({
        available: false,
        kind,
        symbol: result.symbol,
        widgetMode: "disabled",
        widgetUrl: null,
        reason: publicReason(result.statusCode),
        updatedAt: result.updatedAt,
      });
    }

    return reply.send({
      available: true,
      kind,
      symbol: result.symbol,
      widgetMode: result.widgetMode,
      widgetUrl: result.widgetUrl,
      reason: "available",
      updatedAt: result.updatedAt,
    });
  });
};

export default trendlyneRoutes;
