/**
 * TRACK-P2 — Prediction Signals API with Analytical Envelope
 * GET /api/predictions/signals
 *
 * Every signal is the result of a real diff between today's snapshot
 * and the previous snapshot. No synthetic events. No inferred upgrades.
 * No pseudo scoring.
 *
 * Envelope logic:
 *   - Empty signals + blank snapshotDate → SNAPSHOT_NOT_GENERATED → unavailableResponse
 *   - Empty signals + present snapshotDate → NO_SIGNIFICANT_SIGNALS → emptyResponse / realResponse(empty)
 *   - Signals present → realResponse with lineage, freshness, reason codes
 */
import type { FastifyPluginAsync } from 'fastify';
import { predictionDiffEngine } from '../../../../intelligence/PredictionDiffEngine';
import { signalValidator } from '../../../../intelligence/SignalValidationEngine';
import {
  realResponse,
  emptyResponse,
  unavailableResponse,
  errorResponse,
  AnalyticalReasonCode,
  DataLineageEntry,
  AnalyticalResponse,
} from '../../../../shared/data/AnalyticalResponse';
import { assessPredictionSnapshotFreshness } from '../../../../shared/data/DataFreshness';

export const predictionSignalsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/predictions/signals', async (request, reply) => {
    const log = request.log;
    const query = request.query as {
      limit?: string;
      symbol?: string;
      severity?: string;
    };

    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const symbol = query.symbol?.toUpperCase().trim() || undefined;
    const severity = query.severity?.toLowerCase().trim() || undefined;

    // Validate severity
    if (severity && !['critical', 'important', 'monitor'].includes(severity)) {
      return reply.status(400).send({
        error: 'Invalid severity filter. Use: critical, important, or monitor.',
      });
    }

    try {
      const result = await predictionDiffEngine.generateSignals({
        limit: Math.min(limit, 200), // cap at 200
        symbol,
        severity: severity as 'critical' | 'important' | 'monitor' | undefined,
      });

      // ──────────────────────────────────────────────────────────
      // Check for SNAPSHOT_NOT_GENERATED
      // When snapshotDate is empty/blank and signals are empty,
      // the snapshot has not been generated at all.
      // ──────────────────────────────────────────────────────────
      const hasSnapshotDate = !!result.snapshotDate && result.snapshotDate.trim() !== '';

      if (result.signals.length === 0 && !hasSnapshotDate) {
        return unavailableResponse(
          'SNAPSHOT_NOT_GENERATED',
          'Prediction snapshot has not been generated yet. No signals available.',
          ['prediction_snapshot']
        );
      }

      // ──────────────────────────────────────────────────────────
      // Attach validation data to each signal where available
      // ──────────────────────────────────────────────────────────
      const signalsWithValidation = await attachValidation(result.signals);

      // ──────────────────────────────────────────────────────────
      // Compute completeness for the signals payload
      // ──────────────────────────────────────────────────────────
      const requiredFields = ['snapshotDate', 'symbolsAnalyzed', 'signals'];
      const availableFields = [
        hasSnapshotDate ? 'snapshotDate' : null,
        result.symbolsAnalyzed > 0 ? 'symbolsAnalyzed' : null,
        signalsWithValidation.length >= 0 ? 'signals' : null,
      ].filter(Boolean).length;
      const completenessScore = requiredFields.length > 0
        ? Math.round((availableFields / requiredFields.length) * 100)
        : 100;

      // ──────────────────────────────────────────────────────────
      // Assess freshness from snapshot date
      // ──────────────────────────────────────────────────────────
      const freshnessResult = assessPredictionSnapshotFreshness(
        hasSnapshotDate ? result.snapshotDate : null
      );

      // ──────────────────────────────────────────────────────────
      // Build lineage
      // ──────────────────────────────────────────────────────────
      const lineage: DataLineageEntry[] = [
        {
          sourceTable: 'prediction_registry',
          sourceField: 'classification',
          asOf: hasSnapshotDate ? result.snapshotDate : null,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: hasSnapshotDate
            ? `Snapshot from ${result.snapshotDate}`
            : 'No snapshot date available',
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'health_score',
          asOf: hasSnapshotDate ? result.snapshotDate : null,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'factors',
          asOf: hasSnapshotDate ? result.snapshotDate : null,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Symbols analyzed: ${result.symbolsAnalyzed}`,
        },
      ];

      // ──────────────────────────────────────────────────────────
      // Determine reason code
      // ──────────────────────────────────────────────────────────
      if (result.signals.length === 0 && hasSnapshotDate) {
        // Empty signals but snapshot exists → NO_SIGNIFICANT_SIGNALS
        return emptyResponse(
          'NO_SIGNIFICANT_SIGNALS',
          `Snapshot from ${result.snapshotDate} generated successfully but no significant signals were detected across ${result.symbolsAnalyzed} symbols analyzed.`,
          freshnessResult.freshness,
          result.snapshotDate,
          lineage
        );
      }

      // ──────────────────────────────────────────────────────────
      // Signals present → wrap in realResponse
      // ──────────────────────────────────────────────────────────
      const payload = {
        signals: signalsWithValidation,
        generatedAt: result.generatedAt,
        snapshotDate: result.snapshotDate,
        symbolsAnalyzed: result.symbolsAnalyzed,
      };

      return realResponse(
        payload,
        freshnessResult.freshness,
        result.snapshotDate || null,
        completenessScore,
        lineage,
        'OK'
      );
    } catch (err: any) {
      log.error({ err }, 'prediction signals generation failed');
      return errorResponse(
        'BACKEND_UNAVAILABLE',
        'Failed to generate prediction signals.'
      );
    }
  });
};

/**
 * Augment each signal with historical validation metrics from
 * SignalValidationEngine, when available.
 */
async function attachValidation(
  signals: Awaited<ReturnType<typeof predictionDiffEngine.generateSignals>>['signals']
): Promise<typeof signals> {
  try {
    const [classificationResults, confidenceResults, factorResults] = await Promise.all([
      signalValidator.validateClassificationChanges(),
      signalValidator.validateConfidenceChanges(),
      signalValidator.validateFactorChanges(),
    ]);

    return signals.map(signal => {
      let historicalSuccessRate: number | null = null;
      let sampleSize: number | null = null;
      let avgAlpha: number | null = null;

      if (signal.type === 'classification_upgrade' || signal.type === 'classification_downgrade') {
        // Find the matching classification transition
        const from = String(signal.previousValue);
        const to = String(signal.currentValue);
        const match = classificationResults.find(
          r => r.signalType === `${from} → ${to}`
        );
        if (match) {
          historicalSuccessRate = match.successRate;
          sampleSize = match.sampleSize;
          avgAlpha = match.avgAlphaPct;
        }
      } else if (signal.type === 'confidence_increase' || signal.type === 'confidence_decrease') {
        // Use the aggregate for the magnitude bucket
        const delta = Math.abs(Number(signal.delta) || 0);
        let bucket: string;
        if (delta <= 10) bucket = 'small (5-10pts)';
        else if (delta <= 20) bucket = 'medium (11-20pts)';
        else bucket = 'large (21+pts)';

        const match = confidenceResults.find(r => r.signalType.includes(bucket));
        if (match) {
          historicalSuccessRate = match.successRate;
          sampleSize = match.sampleSize;
          avgAlpha = match.avgAlphaPct;
        }
      } else if (signal.type === 'factor_change') {
        // Aggregate across all factor directions
        const allFactors = factorResults;
        if (allFactors.length > 0) {
          const avgSuccess = allFactors.reduce((s, f) => s + f.successRate, 0) / allFactors.length;
          const totalSamples = allFactors.reduce((s, f) => s + f.totalChanges, 0);
          const avgReturn = allFactors.reduce((s, f) => s + f.avgReturnPct, 0) / allFactors.length;
          historicalSuccessRate = Math.round(avgSuccess * 10) / 10;
          sampleSize = totalSamples;
          avgAlpha = Math.round(avgReturn * 10) / 10;
        }
      }

      return {
        ...signal,
        validation: (historicalSuccessRate !== null && sampleSize !== null) ? {
          historicalSuccessRate,
          sampleSize,
          avgAlpha,
        } : undefined,
      };
    });
  } catch (err) {
    // Validation augmentation is best-effort; don't fail the request
    console.warn('[predictions/signals] Validation augmentation failed:', err);
    return signals;
  }
}

export default predictionSignalsRoutes;
