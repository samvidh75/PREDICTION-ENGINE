import { NewsProvider, type NewsItem } from "./NewsProvider";
import { RetryPolicy } from "./RetryPolicy";

const RETRY_OPTS = { retries: 2, minDelayMs: 400, maxDelayMs: 2500 };

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function parseXmlValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1] ?? "") : "";
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const seen = new Set<string>();
  const regex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(xml))) {
    const item = match[1] ?? "";
    const title = parseXmlValue(item, "title");
    const url = parseXmlValue(item, "link");
    const source = parseXmlValue(item, "source") || "Google News";
    const summary = parseXmlValue(item, "description");
    const datetime = parseXmlValue(item, "pubDate") || new Date().toISOString();

    if (!title || !url) continue;
    const key = `${title}::${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      title,
      url,
      source,
      summary,
      datetime: new Date(datetime).toISOString(),
    });
  }

  return items;
}

export class GoogleNewsRssProvider implements NewsProvider {
  async getNews(symbol: string): Promise<NewsItem[]> {
    const query = `${symbol.replace(/\.(NS|BO)$/i, "")} stock`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    const xml = await RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!resp.ok) {
        throw new Error(`Google News RSS HTTP ${resp.status}: ${resp.statusText}`);
      }

      return resp.text();
    }, RETRY_OPTS);

    return parseRssItems(xml).slice(0, 15);
  }
}

export default GoogleNewsRssProvider;
