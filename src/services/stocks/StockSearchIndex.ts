import { StockRegistry, type RegisteredStock } from './StockRegistry';

export type SearchCandidate = {
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  price: number | null;
  dailyChangePct: number | null;
  healthScore: number | null;
  marketCapCr: number;
};

function isDisplayable(stock: RegisteredStock): boolean {
  if (/^\d{5,6}$/.test(stock.symbol)) return false;
  if (!stock.companyName || stock.companyName.toUpperCase() === stock.symbol.toUpperCase()) return false;
  if (stock.companyName.includes('PSE Listed Security Code')) return false;
  if (!stock.sector || stock.sector === 'Data unavailable') return false;
  return true;
}

export class StockSearchIndex {
  static search(query: string, limit: number = 10): SearchCandidate[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const scored: Array<{ stock: RegisteredStock; score: number }> = [];

    for (const stock of StockRegistry.getAllStocks().filter(isDisplayable)) {
      const ticker = stock.symbol.toLowerCase();
      const name = stock.companyName.toLowerCase();
      const sector = stock.sector.toLowerCase();

      let score = 0;
      if (ticker === q) score = 100;
      else if (ticker.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if (sector.includes(q)) score = 40;
      else {
        const qTokens = q.split(/\s+/).filter(Boolean);
        const nameTokens = name.split(/\s+/).filter(Boolean);
        const matches = qTokens.filter((token) =>
          nameTokens.some((nameToken) => nameToken.startsWith(token) || token.startsWith(nameToken))
        ).length;
        if (matches > 0) score = 10 + matches * 10;
      }

      if (score > 0) scored.push({ stock, score });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.stock.marketCap?.numeric ?? 0) - (a.stock.marketCap?.numeric ?? 0);
    });

    return scored.slice(0, limit).map(({ stock }) => ({
      ticker: stock.symbol,
      companyName: stock.companyName,
      exchange: stock.exchange,
      sector: stock.sector,
      price: null,
      dailyChangePct: null,
      healthScore: stock.telemetrySnapshot?.healthScore ?? null,
      marketCapCr: Math.round((stock.marketCap?.numeric ?? 0) / 10_000_000),
    }));
  }
}
