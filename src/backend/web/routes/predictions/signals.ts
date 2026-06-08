/**
 * TRACK-95O — Prediction Signals API
 * GET /api/predictions/signals
 * 
 * Replaces synthetic/intelligence-looking signals with fully traceable
 * prediction_registry-driven intelligence.
 * 
 * Every signal is the result of a real diff between today's snapshot
 * and the previous snapshot. No synthetic events. No inferred upgrades.
 * No pseudo scoring.
 */
import type { FastifyPluginAsync } from 'fastify';
import { predictionDiffEngine } from '../../../../intelligence/PredictionDiffEngine';
import { signalValidator } from '../../../../intelligence/SignalValidationEngine';

export const predictionSignalsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/predictions/signals', async (request, reply) => {
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

      // Attach validation data to each signal where available
      const signalsWithValidation = await attachValidation(result.signals);

      return reply.send({
        signals: signalsWithValidation,
        generatedAt: result.generatedAt,
        snapshotDate: result.snapshotDate,
        symbolsAnalyzed: result.symbolsAnalyzed,
      });
    } catch (err: any) {
      console.error('[predictions/signals] Error:', err);
      return reply.status(500).send({ error: 'Failed to generate prediction signals.' });
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
