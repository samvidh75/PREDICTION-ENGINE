/**
 * Get Users by Subscription Tier
 * Returns list of user emails for targeting campaigns
 * Uses in-memory storage initially (swap with DB later)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// In production, fetch from database
// For now, use IndexedDB from browser or mock data
const mockUsers = {
  free: [
    { email: 'user1@example.com', userId: 'user1', lastActive: Date.now() },
    { email: 'user2@example.com', userId: 'user2', lastActive: Date.now() - 7 * 24 * 60 * 60 * 1000 },
    { email: 'user3@example.com', userId: 'user3', lastActive: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  ],
  premium: [
    { email: 'premium1@example.com', userId: 'premium1', lastActive: Date.now() },
    { email: 'premium2@example.com', userId: 'premium2', lastActive: Date.now() },
  ],
  pro: [
    { email: 'pro1@example.com', userId: 'pro1', lastActive: Date.now() },
  ],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tier = 'free', inactive = false } = req.query;

  try {
    let users = mockUsers[tier as keyof typeof mockUsers] || [];

    // Filter inactive users (no activity in last 30 days)
    if (inactive === 'true') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      users = users.filter((u) => u.lastActive < thirtyDaysAgo);
    }

    // Extract emails for campaign sending
    const emails = users.map((u) => u.email);

    console.log(`[Get Users] tier=${tier}, count=${users.length}, inactive=${inactive}`);

    return res.status(200).json({
      success: true,
      tier,
      count: users.length,
      users,
      emails,
    });
  } catch (error) {
    console.error('[Get Users Error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
