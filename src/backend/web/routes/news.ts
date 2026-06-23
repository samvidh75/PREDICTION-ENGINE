import type { FastifyPluginAsync } from "fastify";
import { GoogleNewsRssProvider } from "../../../services/providers/GoogleNewsRssProvider";

const NEWS_CACHE_TTL = 12 * 60 * 60 * 1000;

interface CacheEntry {
  data: NewsItemResponse[];
  fetchedAt: number;
}

interface NewsItemResponse {
  headline: string;
  publisher: string;
  publishedAt: string;
  summary: string;
  whyItMatters: string;
  url: string;
  category: string;
}

const cache = new Map<string, CacheEntry>();

export const newsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/news/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ error: "A valid symbol is required.", code: "INVALID_SYMBOL" });
    }

    const clean = symbol.toUpperCase().trim();
    const cached = cache.get(clean);
    if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL) {
      return reply.send({ symbol: clean, items: cached.data, cachedAt: new Date(cached.fetchedAt).toISOString() });
    }

    try {
      const provider = new GoogleNewsRssProvider();
      const rawItems = await provider.getNews(clean);

      const items: NewsItemResponse[] = rawItems.map((item) => ({
        headline: item.title,
        publisher: item.source || "Google News",
        publishedAt: item.datetime,
        summary: item.summary || "",
        whyItMatters: "",
        url: item.url,
        category: "company",
      }));

      cache.set(clean, { data: items, fetchedAt: Date.now() });

      return reply.send({
        symbol: clean,
        items,
        cachedAt: new Date().toISOString(),
        cacheTtlHours: 12,
      });
    } catch (error) {
      return reply.send({
        symbol: clean,
        items: [],
        cachedAt: new Date().toISOString(),
        cacheTtlHours: 12,
        error: "News source temporarily unavailable",
      });
    }
  });
};
