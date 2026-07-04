import type { VercelRequest, VercelResponse } from '@vercel/node';

// List of major Indian stocks for search
const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT' },
  { symbol: 'WIPRO', name: 'Wipro', sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'AXISBANK', name: 'Axis Bank', sector: 'Banking' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking' },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automotive' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', sector: 'Finance' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', sector: 'Insurance' },
  { symbol: 'LTIM', name: 'LTIMindtree', sector: 'IT' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', sector: 'Healthcare' },
  { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'Consumer' },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Engineering' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Cement' },
];

// Simple fuzzy search scoring
function fuzzyScore(target: string, query: string): number {
  if (target === query) return 100;
  if (target.startsWith(query)) return 90;
  if (target.includes(query)) return 70;

  // Levenshtein distance for typos
  const m = target.length, n = query.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (target[i - 1] === query[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  const similarity = Math.max(0, 100 - (distance * 100) / maxLen);
  return Math.round(similarity);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = (req.query.q as string || '').trim().toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  // Score all stocks
  const scored = INDIAN_STOCKS.map(stock => ({
    ...stock,
    score: Math.max(
      fuzzyScore(stock.symbol.toLowerCase(), query),
      fuzzyScore(stock.name.toLowerCase(), query),
      fuzzyScore(stock.sector.toLowerCase(), query),
    ),
  }));

  // Filter and sort by score
  const results = scored
    .filter(stock => stock.score > 40) // Minimum score threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return res.status(200).json({
    query,
    results: results.map(({ score, ...stock }) => stock),
    totalFound: results.length,
  });
}
