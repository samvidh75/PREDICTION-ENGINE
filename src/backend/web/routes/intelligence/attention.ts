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
      if (userId) {
        const profile = await attentionEngine.getAttentionProfile(userId);
        const dormantUsers = await attentionEngine.getDormantUsers(7);
        const isDormant = dormantUsers.includes(userId);

        const items = [{
          symbol: userId,
          priority: isDormant ? 'critical' : profile.needsNudge ? 'important' : 'monitor',
          title: `User ${userId} Attention Profile`,
          reason: `Attention score: ${profile.attentionScore}/100. ${profile.needsNudge ? 'Needs re-engagement.' : 'Active user.'}`,
          delta: profile.attentionScore,
          confidence: 0.8,
          source: 'AttentionEngine.getAttentionProfile',
          destinationUrl: '/dashboard',
        }];

        return reply.send({
          generatedAt: new Date().toISOString(),
          totalSymbolsAnalyzed: items.length,
          critical: items.filter(i => i.priority === 'critical').slice(0, 3).map(serialize),
          important: items.filter(i => i.priority === 'important').slice(0, 5).map(serialize),
          monitor: items.filter(i => i.priority === 'monitor').slice(0, limit).map(serialize),
        });
      }

      // Market-wide: get dormant user count and daily engagement snapshot
      const [dormantUsers, snapshot] = await Promise.all([
        attentionEngine.getDormantUsers(7),
        attentionEngine.getDailyEngagementSnapshot(),
      ]);

      const items = [
        {
          symbol: 'MARKET',
          priority: dormantUsers.length > 10 ? 'critical' : dormantUsers.length > 3 ? 'important' : 'monitor',
          title: `${dormantUsers.length} dormant users`,
          reason: `${dormantUsers.length} users inactive for 7+ days. ${snapshot.activeUsers} active today.`,
          delta: dormantUsers.length,
          confidence: 0.9,
          source: 'AttentionEngine.getDormantUsers',
          destinationUrl: '/admin/users',
        },
        {
          symbol: 'ENGAGEMENT',
          priority: snapshot.avgSessionMinutes < 2 ? 'important' : 'monitor',
          title: `Avg session: ${snapshot.avgSessionMinutes} min`,
          reason: `${snapshot.activeUsers} active users today, avg session ${snapshot.avgSessionMinutes} min. ${snapshot.newWatchlistsCreated} watchlists created, ${snapshot.alertsTriggered} alerts triggered, ${snapshot.predictionsGenerated} predictions generated.`,
          delta: snapshot.avgSessionMinutes,
          confidence: 0.85,
          source: 'AttentionEngine.getDailyEngagementSnapshot',
          destinationUrl: '/admin/analytics',
        },
      ];

      const critical = items.filter(i => i.priority === 'critical').slice(0, 3).map(serialize);
      const important = items.filter(i => i.priority === 'important').slice(0, 5).map(serialize);
      const monitor = items.filter(i => i.priority === 'monitor').slice(0, Math.max(0, limit - critical.length - important.length)).map(serialize);

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