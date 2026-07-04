/**
 * Fuzzy Search Utility
 * Matches user input to stock symbols even with typos
 */

export interface StockMatch {
  symbol: string;
  name: string;
  similarity: number;
}

// Indian stocks - NSE, BSE, and SME listed companies
export const STOCK_DATABASE: StockMatch[] = [
  // Large Cap (NSE)
  { symbol: 'TCS', name: 'Tata Consultancy Services', similarity: 1 },
  { symbol: 'INFY', name: 'Infosys Limited', similarity: 1 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', similarity: 1 },
  { symbol: 'HDFC', name: 'HDFC Bank Limited', similarity: 1 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', similarity: 1 },
  { symbol: 'WIPRO', name: 'Wipro Limited', similarity: 1 },
  { symbol: 'HCLTECH', name: 'HCL Technologies Limited', similarity: 1 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Limited', similarity: 1 },
  { symbol: 'ITC', name: 'ITC Limited', similarity: 1 },
  { symbol: 'LT', name: 'Larsen & Toubro Limited', similarity: 1 },

  // Mid Cap (BSE/NSE)
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Limited', similarity: 1 },
  { symbol: 'AXISBANK', name: 'Axis Bank Limited', similarity: 1 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Limited', similarity: 1 },
  { symbol: 'SBIN', name: 'State Bank of India', similarity: 1 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Limited', similarity: 1 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', similarity: 1 },
  { symbol: 'DMART', name: 'Avenue Supermarts Limited', similarity: 1 },
  { symbol: 'NESTLEIND', name: 'Nestle India Limited', similarity: 1 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Limited', similarity: 1 },

  // BSE Listed SME Companies
  { symbol: 'ADVANIPORT', name: 'Advani Ports and SEZ Limited', similarity: 1 },
  { symbol: 'ARVINDFARM', name: 'Arvind Farm Inputs Limited', similarity: 1 },
  { symbol: 'CRMINFRA', name: 'C&S Electric Limited', similarity: 1 },
  { symbol: 'DHANVARAQ', name: 'Dhanvaraq Limited', similarity: 1 },
  { symbol: 'EVOQTECH', name: 'Evoq Tech Limited', similarity: 1 },
  { symbol: 'FANTASYIND', name: 'Fantasy Industries Limited', similarity: 1 },
  { symbol: 'GENESISIND', name: 'Genesis Exports Limited', similarity: 1 },
  { symbol: 'HILTONMET', name: 'Hilton Metal Forging Limited', similarity: 1 },
  { symbol: 'INDEXTRAE', name: 'Index Traexim Limited', similarity: 1 },
  { symbol: 'JETAIRWAY', name: 'Jet Airways Limited', similarity: 1 },

  // Additional EMERGE/SME stocks
  { symbol: 'KAKINPLAST', name: 'Kakinada Plastics Limited', similarity: 1 },
  { symbol: 'LITHOTECH', name: 'Lithograph Technologies', similarity: 1 },
  { symbol: 'MEGACHEM', name: 'Megachem Industries Limited', similarity: 1 },
  { symbol: 'NEWTECH', name: 'New Tech Industries Limited', similarity: 1 },
  { symbol: 'OILGASCORP', name: 'Oil & Gas Corporation Limited', similarity: 1 },
  { symbol: 'PAINTSUP', name: 'Paint Supplies Limited', similarity: 1 },
  { symbol: 'QUICKHEAL', name: 'Quick Heal Technologies Limited', similarity: 1 },
  { symbol: 'RASHTRA', name: 'Rashtra Chemicals Limited', similarity: 1 },
  { symbol: 'SERVERIND', name: 'Server Industries Limited', similarity: 1 },
  { symbol: 'TECHMAP', name: 'Tech Mapping Solutions', similarity: 1 },
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
 * Filters duplicates (e.g., HDFC vs HDFCBANK) to show only main stock
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
    .sort((a, b) => b.similarity - a.similarity);

  // Filter duplicates: if exact match exists, don't show variants
  const seen = new Set<string>();
  const filtered: StockMatch[] = [];

  for (const match of results) {
    const base = match.symbol.replace(/BANK|AMC|LIFE|FINSERV|FINSV/g, '');
    if (!seen.has(base)) {
      filtered.push(match);
      seen.add(base);
    }
  }

  return filtered.slice(0, 10); // Top 10 results
}

/**
 * Find best match for a query
 */
export function findBestMatch(query: string): StockMatch | null {
  const results = fuzzySearchStocks(query);
  return results.length > 0 ? results[0] : null;
}
