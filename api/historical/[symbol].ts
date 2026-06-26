import type { VercelRequest, VercelResponse } from "@vercel/node";

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  "1D": { range: "1d",  interval: "5m" },
  "5D": { range: "5d",  interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y",  interval: "1wk" },
  "3Y": { range: "3y",  interval: "1mo" },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol || "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const rangeKey = String(req.query.range || "1Y").toUpperCase();
  const config = RANGE_MAP[rangeKey] || RANGE_MAP["1Y"];

  const ticker = `${symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${config.interval}&range=${config.range}`;

  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" },
    });
    if (!r.ok) return res.status(r.status).json({ error: "yahoo_error" });
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: "no_data" });

    const quotes = result.indicators?.quote?.[0] ?? {};
    const closes = (quotes.close ?? []).filter((v: number | null) => v !== null);
    const highs = (quotes.high ?? []).filter((v: number | null) => v !== null);
    const lows = (quotes.low ?? []).filter((v: number | null) => v !== null);
    const opens = (quotes.open ?? []).filter((v: number | null) => v !== null);
    const volumes = (quotes.volume ?? []).filter((v: number | null) => v !== null);
    const timestamps = result.timestamp ?? [];

    const data = closes.map((close: number, i: number) => ({
      date: timestamps[i]
        ? new Date(timestamps[i] * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
        : `Day ${i + 1}`,
      close: Number(close.toFixed(2)),
    }));

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return res.status(200).json({
      symbol,
      range: rangeKey,
      count: data.length,
      data,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
