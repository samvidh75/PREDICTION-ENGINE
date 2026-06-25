import type { VercelRequest, VercelResponse } from "@vercel/node";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  link: string;
  snippet: string;
  isAd?: boolean;
  adLink?: string;
  adLabel?: string;
}

const NEWS_CACHE = new Map<string, { items: NewsItem[]; expiresAt: number }>();
const NEWS_CACHE_TTL = 12 * 60 * 60 * 1000;

const ADS = [
  { title: "Track your portfolio in real-time", source: "StockStory", snippet: "Connect your broker and get personalised insights, health scores, and smart alerts.", adLink: "/upgrade", adLabel: "Try Pro" },
  { title: "Never miss a market move", source: "StockStory", snippet: "Set price alerts and get instant notifications when your stocks cross key levels.", adLink: "/upgrade", adLabel: "Set Alerts" },
  { title: "AI-powered stock analysis", source: "StockStory", snippet: "Get deep fundamental analysis, health scores, and fair value estimates for 500+ NSE stocks.", adLink: "/upgrade", adLabel: "Explore" },
  { title: "Compare stocks like a pro", source: "StockStory", snippet: "Side-by-side comparison of financials, ratios, and growth trends across any stocks.", adLink: "/upgrade", adLabel: "Compare" },
  { title: "Earnings calendar & watchlist", source: "StockStory", snippet: "Track upcoming earnings, board meetings, and dividend dates for your watchlist stocks.", adLink: "/upgrade", adLabel: "Track" },
  { title: "Expert-curated stock screeners", source: "StockStory", snippet: "Screen stocks by PE, ROE, ROCE, debt ratios, and 50+ other fundamental parameters.", adLink: "/upgrade", adLabel: "Screen" },
  { title: "Institutional-grade research", source: "StockStory", snippet: "Access institutional-quality research reports with fair value estimates and risk ratings.", adLink: "/upgrade", adLabel: "Explore" },
  { title: "Sector & peer analysis", source: "StockStory", snippet: "Understand how a stock stacks up against its peers and sector with visual benchmarks.", adLink: "/upgrade", adLabel: "Analyse" },
  { title: "Dividend tracker & income planner", source: "StockStory", snippet: "Track dividend history, yields, and build a passive income plan for your portfolio.", adLink: "/upgrade", adLabel: "Track Dividends" },
  { title: "Smart trading strategies", source: "StockStory", snippet: "Get data-backed trading strategies and technical insights for smarter entry/exit decisions.", adLink: "/upgrade", adLabel: "View Strategies" },
];

function interleaveAds(news: NewsItem[], count: number = 10): NewsItem[] {
  const result: NewsItem[] = [];
  let adIndex = 0;
  for (let i = 0; i < count && (i < news.length || adIndex < ADS.length); i++) {
    if (i > 0 && i % 4 === 0 && adIndex < ADS.length) {
      const ad = ADS[adIndex++];
      result.push({
        title: ad.title,
        source: ad.source,
        date: new Date().toISOString().split("T")[0],
        link: ad.adLink,
        snippet: ad.snippet,
        isAd: true,
        adLink: ad.adLink,
        adLabel: ad.adLabel,
      });
    }
    const newsIdx = i - adIndex;
    if (newsIdx < news.length) {
      result.push(news[newsIdx]);
    }
  }
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const cached = NEWS_CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=3600");
    return res.status(200).json({ symbol, items: cached.items, cachedAt: new Date(cached.expiresAt - NEWS_CACHE_TTL).toISOString() });
  }

  const rawItems: NewsItem[] = [];
  const seen = new Set<string>();

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol + " stock NSE India")}&hl=en-IN&gl=IN`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const xml = await response.text();

      const titles: string[] = [];
      const links: string[] = [];

      const titleRegex = /<title>(.*?)<\/title>/g;
      let m: RegExpExecArray | null;
      while ((m = titleRegex.exec(xml)) !== null) {
        const t = m[1].trim();
        if (!t || t.includes("Google News")) continue;
        if (titles.length > 15) break;
        titles.push(t);
      }

      const linkRegex = /<link>(.*?)<\/link>/g;
      while ((m = linkRegex.exec(xml)) !== null) {
        const l = m[1].trim();
        if (l && !l.includes("google.com/news")) links.push(l);
        if (links.length > 15) break;
      }

      titles.forEach((title, i) => {
        const dedupKey = title.toLowerCase().trim().slice(0, 60);
        if (seen.has(dedupKey) || rawItems.length >= 10) return;
        seen.add(dedupKey);

        const sourceMatch = title.match(/[-–—|]\s*(.*?)(\s*[-–—|]\s*|$)/);
        const source = sourceMatch ? sourceMatch[1].trim() : "News";
        const cleanTitle = title.replace(/[-–—|].*$/, "").trim();

        rawItems.push({
          title: cleanTitle,
          source,
          date: new Date().toISOString().split("T")[0],
          link: links[i] || "#",
          snippet: "",
        });
      });
    }
  } catch {}

  const items = interleaveAds(rawItems);

  NEWS_CACHE.set(symbol, { items, expiresAt: Date.now() + NEWS_CACHE_TTL });

  res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=3600");
  return res.status(200).json({ symbol, items, cachedAt: new Date().toISOString() });
}
