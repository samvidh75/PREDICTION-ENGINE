import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { usageLimits } from "../UsageLimits";

interface AnalyticsDashboardResponse {
  server: {
    uptime: number;
    startTime: string;
  };
  usage: {
    apiCallsPerHour: { allowed: number; used: number };
    searchesPerDay: { allowed: number; used: number };
    stockViewsPerDay: { allowed: number; used: number };
    exportActionsPerDay: { allowed: number; used: number };
  };
  llm: {
    totalCalls: number;
    successRate: number;
    avgLatencyMs: number;
    totalCost: number;
  };
  subscriptions: {
    totalActive: number;
    byTier: { free: number; plus: number; pro: number };
  };
  billing: {
    totalTransactions: number;
    totalRevenue: number;
  };
}

export async function registerAnalyticsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/api/v1/analytics/dashboard",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const { dbAdapter } = await import("../../db/DatabaseAdapter");

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        const llmResult = await dbAdapter.query(
          `SELECT
            COUNT(*)::int as total_calls,
            COALESCE(AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END), 0) as success_rate,
            COALESCE(AVG(latency_ms), 0) as avg_latency_ms,
            COALESCE(SUM(cost_estimate), 0) as total_cost
          FROM llm_call_logs
          WHERE created_at >= $1`,
          [twentyFourHoursAgo],
        );

        const llmRow = llmResult.rows?.[0] || {};

        const subResult = await dbAdapter.query(
          `SELECT
            COUNT(*)::int as total_active,
            COALESCE(SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END), 0)::int as free_count,
            COALESCE(SUM(CASE WHEN tier = 'plus' THEN 1 ELSE 0 END), 0)::int as plus_count,
            COALESCE(SUM(CASE WHEN tier = 'pro' THEN 1 ELSE 0 END), 0)::int as pro_count
          FROM user_subscriptions
          WHERE status = 'active'`,
        );

        const subRow = subResult.rows?.[0] || {};

        const billingResult = await dbAdapter.query(
          `SELECT
            COUNT(*)::int as total_transactions,
            COALESCE(SUM(amount), 0)::int as total_revenue
          FROM billing_transactions
          WHERE status = 'captured'`,
        );

        const billingRow = billingResult.rows?.[0] || {};

        const uid = (req as any).uid ?? "anonymous";
        const entitlements = null;
        const usage = {
          apiCallsPerHour: usageLimits.peek(uid, "api_calls_per_hour", entitlements),
          searchesPerDay: usageLimits.peek(uid, "searches_per_day", entitlements),
          stockViewsPerDay: usageLimits.peek(uid, "stock_views_per_day", entitlements),
          exportActionsPerDay: usageLimits.peek(uid, "export_actions_per_day", entitlements),
        };

        return reply.send({
          success: true,
          data: {
            server: {
              uptime: Math.floor(process.uptime()),
              startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
            },
            usage,
            llm: {
              totalCalls: Number(llmRow.total_calls ?? 0) as number,
              successRate: Number(llmRow.success_rate ?? 0) as number,
              avgLatencyMs: Math.round(Number(llmRow.avg_latency_ms ?? 0)) as number,
              totalCost: Number(llmRow.total_cost ?? 0) as number,
            },
            subscriptions: {
              totalActive: Number(subRow.total_active ?? 0) as number,
              byTier: {
                free: Number(subRow.free_count ?? 0) as number,
                plus: Number(subRow.plus_count ?? 0) as number,
                pro: Number(subRow.pro_count ?? 0) as number,
              },
            },
            billing: {
              totalTransactions: Number(billingRow.total_transactions ?? 0) as number,
              totalRevenue: Number(billingRow.total_revenue ?? 0) as number,
            },
          },
        } satisfies { success: boolean; data: AnalyticsDashboardResponse });
      } catch (err) {
        req.log.error({ err }, "Analytics dashboard query failed");
        return reply.status(500).send({ success: false, error: "Analytics dashboard query failed" });
      }
    },
  );
}
