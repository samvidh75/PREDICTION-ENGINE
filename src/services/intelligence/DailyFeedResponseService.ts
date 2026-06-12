import { query } from '../../db/index';
import { generateSignalFeed } from '../../intelligence/SignalFeedEngine';
import {
  type AnalyticalResponse,
  type DataLineageEntry,
  emptyResponse,
  realResponse,
  unavailableResponse,
} from '../../shared/data/AnalyticalResponse';
import { assessMarketSnapshotFreshness } from '../../shared/data/DataFreshness';

interface LatestPredictionDateRow extends Record<string, unknown> {
  max_date: string | Date | null;
}

function extractDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

export function predictionRegistryLineage(asOf: string | null): DataLineageEntry[] {
  return [{
    sourceTable: 'prediction_registry',
    sourceField: null,
    provider: null,
    asOf: asOf ?? undefined,
    retrievedAt: new Date().toISOString(),
    isFallback: false,
    isSynthetic: false,
  }];
}

/**
 * Build the Daily Feed analytical envelope directly from prediction_registry
 * snapshot differences. This is intentionally separate from the legacy generic
 * signal route so the UI receives lineage for the table that actually powers the
 * feed rather than generic feature/factor provenance.
 */
export async function loadDailyFeedResponse(): Promise<AnalyticalResponse<unknown>> {
  const [{ rows }, signals] = await Promise.all([
    query<LatestPredictionDateRow>('SELECT MAX(prediction_date) AS max_date FROM prediction_registry'),
    generateSignalFeed(),
  ]);

  const asOf = extractDate(rows[0]?.max_date);
  const lineage = predictionRegistryLineage(asOf);
  if (!asOf) {
    return unavailableResponse(
      'PREDICTION_REGISTRY_SNAPSHOT_MISSING',
      'Daily intelligence is unavailable because prediction registry snapshots have not been generated.',
      { prediction_registry: false },
    );
  }

  const freshness = assessMarketSnapshotFreshness(asOf);
  if (signals.length === 0) {
    return emptyResponse(
      'NO_SIGNIFICANT_SIGNALS',
      'No significant prediction changes were detected for the current registry snapshot window.',
      freshness,
      asOf,
      lineage,
    );
  }

  return realResponse(
    {
      signals,
      symbolsAnalyzed: new Set(signals.map((signal) => signal.symbol)).size,
      snapshotDate: asOf,
    },
    freshness,
    asOf,
    100,
    lineage,
    'Daily intelligence generated from prediction_registry snapshot differences.',
  );
}
