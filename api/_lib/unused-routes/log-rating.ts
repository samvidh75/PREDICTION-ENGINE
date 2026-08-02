/**
 * Log User Feedback on LLM Responses
 * Tracks quality and helps optimize routing
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RatingLog {
  messageId: string;
  question: string;
  response: string;
  modelUsed: string;
  rating: 'helpful' | 'not-helpful';
  timestamp: string;
}

// In-memory storage (replace with database in production)
const ratings: RatingLog[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messageId, question, response, modelUsed, rating, timestamp } = req.body as RatingLog;

  if (!messageId || !rating || !modelUsed) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const log: RatingLog = {
      messageId,
      question: question || 'N/A',
      response: response?.substring(0, 200) || 'N/A', // Only first 200 chars
      modelUsed,
      rating,
      timestamp: timestamp || new Date().toISOString(),
    };

    ratings.push(log);

    // Log to console for now (would go to database/analytics service)
    console.log(`[Rating] ${modelUsed} - ${rating}`, {
      question: log.question.substring(0, 50),
      timestamp: log.timestamp,
    });

    return res.status(200).json({
      success: true,
      totalRatings: ratings.length,
      stats: {
        tier1Helpful: ratings.filter(
          (r) => r.modelUsed.includes('0.5b') && r.rating === 'helpful'
        ).length,
        tier2Helpful: ratings.filter(
          (r) => r.modelUsed.includes('1b') && r.rating === 'helpful'
        ).length,
        tier3Helpful: ratings.filter(
          (r) => r.modelUsed.includes('groq') && r.rating === 'helpful'
        ).length,
      },
    });
  } catch (error) {
    console.error('[Rating Log Error]', error);
    return res.status(500).json({ error: 'Failed to log rating' });
  }
}
