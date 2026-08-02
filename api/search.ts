import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PSE_STOCKS, PSE_SECTORS } from './_lib/data/universe.js';

// Real PSE-listed common stocks, sourced from the live phisix feed
// (see api/_lib/data/universe.ts for provenance). Sector is populated
// for PSEi-30 members with a known best-effort classification; everything
// else is labeled generically since precise sector data isn't in the feed.
const symbolToSector = new Map<string, string>();
for (const [sector, symbols] of Object.entries(PSE_SECTORS)) {
  for (const symbol of symbols) symbolToSector.set(symbol, sector);
}

const PSE_SEARCH_STOCKS = PSE_STOCKS.map((stock) => ({
  symbol: stock.symbol,
  name: stock.name,
  sector: symbolToSector.get(stock.symbol) ?? 'PSE Listed',
}));

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
  const scored = PSE_SEARCH_STOCKS.map(stock => ({
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
