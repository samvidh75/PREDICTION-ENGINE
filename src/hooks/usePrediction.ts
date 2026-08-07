import { useState, useCallback } from "react";

interface PredictionFactor {
  rsi_14?: number;
  rsi_signal?: string;
  macd_histogram?: number;
  macd_cross?: string;
  trend?: string;
  price_vs_sma200?: number;
  price_vs_sma50?: number;
  volume_ratio?: number;
  atr_14?: number;
  bb_pct?: number;
  pe_ratio?: number;
  roe?: number;
  roce?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  profit_margin?: number;
  revenue_growth?: number;
  earnings_growth?: number;
  dividend_yield?: number;
  promoter_holding?: string;
  fii_holding?: string;
  beta?: number;
  target_upside?: number;
  peg_ratio?: number;
  pb_ratio?: number;
  ev_ebitda?: number;
  fcf_yield?: number;
  quality_score?: number;
  momentum_1d?: number;
  momentum_1w?: number;
  momentum_1m?: number;
  momentum_3m?: number;
  market_cap_cr?: number;
  market_cap_category?: string;
  analyst_recommendation?: string;
  risk_level?: string;
  var_95?: number;
  interest_coverage?: number;
  position_52w?: number;
  [key: string]: unknown;
}

interface ScoringBreakdown {
  rsi?: number;
  macd?: number;
  bollinger?: number;
  trend?: number;
  sma200?: number;
  sma50?: number;
  volume?: number;
  adx?: number;
  stochastic?: number;
  pe?: number;
  roe?: number;
  roce?: number;
  debt?: number;
  current_ratio?: number;
  profit_margin?: number;
  revenue_growth?: number;
  earnings_growth?: number;
  pb?: number;
  peg?: number;
  ev_ebitda?: number;
  fcf_yield?: number;
  target?: number;
  quality?: number;
  piotroski?: number;
  beta?: number;
  momentum?: number;
  analyst?: number;
  [key: string]: number | undefined;
}

export interface Prediction {
  ticker: string;
  horizon_days: number;
  composite_score: number;
  classification: string;
  confidence: number;
  factor_count: number;
  data_quality: string;
  factors: PredictionFactor;
  scoring_breakdown?: ScoringBreakdown;
  price?: number;
  sector?: string;
  industry?: string;
  calculated_at: string;
  momentumBreakdown?: { shortTerm: number | null; mediumTerm: number | null; trend: number | null; overall: number | null };
}

interface LivePriceCache {
  ticker: string;
  price: number;
  prev_price?: number;
  change_pct?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  spread?: number;
  user_id: string;
  source: string;
  submitted_at: number;
  expires_at: number;
  accepted?: boolean;
}

interface UserReputation {
  user_id: string;
  total_submissions: number;
  accepted_submissions: number;
  rejected_submissions: number;
  reputation_score: number;
  last_submission_at?: number;
  created_at?: number;
}

export function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPrediction = useCallback(async (ticker: string, horizon = 30): Promise<Prediction | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/prediction/${ticker}?horizon=${horizon}`, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Prediction failed";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getPrediction, loading, error };
}

export function useLivePrice() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPrice = useCallback(async (
    ticker: string,
    price: number,
    userId: string,
    volume?: number,
    bid?: number,
    ask?: number,
  ): Promise<LivePriceCache | null> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/live-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, price, user_id: userId, source: "web", volume, bid, ask }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      setError(msg);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitPrice, submitting, error };
}

export function useLivePrices() {
  const [prices, setPrices] = useState<LivePriceCache[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/live-prices", {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setPrices(await res.json());
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  return { prices, fetchPrices, loading };
}

export function useScreener() {
  const [loading, setLoading] = useState(false);

  const getScreener = useCallback(async (ticker: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/screener/${ticker}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getScreener, loading };
}

export function useReputation() {
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReputation = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/user-reputation/${userId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setReputation(await res.json());
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  return { reputation, fetchReputation, loading };
}
