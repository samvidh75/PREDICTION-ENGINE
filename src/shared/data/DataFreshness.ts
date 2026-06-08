/**
 * TRACK-P2 — Data Freshness Engine
 * 
 * Central freshness policy for all user-facing analytical APIs.
 * No route may claim "live" or "real-time" without this engine verifying it.
 */

import type { DataFreshness, DataFreshnessResult } from './AnalyticalResponse';

// ---------------------------------------------------------------------------
// Policy Constants
// ---------------------------------------------------------------------------

/**
 * Market data freshness thresholds.
 * - live:     <= 30 minutes during market hours
 * - recent:   <= 1 trading day
 * - stale:    <= 7 calendar days
 * - expired:  > 7 calendar days
 * - unknown:  no valid timestamp
 */
const LIVE_MAX_MINUTES = 30;
const RECENT_MAX_HOURS = 24; // 1 trading day
const STALE_MAX_DAYS = 7;

/**
 * Quarterly financial data freshness thresholds.
 * - recent:   current or latest filed period (within ~90 days)
 * - stale:    older but within ~180 days
 * - expired:  materially outdated (>180 days)
 */
const FINANCIAL_RECENT_MAX_DAYS = 90;
const FINANCIAL_STALE_MAX_DAYS = 180;

/**
 * Prediction snapshot freshness thresholds.
 * - recent:   <= 1 day
 * - stale:    <= 3 days 
 * - expired:  > 3 days
 */
const PREDICTION_STALE_MAX_DAYS = 3;

/**
 * News freshness thresholds.
 * - live:     <= 30 minutes
 * - recent:   <= 1 day
 * - stale:    <= 3 days
 * - expired:  > 3 days
 */
const NEWS_STALE_MAX_DAYS = 3;

// ---------------------------------------------------------------------------
// Helper: compute age from an ISO timestamp
// ---------------------------------------------------------------------------

function computeAge(asOf: string, now?: Date): { ageMinutes: number; ageHours: number; ageDays: number } {
  const ref = now ?? new Date();
  const ts = new Date(asOf);
  
  if (isNaN(ts.getTime())) {
    return { ageMinutes: Infinity, ageHours: Infinity, ageDays: Infinity };
  }

  const diffMs = ref.getTime() - ts.getTime();
  const ageMinutes = diffMs / (1000 * 60);
  const ageHours = ageMinutes / 60;
  const ageDays = ageHours / 24;

  return { ageMinutes, ageHours, ageDays };
}

function validOrNull(asOf: string | null | undefined): string | null {
  if (!asOf) return null;
  const d = new Date(asOf);
  return isNaN(d.getTime()) ? null : asOf;
}

// ---------------------------------------------------------------------------
// Freshness Assessors
// ---------------------------------------------------------------------------

/**
 * Assess freshness of a market data snapshot (price, feature, factor snapshots).
 * Uses the market-data policy:
 *   live <= 30 min, recent <= 1 day, stale <= 7 days, expired > 7 days
 */
