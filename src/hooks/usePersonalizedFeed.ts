import { useMemo } from 'react';
import { selfLearningEngine, LearnedInsight } from '../lib/selfLearningEngine';
import { vault, EncryptedWatchlist } from '../lib/localStorageVault';
import { useClientMarketData, ClientQuote } from './useClientMarketData';

export interface FeedItem {
  symbol: string;
  name: string;
  reason: 'top_affinity' | 'watchlist' | 'trending' | 'recent_search';
  quote: ClientQuote | null;
  insight: LearnedInsight | null;
}

function getCompanyName(symbol: string): string {
  const names: Record<string, string> = {
    RELIANCE: 'Reliance Industries',
    TCS: 'Tata Consultancy Services',
    HDFCBANK: 'HDFC Bank',
    INFY: 'Infosys',
    ICICIBANK: 'ICICI Bank',
    KOTAKBANK: 'Kotak Mahindra Bank',
    SBIN: 'State Bank of India',
    BHARTIARTL: 'Bharti Airtel',
    ITC: 'ITC Limited',
    WIPRO: 'Wipro',
    HINDUNILVR: 'Hindustan Unilever',
    MARUTI: 'Maruti Suzuki India',
    TITAN: 'Titan Company',
    ASIANPAINT: 'Asian Paints',
    NTPC: 'NTPC Limited',
    AXISBANK: 'Axis Bank',
    BAJFINANCE: 'Bajaj Finance',
    SUNPHARMA: 'Sun Pharmaceutical Industries',
    HCLTECH: 'HCL Technologies',
    POWERGRID: 'Power Grid Corporation',
  };
  return names[symbol] || symbol;
}

export function usePersonalizedFeed() {
  const insights = useMemo(() => selfLearningEngine.getInsights(), []);

  const topSymbols = useMemo(() => {
    const fromInsights = insights.slice(0, 5).map((i) => i.symbol);
    const watchlistSymbols: string[] = [];
    vault.getWatchlists().then((lists: EncryptedWatchlist[]) => {
      const seen = new Set(fromInsights);
      for (const list of lists) {
        for (const t of list.tickers) {
          if (!seen.has(t)) {
            watchlistSymbols.push(t);
            seen.add(t);
          }
        }
      }
    });
    return [...fromInsights, ...watchlistSymbols].slice(0, 5);
  }, [insights]);

  return { insights, topSymbols };
}
