import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol || "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const range = Array.isArray(req.query.range) ? req.query.range[0] : req.query.range || "3mo";
  const ticker = `${symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 StockStory/2.0' }
    });
    if (!r.ok) return res.status(r.status).json({ error: 'yahoo error' });
    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'no data' });

    const closes     = result.indicators?.quote?.[0]?.close?.filter(Boolean) ?? [];
    const highs      = result.indicators?.quote?.[0]?.high?.filter(Boolean)  ?? [];
    const lows       = result.indicators?.quote?.[0]?.low?.filter(Boolean)   ?? [];
    const timestamps = result.timestamp ?? [];

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    return res.status(200).json({ symbol, closes, highs, lows, timestamps,
                                   count: closes.length });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
