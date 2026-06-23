import type { FastifyPluginAsync } from "fastify";
import { GoogleNewsRssProvider } from "../../../services/providers/GoogleNewsRssProvider";
import { sanitizeTitle, sanitizeSummary, sanitizeNewsItems } from "../../services/news/NewsSanitizer";

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

      const seenHeadlines = new Set<string>();
      const items: NewsItemResponse[] = [];

      for (const item of rawItems) {
        const headline = sanitizeTitle(item.title || "");
        const publisher = sanitizeTitle(item.source || "News");
        const summary = sanitizeSummary(item.summary || "");

        const dedupKey = headline.toLowerCase().trim();
        if (!headline || seenHeadlines.has(dedupKey)) continue;
        seenHeadlines.add(dedupKey);

        items.push({
          headline,
          publisher: publisher || "News",
          publishedAt: item.datetime || "",
          summary: summary || "",
          whyItMatters: "",
          url: item.url || "",
          category: "company",
        });

        if (items.length >= 20) break;
      }

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
