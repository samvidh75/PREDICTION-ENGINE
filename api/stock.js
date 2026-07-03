/**
 * Vercel Serverless API — Stock Detail
 * GET /api/stock?symbol=RELIANCE
 */
export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const clean = symbol.toUpperCase().trim();

  // Try Yahoo Finance
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${clean}.NS?range=1d&interval=1m`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (r.ok) {
      const d = await r.json();
      const meta = d?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || price;
        const marketCap = meta.marketCap ? Math.round(meta.marketCap / 10000000 * 100) / 100 : null;

        return res.json({
          symbol: clean,
          companyName: meta.shortName || clean,
          exchange: 'NSE',
          sector: 'N/A',
          industry: 'N/A',
          price: {
            current: price,
            changeAbs: Math.round((price - prevClose) * 100) / 100,
            changePercent: prevClose > 0 ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0,
            marketCap,
          },
          fundamentals: { pe: null, pb: null, eps: null },
          roe: null, debtToEquity: null,
          dataSources: { price: 'yahoo' },
        });
      }
    }
  } catch {}

  return res.status(503).json({ error: 'Data unavailable', symbol: clean });
}
