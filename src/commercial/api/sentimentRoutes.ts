/**
 * commercial/api/sentimentRoutes — Machine-Readable Sentiment Feed API.
 *
 * Public endpoint exposing the asset_news_sentiment_stream table for
 * the frontend SentimentRadar WebGPU widget.
 *
 * Route:
 *   GET /api/v1/corporate/sentiment-feed/:ticker — Recent headline stream
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { dbAdapter } from "../../db/DatabaseAdapter";

interface SentimentEntry {
  headline_text: string;
  source_origin: string;
  published_epoch: number;
}

interface Params {
  ticker: string;
}

export async function registerSentimentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: Params }>(
    "/api/v1/corporate/sentiment-feed/:ticker",
    async (req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) => {
      const symbol = req.params.ticker.toUpperCase().trim();

      try {
        const result = await dbAdapter.query(
          `SELECT headline_text, source_origin, published_epoch
           FROM asset_news_sentiment_stream
           WHERE ticker LIKE $1
           ORDER BY published_epoch DESC
           LIMIT 10`,
          [`${symbol}%`],
        );

        const feed = result.rows as SentimentEntry[];

        return reply.status(200).send({
          success: true,
          ticker: symbol,
          feed: Array.isArray(feed) ? feed : [],
        });
      } catch (err: any) {
        req.log.error({ err }, "Failed to query sentiment feed");
        return reply.status(500).send({
          success: false,
          error: "Failed to query sentiment feed database.",
        });
      }
    },
  );
}
