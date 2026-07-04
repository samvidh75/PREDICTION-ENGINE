/**
 * Fuzzy Search Utility
 * Matches user input to stock symbols even with typos
 */

export interface StockMatch {
  symbol: string;
  name: string;
  similarity: number;
}

// Common Indian stocks
export const STOCK_DATABASE: StockMatch[] = [
  { symbol: 'TCS', name: 'Tata Consultancy Services', similarity: 1 },
  { symbol: 'INFY', name: 'Infosys', similarity: 1 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', similarity: 1 },
  { symbol: 'HDFC', name: 'HDFC Bank', similarity: 1 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', similarity: 1 },
  { symbol: 'WIPRO', name: 'Wipro', similarity: 1 },
  { symbol: 'HCLTECH', name: 'HCL Technologies', similarity: 1 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', similarity: 1 },
  { symbol: 'ITC', name: 'ITC', similarity: 1 },
  { symbol: 'LT', name: 'Larsen & Toubro', similarity: 1 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', similarity: 1 },
  { symbol: 'AXISBANK', name: 'Axis Bank', similarity: 1 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', similarity: 1 },
  { symbol: 'SBIN', name: 'State Bank of India', similarity: 1 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', similarity: 1 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', similarity: 1 },
  { symbol: 'DMART', name: 'Avenue Supermarts', similarity: 1 },
  { symbol: 'NESTLEIND', name: 'Nestle India', similarity: 1 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', similarity: 1 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', similarity: 1 },
];

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

/**
 * Calculate similarity score (0-1)
 */
function calculateSimilarity(input: string, target: string): number {
  const distance = levenshteinDistance(input.toUpperCase(), target.toUpperCase());
  const maxLength = Math.max(input.length, target.length);
  return 1 - distance / maxLength;
}

/**
 * Fuzzy search for stocks
 * Returns matches sorted by relevance
 */
export function fuzzySearchStocks(query: string): StockMatch[] {
  if (!query.trim()) return [];

  const results = STOCK_DATABASE.map((stock) => ({
    ...stock,
    similarity: Math.max(
      calculateSimilarity(query, stock.symbol),
      calculateSimilarity(query, stock.name)
    ),
  }))
    .filter((stock) => stock.similarity > 0.6) // Only show 60%+ matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10); // Top 10 results

  return results;
}

/**
 * Find best match for a query
 */
export function findBestMatch(query: string): StockMatch | null {
  const results = fuzzySearchStocks(query);
  return results.length > 0 ? results[0] : null;
}
