import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { maxDuration: 20 };

function yahooSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().trim();
  if (["NIFTY", "NIFTY50"].includes(clean)) return "^NSEI";
  if (clean === "SENSEX") return "^BSESN";
  if (clean === "BANKNIFTY") return "^NSEBANK";
  if (clean === "NIFTYIT") return "^CNXIT";
  return clean.includes(".") || clean.startsWith("^") ? clean : `${clean}.NS`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol || "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const range = Array.isArray(req.query.range) ? req.query.range[0] : req.query.range || "3mo";
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(symbol))}?interval=1d&range=${encodeURIComponent(range)}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!response.ok) return res.status(502).json({ error: `Yahoo historical HTTP ${response.status}` });

  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null> }> };
      }>;
    };
  };
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const alignedTimestamps: number[] = [];

  (quote?.close ?? []).forEach((close, index) => {
    if (typeof close !== "number" || !Number.isFinite(close)) return;
    closes.push(close);
    highs.push(typeof quote?.high?.[index] === "number" && Number.isFinite(quote.high[index]) ? quote.high[index] as number : close);
    lows.push(typeof quote?.low?.[index] === "number" && Number.isFinite(quote.low[index]) ? quote.low[index] as number : close);
    if (typeof timestamps[index] === "number") alignedTimestamps.push(timestamps[index]);
  });

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
  return res.status(200).json({ symbol, closes, highs, lows, timestamps: alignedTimestamps, count: closes.length });
}
