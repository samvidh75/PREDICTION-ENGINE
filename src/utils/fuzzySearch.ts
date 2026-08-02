/**
 * Fuzzy Search Utility
 * Matches user input to PSE stock symbols even with typos
 */

export interface StockMatch {
  symbol: string;
  name: string;
  similarity: number;
}

// PSE stocks - Philippine Stock Exchange listed companies
export const STOCK_DATABASE: StockMatch[] = [
  // Blue Chips
  { symbol: 'SM', name: 'SM Investments Corporation', similarity: 1 },
  { symbol: 'BDO', name: 'BDO Unibank', similarity: 1 },
  { symbol: 'JFC', name: 'Jollibee Foods Corporation', similarity: 1 },
  { symbol: 'AC', name: 'Ayala Corporation', similarity: 1 },
  { symbol: 'ALI', name: 'Ayala Land', similarity: 1 },
  { symbol: 'SMPH', name: 'SM Prime Holdings', similarity: 1 },
  { symbol: 'BPI', name: 'Bank of the Philippine Islands', similarity: 1 },
  { symbol: 'TEL', name: 'PLDT Inc.', similarity: 1 },
  { symbol: 'GLO', name: 'Globe Telecom', similarity: 1 },
  { symbol: 'MER', name: 'Megaworld Corporation', similarity: 1 },
  { symbol: 'MBT', name: 'Metrobank', similarity: 1 },
  { symbol: 'URC', name: 'Universal Robina Corporation', similarity: 1 },
  { symbol: 'JGS', name: 'JG Summit Holdings', similarity: 1 },
  { symbol: 'SECB', name: 'Security Bank', similarity: 1 },
  { symbol: 'GTCAP', name: 'GT Capital Holdings', similarity: 1 },
  { symbol: 'CNPF', name: 'Century Pacific Food', similarity: 1 },
  { symbol: 'EMI', name: 'Emirate Investments', similarity: 1 },
  { symbol: 'WLCON', name: 'Wilcon Depot', similarity: 1 },
  { symbol: 'MONDE', name: 'Monde Nissin', similarity: 1 },
  { symbol: 'PGOLD', name: 'Puregold Price Club', similarity: 1 },
  { symbol: 'RRHI', name: 'Robinsons Retail Holdings', similarity: 1 },
  { symbol: 'RLC', name: 'Robinsons Land Corporation', similarity: 1 },
  { symbol: 'DMC', name: 'DMCI Holdings', similarity: 1 },
  { symbol: 'ACEN', name: 'AboitizPower', similarity: 1 },
  { symbol: 'BLOOM', name: 'Bloomberry Resorts', similarity: 1 },
  { symbol: 'AP', name: 'Aboitiz Power', similarity: 1 },
  { symbol: 'FGEN', name: 'First Gen Corporation', similarity: 1 },
  { symbol: 'MWIDE', name: 'Megawide Construction', similarity: 1 },
  { symbol: 'ANI', name: 'Araneta Properties', similarity: 1 },
  { symbol: 'CEB', name: 'Cebu Pacific', similarity: 1 },
  { symbol: 'FLI', name: 'Filinvest Land', similarity: 1 },
  { symbol: 'IMI', name: 'Integrated Micro-electronics', similarity: 1 },
  { symbol: 'MEG', name: 'Megaworld Corporation', similarity: 1 },
  { symbol: 'NIKL', name: 'Nickel Asia Corporation', similarity: 1 },
  { symbol: 'PXP', name: 'Philippine Banks', similarity: 1 },
  { symbol: 'SCC', name: 'San Miguel Corporation', similarity: 1 },
  { symbol: 'SSI', name: 'SSI Group', similarity: 1 },
  { symbol: 'TFHI', name: 'Top Frontier Holdings', similarity: 1 },
  { symbol: 'VLL', name: 'Villar Group', similarity: 1 },
  { symbol: 'CHP', name: 'CHP Holdings', similarity: 1 },
  { symbol: 'MJC', name: 'Manila Jockey Club', similarity: 1 },
  { symbol: 'HCOR', name: 'HCOR Holdings', similarity: 1 },
  { symbol: 'ATN', name: 'ATN Holdings', similarity: 1 },
  { symbol: 'DMP', name: 'DMP Holdings', similarity: 1 },
  { symbol: 'CLC', name: 'Concepcion Industries', similarity: 1 },
  { symbol: 'WEB', name: 'Webzen Holdings', similarity: 1 },
  { symbol: 'NCM', name: 'NCM Holdings', similarity: 1 },
  { symbol: 'OPM', name: 'OPM Holdings', similarity: 1 },
  { symbol: 'PSE', name: 'PSE Holdings', similarity: 1 },
  { symbol: 'FMETF', name: 'First Metro ETF', similarity: 1 },
  { symbol: 'X', name: 'Century Pacific', similarity: 1 },
  { symbol: 'ICT', name: 'iPeople', similarity: 1 },
  { symbol: 'HLCM', name: 'HLCM Holdings', similarity: 1 },
  { symbol: 'DD', name: 'DD Holdings', similarity: 1 },
  { symbol: 'ROCK', name: 'Rockwell Land', similarity: 1 },
  { symbol: 'PCOR', name: 'Power Assets', similarity: 1 },
  { symbol: 'BSC', name: 'BSC Holdings', similarity: 1 },
  { symbol: 'ALHI', name: 'Alphaland Holdings', similarity: 1 },
  { symbol: 'APC', name: 'APC Holdings', similarity: 1 },
  { symbol: 'DIZ', name: 'Dizon Coppe', similarity: 1 },
  { symbol: 'LBC', name: 'LBC Express', similarity: 1 },
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
 * Filters duplicates (e.g., BDO vs BDOU) to show only main stock
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
    const base = match.symbol.replace(/BANK|AMC|LIFE|FIPSERV|FINSV|HOLDINGS/g, '');
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
