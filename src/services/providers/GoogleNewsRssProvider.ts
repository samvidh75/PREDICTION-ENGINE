import { NewsProvider, type NewsItem } from "./NewsProvider";
import { getSharedProviderRequestBroker } from "./broker/createProviderRequestBroker";
import { getCurrentIngestionRunId } from "../acquisition/IngestionRunContext";

const REQUEST_TIMEOUT_MS = 10_000;
const NEWS_CACHE_POLICY = { ttlMs: 120_000, staleWindowMs: 120_000, negativeTtlMs: 30_000 } as const;

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

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
    const clean = symbol.replace(/\.(NS|BO)$/i, "").trim().toUpperCase();
    const query = `${clean} stock`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    const result = await (await getSharedProviderRequestBroker()).execute("google-news", "news", clean, {
      query,
      hl: "en-IN",
      gl: "IN",
      ceid: "IN:en",
    }, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        });

        return {
          data: await resp.text().catch(() => ""),
          status: resp.status,
          headers: headersToRecord(resp.headers),
        };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      cachePolicy: NEWS_CACHE_POLICY,
      runId: getCurrentIngestionRunId(),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!result.success || result.data === null) {
      throw new Error(`Google News RSS unavailable for ${clean}: ${result.statusClass}`);
    }

    return parseRssItems(result.data).slice(0, 15);
  }
}

export default GoogleNewsRssProvider;
