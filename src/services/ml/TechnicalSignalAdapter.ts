import { FeatureVector, NamedSignal, Signal } from './types';
import { momentumSignal, meanReversionSignal, volumeConvictionSignal, fundamentalSignal } from './SignalGenerators';
import type { SignalSource } from '../../engines/EnsembleAggregator';

/**
 * Bridges this module's technical/fundamental feature signals into the
 * production `EnsembleAggregator` (src/engines/EnsembleAggregator.ts, already
 * wired to /api/signals/ensemble). That aggregator takes generic named
 * `SignalSource` inputs (any direction/strength/confidence triple) — it has
 * no opinion on where signals come from, so feeding it real technical
 * analysis computed from price history is a legitimate extension rather
 * than a competing implementation.
 */
export function computeNamedSignals(features: FeatureVector): NamedSignal[] {
  return [
    { source: 'momentum', ...momentumSignal(features) },
    { source: 'mean_reversion', ...meanReversionSignal(features) },
    { source: 'volume_conviction', ...volumeConvictionSignal(features) },
    { source: 'fundamental', ...fundamentalSignal(features) },
  ];
}

/** Convert this module's Signal shape into the production ensemble's SignalSource shape. */
export function toSignalSource(named: NamedSignal): SignalSource {
  return {
    name: named.source,
    direction: toEngineDirection(named),
    strength: Math.abs(named.score),
    confidence: named.probability,
  };
}

export function toSignalSources(features: FeatureVector): SignalSource[] {
  return computeNamedSignals(features).map(toSignalSource);
}

function toEngineDirection(signal: Signal): SignalSource['direction'] {
  if (signal.direction === 'up') return 'bullish';
  if (signal.direction === 'down') return 'bearish';
  return 'neutral';
}
