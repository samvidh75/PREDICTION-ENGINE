/**
 * Email Campaign Statistics
 * Get open rates, click rates, and performance metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock campaign stats (in production, fetch from database)
const campaignStats: Record<
  string,
  {
    sent: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    sentAt: number;
  }
> = {
  upgrade_premium: {
    sent: 45,
    opened: 18,
    clicked: 6,
    unsubscribed: 2,
    bounced: 1,
    sentAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  weekly_digest: {
    sent: 78,
    opened: 34,
    clicked: 12,
    unsubscribed: 1,
    bounced: 0,
    sentAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  feature_highlight: {
    sent: 120,
    opened: 52,
    clicked: 18,
    unsubscribed: 3,
    bounced: 2,
    sentAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  reengagement: {
    sent: 35,
    opened: 14,
    clicked: 5,
    unsubscribed: 1,
    bounced: 1,
    sentAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId } = req.query;

  try {
    if (!campaignId) {
      // Return all campaign stats
      const allStats = Object.entries(campaignStats).map(([id, stats]) => ({
        campaignId: id,
        ...stats,
        openRate: ((stats.opened / stats.sent) * 100).toFixed(1),
        clickRate: ((stats.clicked / stats.opened || 0) * 100).toFixed(1),
        conversionRate: ((stats.clicked / stats.sent) * 100).toFixed(1),
      }));

      return res.status(200).json({
        success: true,
        campaigns: allStats,
        totalSent: allStats.reduce((sum, c) => sum + c.sent, 0),
        totalOpened: allStats.reduce((sum, c) => sum + c.opened, 0),
        totalClicked: allStats.reduce((sum, c) => sum + c.clicked, 0),
      });
    }

    const stats = campaignStats[campaignId as string];
    if (!stats) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const openRate = ((stats.opened / stats.sent) * 100).toFixed(1);
    const clickRate = ((stats.clicked / stats.opened || 0) * 100).toFixed(1);
    const conversionRate = ((stats.clicked / stats.sent) * 100).toFixed(1);

    return res.status(200).json({
      success: true,
      campaignId,
      sent: stats.sent,
      opened: stats.opened,
      clicked: stats.clicked,
      unsubscribed: stats.unsubscribed,
      bounced: stats.bounced,
      openRate: parseFloat(openRate),
      clickRate: parseFloat(clickRate),
      conversionRate: parseFloat(conversionRate),
      sentAt: new Date(stats.sentAt).toISOString(),
    });
  } catch (error) {
    console.error('[Email Stats Error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