export function assessMarketSnapshotFreshness(
  asOf: string | null | undefined,
  now?: Date
): DataFreshnessResult {
  const validAsOf = validOrNull(asOf);
  
  if (!validAsOf) {
    return {
      freshness: 'unknown',
      asOf: null,
      ageMinutes: null,
      ageHours: null,
      ageDays: null,
      reason: 'No valid timestamp available for market snapshot.',
    };
  }

  const { ageMinutes, ageHours, ageDays } = computeAge(validAsOf, now);

  if (ageMinutes <= LIVE_MAX_MINUTES) {
    return {
      freshness: 'live',
      asOf: validAsOf,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Market snapshot is live (age: ${Math.round(ageMinutes)} minutes).`,
    };
  }

  if (ageHours <= RECENT_MAX_HOURS) {
    return {
      freshness: 'recent',
      asOf: validAsOf,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Market snapshot is recent (age: ${Math.round(ageHours)} hours).`,
    };
  }

  if (ageDays <= STALE_MAX_DAYS) {
    return {
      freshness: 'stale',
      asOf: validAsOf,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Market snapshot is stale (age: ${Math.round(ageDays)} days).`,
    };
  }

  return {
    freshness: 'expired',
    asOf: validAsOf,
    ageMinutes: Math.round(ageMinutes * 100) / 100,
    ageHours: Math.round(ageHours * 100) / 100,
    ageDays: Math.round(ageDays * 100) / 100,
    reason: `Market snapshot is expired (age: ${Math.round(ageDays)} days). Data should not be used for current analysis.`,
  };
}

/**
 * Assess freshness of a financial statement snapshot.
 * Uses the quarterly-financial policy:
 *   recent <= 90 days, stale <= 180 days, expired > 180 days
 */
export function assessFinancialSnapshotFreshness(
  periodEnd: string | null | undefined,
  now?: Date
): DataFreshnessResult {
  const validPeriodEnd = validOrNull(periodEnd);

  if (!validPeriodEnd) {
    return {
      freshness: 'unknown',
      asOf: null,
      ageMinutes: null,
      ageHours: null,
      ageDays: null,
      reason: 'No valid financial period-end date available.',
    };
  }

  const { ageMinutes, ageHours, ageDays } = computeAge(validPeriodEnd, now);

  if (ageDays <= FINANCIAL_RECENT_MAX_DAYS) {
    return {
      freshness: 'recent',
      asOf: validPeriodEnd,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Financial data is recent (period ended ${Math.round(ageDays)} days ago).`,
    };
  }

  if (ageDays <= FINANCIAL_STALE_MAX_DAYS) {
    return {
      freshness: 'stale',
      asOf: validPeriodEnd,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Financial data is stale (period ended ${Math.round(ageDays)} days ago).`,
    };
  }

  return {
    freshness: 'expired',
    asOf: validPeriodEnd,
    ageMinutes: Math.round(ageMinutes * 100) / 100,
    ageHours: Math.round(ageHours * 100) / 100,
    ageDays: Math.round(ageDays * 100) / 100,
    reason: `Financial data is expired (period ended ${Math.round(ageDays)} days ago). Materially outdated.`,
  };
}

/**
 * Assess freshness of a prediction registry snapshot.
 *   recent <= 1 day, stale <= 3 days, expired > 3 days
 */
export function assessPredictionSnapshotFreshness(
  predictionDate: string | null | undefined,
  now?: Date
): DataFreshnessResult {
  const validDate = validOrNull(predictionDate);

  if (!validDate) {
    return {
      freshness: 'unknown',
      asOf: null,
      ageMinutes: null,
      ageHours: null,
      ageDays: null,
      reason: 'No valid prediction date available.',
    };
  }

  const { ageMinutes, ageHours, ageDays } = computeAge(validDate, now);

  if (ageHours <= RECENT_MAX_HOURS) {
    return {
      freshness: 'recent',
      asOf: validDate,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Prediction snapshot is recent (age: ${Math.round(ageHours)} hours).`,
    };
  }

  if (ageDays <= PREDICTION_STALE_MAX_DAYS) {
    return {
      freshness: 'stale',
      asOf: validDate,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `Prediction snapshot is stale (age: ${Math.round(ageDays)} days).`,
    };
  }

  return {
    freshness: 'expired',
    asOf: validDate,
    ageMinutes: Math.round(ageMinutes * 100) / 100,
    ageHours: Math.round(ageHours * 100) / 100,
    ageDays: Math.round(ageDays * 100) / 100,
    reason: `Prediction snapshot is expired (age: ${Math.round(ageDays)} days).`,
  };
}

/**
 * Assess freshness of a news article.
 *   live <= 30 min, recent <= 1 day, stale <= 3 days, expired > 3 days
 */
export function assessNewsFreshness(
  publishedAt: string | null | undefined,
  now?: Date
): DataFreshnessResult {
  const validDate = validOrNull(publishedAt);

  if (!validDate) {
    return {
      freshness: 'unknown',
      asOf: null,
      ageMinutes: null,
      ageHours: null,
      ageDays: null,
      reason: 'No valid publication timestamp available.',
    };
  }

  const { ageMinutes, ageHours, ageDays } = computeAge(validDate, now);

  if (ageMinutes <= LIVE_MAX_MINUTES) {
    return {
      freshness: 'live',
      asOf: validDate,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `News article published ${Math.round(ageMinutes)} minutes ago.`,
    };
  }

  if (ageHours <= RECENT_MAX_HOURS) {
    return {
      freshness: 'recent',
      asOf: validDate,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `News article published ${Math.round(ageHours)} hours ago.`,
    };
  }

  if (ageDays <= NEWS_STALE_MAX_DAYS) {
    return {
      freshness: 'stale',
      asOf: validDate,
      ageMinutes: Math.round(ageMinutes * 100) / 100,
      ageHours: Math.round(ageHours * 100) / 100,
      ageDays: Math.round(ageDays * 100) / 100,
      reason: `News article is stale (published ${Math.round(ageDays)} days ago).`,
    };
  }

  return {
    freshness: 'expired',
    asOf: validDate,
    ageMinutes: Math.round(ageMinutes * 100) / 100,
    ageHours: Math.round(ageHours * 100) / 100,
    ageDays: Math.round(ageDays * 100) / 100,
    reason: `News article is expired (published ${Math.round(ageDays)} days ago).`,
  };
}

/**
 * Convenience: pick the right assessor based on data type.
 */
export function assessFreshness(
  dataType: 'market' | 'financial' | 'prediction' | 'news',
  asOf: string | null | undefined,
  now?: Date
): DataFreshnessResult {
  switch (dataType) {
    case 'market':
      return assessMarketSnapshotFreshness(asOf, now);
    case 'financial':
      return assessFinancialSnapshotFreshness(asOf, now);
    case 'prediction':
      return assessPredictionSnapshotFreshness(asOf, now);
    case 'news':
      return assessNewsFreshness(asOf, now);
  }
}
