/**
 * TRACK-95O — Signal Feed Engine (REAL SIGNALS)
 * 
 * All signals are now derived from prediction_registry snapshot diffs
 * via GET /api/predictions/signals.
 * 
 * Zero synthetic/pseudo scoring. Zero fabricated events.
 * Every signal is traceable to a real backend endpoint outputting real deltas.
 */
import { getWatchlists } from "../services/portfolio/watchlistStore";

export interface IntelligenceSignal {
  symbol: string;
  type: 'classification_upgrade' | 'classification_downgrade' |
        'confidence_increase' | 'confidence_decrease' |
        'factor_change' | 'ranking_change' |
        'watchlist_attention';
  severity: 'critical' | 'important' | 'monitor';
  previousValue: number | string;
  currentValue: number | string;
  delta: number | string;
  explanation: string;
  snapshotDate?: string;
  timestamp?: number;
  // Validation data from SignalValidationEngine
  validation?: {
    historicalSuccessRate: number | null;
    sampleSize: number | null;
    avgAlpha: number | null;
  };
}

interface SignalsApiResponse {
  signals: IntelligenceSignal[];
  generatedAt: string;
  snapshotDate: string;
  symbolsAnalyzed: number;
}

const TYPE_OLD_TO_NEW: Record<string, IntelligenceSignal['type']> = {
  // Maps old SignalFeedEngine types to new PredictionDiffEngine types
  upgrade: 'classification_upgrade',
  downgrade: 'classification_downgrade',
  confidence_increase: 'confidence_increase',
  confidence_decrease: 'confidence_decrease',
  factor_improvement: 'factor_change',
  factor_deterioration: 'factor_change',
  ranking_entered: 'ranking_change',
  ranking_left: 'ranking_change',
  classification_change: 'classification_upgrade',
  watchlist_attention: 'watchlist_attention',
};

export async function generateSignalFeed(): Promise<{
  signals: IntelligenceSignal[];
  summary: {
    upgrades: number;
    downgrades: number;
    confidenceIncreases: number;
    confidenceDecreases: number;
    watchlistMonitored: number;
    totalSignals: number;
    symbolsAnalyzed: number;
  };
  dataSource: 'backend' | 'unavailable';
}> {
  const watchlists = getWatchlists();
  const watchlistTickers = new Set<string>();
  watchlists.forEach((wl) => wl.tickers?.forEach((t: string) => watchlistTickers.add(t)));

  try {
    if (typeof window === 'undefined') {
      return {
        signals: [],
        summary: {
          upgrades: 0, downgrades: 0, confidenceIncreases: 0, confidenceDecreases: 0,
          watchlistMonitored: watchlistTickers.size, totalSignals: 0, symbolsAnalyzed: 0,
        },
        dataSource: 'unavailable',
      };
    }

    const base = window.location.origin;
    const resp = await fetch(`${base}/api/predictions/signals?limit=200`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      return {
        signals: [],
        summary: {
          upgrades: 0, downgrades: 0, confidenceIncreases: 0, confidenceDecreases: 0,
          watchlistMonitored: watchlistTickers.size, totalSignals: 0, symbolsAnalyzed: 0,
        },
        dataSource: 'unavailable',
      };
    }

    const data: SignalsApiResponse = await resp.json();

    if (!data.signals || data.signals.length === 0) {
      return {
        signals: [],
        summary: {
          upgrades: 0, downgrades: 0, confidenceIncreases: 0, confidenceDecreases: 0,
          watchlistMonitored: watchlistTickers.size, totalSignals: 0,
          symbolsAnalyzed: data.symbolsAnalyzed ?? 0,
        },
        dataSource: 'backend',
      };
    }

    // Enrich signals with timestamp for UI rendering
    const signals: IntelligenceSignal[] = data.signals.map(s => ({
      ...s,
      snapshotDate: data.snapshotDate,
      timestamp: Date.now(),
    }));

    // Compute summary
    const upgrades = signals.filter(s => s.type === 'classification_upgrade').length;
    const downgrades = signals.filter(s => s.type === 'classification_downgrade').length;
    const confidenceIncreases = signals.filter(s => s.type === 'confidence_increase').length;
    const confidenceDecreases = signals.filter(s => s.type === 'confidence_decrease').length;

    return {
      signals,
      summary: {
        upgrades,
        downgrades,
        confidenceIncreases,
        confidenceDecreases,
        watchlistMonitored: watchlistTickers.size,
        totalSignals: signals.length,
        symbolsAnalyzed: data.symbolsAnalyzed ?? 0,
      },
      dataSource: 'backend',
    };
  } catch {
    return {
      signals: [],
      summary: {
        upgrades: 0, downgrades: 0, confidenceIncreases: 0, confidenceDecreases: 0,
        watchlistMonitored: watchlistTickers.size, totalSignals: 0, symbolsAnalyzed: 0,
      },
      dataSource: 'unavailable',
    };
  }
}
