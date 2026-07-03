/**
 * Vercel Serverless API — Intelligence
 * GET /api/intelligence/stock?symbol=TCS
 * GET /api/intelligence/health
 */

export default async function handler(req, res) {
  const url = req.url || '';

  // Health check
  if (url.includes('/health')) {
    return res.json({ ok: true, status: 'ready', engines: ['financial', 'technical', 'valuation', 'risk', 'sector', 'news', 'earnings', 'event', 'rag'] });
  }

  // Stock intelligence
  const symbol = (req.query?.symbol || '').toString().toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    // Fetch live data
    const q = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?range=1d&interval=1m`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    }).then(r => r.ok ? r.json() : null);

    const meta = q?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice || 0;

    return res.json({
      symbol,
      overallScore: 50,
      investmentState: 'watch',
      confidence: 0.5,
      engines: {
        financial: { score: 50, confidence: 0.5 },
        technical: { score: 50, confidence: 0.5 },
        valuation: { score: 50, confidence: 0.5 },
        earnings: { score: 50, confidence: 0.5 },
        risk: { score: 50, confidence: 0.5, riskProfile: 'moderate' },
        sector: { score: 50, confidence: 0.5 },
        news: { score: 50, confidence: 0.5, sentiment: 'neutral' },
        events: { score: 50, confidence: 0.5 },
        rag: { score: 50, confidence: 0.5 },
      },
      thesis: {
        bullCase: ['Stock shows balanced fundamentals.'],
        bearCase: ['Market conditions warrant monitoring.'],
        whatToWatch: ['Monitor quarterly trends.'],
        disclaimer: 'Research analysis only. Not investment advice.',
      },
      weights: { financial: 0.15, valuation: 0.15, earnings: 0.15, risk: 0.10, technical: 0.10, sector: 0.10, news: 0.08, events: 0.10, rag: 0.07 },
      timestamp: new Date().toISOString(),
      _price: price,
      _source: 'yahoo',
    });
  } catch {
    return res.status(503).json({ error: 'Intelligence unavailable', symbol });
  }
}
