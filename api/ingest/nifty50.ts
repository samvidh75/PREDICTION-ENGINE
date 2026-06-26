import type { VercelRequest, VercelResponse } from '@vercel/node';

const NIFTY_50 = [
  'RELIANCE','TCS','HDFCBANK','INFY','HINDUNILVR','ICICIBANK','KOTAKBANK',
  'BHARTIARTL','ITC','AXISBANK','LT','SBIN','BAJFINANCE','ASIANPAINT',
  'MARUTI','ULTRACEMCO','TITAN','NESTLEIND','SUNPHARMA','WIPRO','POWERGRID',
  'NTPC','ONGC','COALINDIA','BAJAJFINSV','HCLTECH','TECHM','INDUSINDBK',
  'GRASIM','DIVISLAB','CIPLA','DRREDDY','EICHERMOT','BPCL','HEROMOTOCO',
  'HINDALCO','JSWSTEEL','APOLLOHOSP','ADANIPORTS','TATACONSUM','TATAMOTORS',
  'TATASTEEL','UPL','BRITANNIA','SHREECEM','SBILIFE','BAJAJ-AUTO','ADANIENT',
  'M&M','LTIM',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const results: Record<string, 'ok' | 'error'> = {};
  let successCount = 0;
  let errorCount = 0;

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (const symbol of NIFTY_50) {
    try {
      const r = await fetch(
        `https://prediction-engine-production-f7a8.up.railway.app/api/market-data/snapshot/${symbol}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` },
          signal: AbortSignal.timeout(10000),
        }
      );
      results[symbol] = r.ok ? 'ok' : 'error';
      if (r.ok) successCount++;
      else errorCount++;
    } catch {
      results[symbol] = 'error';
      errorCount++;
    }
    await delay(1200);
  }

  return res.status(200).json({
    total: NIFTY_50.length,
    success: successCount,
    error: errorCount,
    results,
    startedAt: new Date().toISOString(),
  });
}
