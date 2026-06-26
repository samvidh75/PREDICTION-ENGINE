import type { VercelRequest, VercelResponse } from "@vercel/node";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  link: string;
  snippet: string;
}

interface AdItem {
  title: string;
  body: string;
  link: string;
  sponsor: string;
}

const NEWS_CACHE = new Map<string, { items: (NewsItem | AdItem)[]; expiresAt: number }>();
const NEWS_CACHE_TTL = 30 * 60 * 1000;

const BROKER_ADS: AdItem[] = [
  { title: "Invest in stocks with Zerodha", body: "Open a free Demat account in minutes. Flat ₹20 per trade.", link: "https://zerodha.com/open-account", sponsor: "Zerodha" },
  { title: "Groww — India's fastest growing investment app", body: "Start SIP in mutual funds and stocks. Zero commission.", link: "https://groww.in", sponsor: "Groww" },
  { title: "Angel One — Smart trading platform", body: "Get 3-in-1 account. ₹0 brokerage for first 30 days.", link: "https://angelone.in", sponsor: "Angel One" },
  { title: "Upstox — Trade smarter with Rs 0 brokerage", body: "Free Demat account. Advanced charting and analytics.", link: "https://upstox.com", sponsor: "Upstox" },
  { title: "5Paisa — Low-cost investing for everyone", body: "Open Demat account with ₹0 AMC charges. Flat ₹10 per trade.", link: "https://www.5paisa.com", sponsor: "5Paisa" },
  { title: "ICICI Direct — India's No. 1 trading platform", body: "Integrated banking and trading. Research reports included.", link: "https://www.icicidirect.com", sponsor: "ICICI Direct" },
  { title: "HDFC Sky — Trade from HDFC Bank", body: "Seamless integration with HDFC Bank. Expert recommendations.", link: "https://sky.hdfc.com", sponsor: "HDFC Sky" },
  { title: "Motilal Oswal — Research-backed investing", body: "Get expert stock recommendations and Portfolio Manager services.", link: "https://www.motilaloswal.com", sponsor: "Motilal Oswal" },
  { title: "Kotak Securities — Trusted since decades", body: "Open Demat account online. Get research reports and trading calls.", link: "https://www.kotaksecurities.com", sponsor: "Kotak Securities" },
  { title: "Sharekhan — Invest with confidence", body: "Free Demat + Trading account. 15+ years of brokerage expertise.", link: "https://www.sharekhan.com", sponsor: "Sharekhan" },
];

function getDeterministicAdIndex(periodHours = 12): number {
  return Math.floor(Date.now() / (periodHours * 60 * 60 * 1000)) % BROKER_ADS.length;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function extractSourceFromLink(link: string): string {
  try {
    const u = new URL(link);
    return u.hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'News';
  }
}

function parseRssDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "10")), 1), 20);

  const cached = NEWS_CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=600");
    return res.status(200).json({ symbol, items: cached.items.slice(0, limit + 2), cachedAt: new Date(cached.expiresAt - NEWS_CACHE_TTL).toISOString() });
  }

  const rawItems: NewsItem[] = [];
  const seen = new Set<string>();

  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(symbol + " stock NSE India")}&hl=en-IN&gl=IN&ceid=IN:en`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const xml = await response.text();

      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = itemRegex.exec(xml)) !== null) {
        const itemXml = itemMatch[1];
        const titleMatch = itemXml.match(/<title>(.*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
        const descMatch = itemXml.match(/<description>(.*?)<\/description>/);
        const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);

        const title = titleMatch ? stripHtml(titleMatch[1]) : '';
        const link = linkMatch ? linkMatch[1].trim() : '';
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
        const description = descMatch ? stripHtml(descMatch[1]) : '';
        const source = sourceMatch ? stripHtml(sourceMatch[1]) : extractSourceFromLink(link);

        if (!title || !link) continue;
        const dedupKey = title.toLowerCase().trim().slice(0, 80);
        if (seen.has(dedupKey) || rawItems.length >= limit) continue;
        seen.add(dedupKey);

        rawItems.push({
          title,
          source: source || 'News',
          date: parseRssDate(pubDate),
          link,
          snippet: description.slice(0, 160),
        });
      }
    }
  } catch {
    // News source unavailable
  }

  // Interleave deterministic broker ads at positions 3 and 7
  const adIndex = getDeterministicAdIndex();
  const adPositions = [3, 7];
  const items: (NewsItem | AdItem)[] = [];
  let adCounter = 0;

  for (let i = 0; i < rawItems.length; i++) {
    items.push(rawItems[i]);
    if (adPositions.includes(i + 1)) {
      const adIdx = (adIndex + adCounter) % BROKER_ADS.length;
      adCounter++;
      items.push(BROKER_ADS[adIdx]);
    }
  }

  NEWS_CACHE.set(symbol, { items, expiresAt: Date.now() + NEWS_CACHE_TTL });

  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=600");
  return res.status(200).json({ symbol, items, cachedAt: new Date().toISOString() });
}
