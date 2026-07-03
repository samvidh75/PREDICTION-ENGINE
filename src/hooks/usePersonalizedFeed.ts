import { useEffect, useMemo, useState } from 'react';
import { selfLearningEngine, LearnedInsight } from '../lib/client/selfLearningEngine';
import { vault, EncryptedWatchlist } from '../lib/client/localStorageVault';

export interface FeedItem {
  symbol: string;
  name: string;
  reason: 'top_affinity' | 'watchlist' | 'trending' | 'recent_search';
  quote: null;
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
  const [insights, setInsights] = useState<LearnedInsight[]>([]);
  const [topSymbols, setTopSymbols] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const result = await selfLearningEngine.getInsights();
      if (cancelled) return;
      setInsights(result);
      const fromInsights = result.slice(0, 5).map((i) => i.symbol);
      const lists = await vault.getWatchlists();
      if (cancelled) return;
      const seen = new Set(fromInsights);
      const watchlistSymbols: string[] = [];
      for (const list of lists) {
        for (const t of list.tickers) {
          if (!seen.has(t)) {
            watchlistSymbols.push(t);
            seen.add(t);
          }
        }
      }
      setTopSymbols([...fromInsights, ...watchlistSymbols].slice(0, 5));
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { insights, topSymbols };
}
