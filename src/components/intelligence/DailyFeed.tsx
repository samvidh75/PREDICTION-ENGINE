/**
 * Daily Intelligence Feed
 *
 * Displays prediction-registry snapshot diffs from the analytical response
 * envelope exposed by GET /api/intelligence/signals. Every visible signal is
 * source-attributed and malformed payloads render an unavailable state.
 */
import React, { useEffect, useState } from 'react';

export interface IntelligenceSignal {
  symbol: string;
  type:
    | 'classification_upgrade'
    | 'classification_downgrade'
    | 'confidence_increase'
    | 'confidence_decrease'
    | 'factor_change'
    | 'ranking_change'
    | 'watchlist_attention';
  severity: 'critical' | 'important' | 'monitor';
  previousValue: number | string;
  currentValue: number | string;
  delta: number | string;
  explanation: string;
  snapshotDate?: string;
}

interface FeedEnvelope {
  status: 'ok' | 'empty' | 'unavailable' | 'error' | 'partial';
  message: string | null;
  reason: string | null;
  generatedAt: string | null;
  dataState: {
    freshness: string;
    asOf: string | null;
    completenessScore: number;
    lineage: Array<{ sourceTable?: string | null; asOf?: string | null }>;
  };
  data: {
    signals: IntelligenceSignal[];
    snapshotDate?: string | null;
    symbolsAnalyzed?: number;
  } | null;
}

interface FeedViewState {
  loading: boolean;
  status: 'real' | 'empty' | 'unavailable';
  signals: IntelligenceSignal[];
  message: string;
  asOf: string | null;
  freshness: string;
  completenessScore: number | null;
  sourceTables: string[];
  symbolsAnalyzed: number | null;
}

const ALLOWED_TYPES = new Set<IntelligenceSignal['type']>([
  'classification_upgrade',
  'classification_downgrade',
  'confidence_increase',
  'confidence_decrease',
  'factor_change',
  'ranking_change',
  'watchlist_attention',
]);
const ALLOWED_SEVERITIES = new Set<IntelligenceSignal['severity']>(['critical', 'important', 'monitor']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSignal(value: unknown): IntelligenceSignal | null {
  if (!isRecord(value)) return null;
  const symbol = text(value.symbol)?.toUpperCase();
  const type = text(value.type) as IntelligenceSignal['type'] | null;
  const severity = text(value.severity) as IntelligenceSignal['severity'] | null;
  const explanation = text(value.explanation);
  const previousValue = typeof value.previousValue === 'number' || typeof value.previousValue === 'string' ? value.previousValue : null;
  const currentValue = typeof value.currentValue === 'number' || typeof value.currentValue === 'string' ? value.currentValue : null;
  const delta = typeof value.delta === 'number' || typeof value.delta === 'string' ? value.delta : null;

  if (!symbol || !type || !ALLOWED_TYPES.has(type) || !severity || !ALLOWED_SEVERITIES.has(severity)) return null;
  if (!explanation || previousValue === null || currentValue === null || delta === null) return null;

  return {
    symbol,
    type,
    severity,
    previousValue,
    currentValue,
    delta,
    explanation,
    snapshotDate: text(value.snapshotDate) ?? undefined,
  };
}

export function normalizeFeedEnvelope(value: unknown): FeedViewState {
  if (!isRecord(value)) {
    return unavailableState('Daily intelligence is unavailable because the research feed returned an invalid response.');
  }

  const status = text(value.status);
  const message = text(value.message) ?? text(value.reason) ?? 'Daily intelligence is unavailable.';
  const dataState = isRecord(value.dataState) ? value.dataState : {};
  const asOf = text(dataState.asOf);
  const freshness = text(dataState.freshness) ?? 'unknown';
  const completenessScore = numberOrNull(dataState.completenessScore);
  const lineage = Array.isArray(dataState.lineage) ? dataState.lineage : [];
  const sourceTables = [...new Set(lineage.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const sourceTable = text(entry.sourceTable);
    return sourceTable ? [sourceTable] : [];
  }))];

  if (status === 'empty') {
    return {
      loading: false,
      status: 'empty',
      signals: [],
      message,
      asOf,
      freshness,
      completenessScore,
      sourceTables,
      symbolsAnalyzed: null,
    };
  }

  if (status !== 'ok' && status !== 'partial') return unavailableState(message, asOf, freshness, completenessScore, sourceTables);
  if (!isRecord(value.data) || !Array.isArray(value.data.signals)) {
    return unavailableState('Daily intelligence is unavailable because the signal envelope is incomplete.', asOf, freshness, completenessScore, sourceTables);
  }

  const signals = value.data.signals.map(normalizeSignal).filter((signal): signal is IntelligenceSignal => signal !== null);
  if (value.data.signals.length > 0 && signals.length === 0) {
    return unavailableState('Daily intelligence is unavailable because every returned signal failed validation.', asOf, freshness, completenessScore, sourceTables);
  }

  return {
    loading: false,
    status: signals.length > 0 ? 'real' : 'empty',
    signals,
    message: signals.length > 0 ? 'Prediction-registry snapshot differences.' : 'No significant prediction changes were returned for the current snapshot window.',
    asOf: text(value.data.snapshotDate) ?? asOf,
    freshness,
    completenessScore,
    sourceTables,
    symbolsAnalyzed: numberOrNull(value.data.symbolsAnalyzed),
  };
}

function unavailableState(
  message: string,
  asOf: string | null = null,
  freshness = 'unknown',
  completenessScore: number | null = null,
  sourceTables: string[] = [],
): FeedViewState {
  return {
    loading: false,
    status: 'unavailable',
    signals: [],
    message,
    asOf,
    freshness,
    completenessScore,
    sourceTables,
    symbolsAnalyzed: null,
  };
}

function direction(signal: IntelligenceSignal): 'improver' | 'decliner' | 'monitor' {
  if (signal.type === 'classification_upgrade' || signal.type === 'confidence_increase') return 'improver';
  if (signal.type === 'classification_downgrade' || signal.type === 'confidence_decrease') return 'decliner';
  const numericDelta = numberOrNull(signal.delta);
  if (numericDelta === null || numericDelta === 0) return 'monitor';
  return numericDelta > 0 ? 'improver' : 'decliner';
}

function displayValue(value: number | string): string {
  if (typeof value === 'number') return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return value;
}

function displayDelta(value: number | string): string {
  if (typeof value === 'number') return `${value > 0 ? '+' : ''}${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return value;
}

function Card({ signal }: { signal: IntelligenceSignal }) {
  const signalDirection = direction(signal);
  const tone = signalDirection === 'improver'
    ? 'bg-green-50 border-green-400'
    : signalDirection === 'decliner'
      ? 'bg-red-50 border-red-400'
      : 'bg-blue-50 border-blue-400';
  const badge = signalDirection === 'improver' ? 'Improving' : signalDirection === 'decliner' ? 'Declining' : 'Monitor';

  return (
    <div className={`border-4 border-black p-4 ${tone}`} style={{ boxShadow: '4px 4px 0px #000' }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide">{signal.symbol}</span>
        <span className="border-2 border-black bg-white px-2 py-0.5 text-[10px] font-bold uppercase">{badge}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="block text-[9px] font-bold uppercase text-gray-500">Previous</span>{displayValue(signal.previousValue)}</div>
        <div><span className="block text-[9px] font-bold uppercase text-gray-500">Current</span>{displayValue(signal.currentValue)}</div>
        <div><span className="block text-[9px] font-bold uppercase text-gray-500">Delta</span>{displayDelta(signal.delta)}</div>
      </div>
      <div className="mt-3 text-xs leading-relaxed text-gray-700">{signal.explanation}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider text-gray-500">
        <span>{signal.type.replaceAll('_', ' ')}</span>
        <span>Severity: {signal.severity}</span>
      </div>
    </div>
  );
}

export default function DailyFeed() {
  const [state, setState] = useState<FeedViewState>({
    loading: true,
    status: 'unavailable',
    signals: [],
    message: '',
    asOf: null,
    freshness: 'unknown',
    completenessScore: null,
    sourceTables: [],
    symbolsAnalyzed: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/intelligence/signals', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok && (!isRecord(body) || body.status !== 'unavailable')) throw new Error('DAILY_FEED_UNAVAILABLE');
        return body;
      })
      .then((body) => setState(normalizeFeedEnvelope(body)))
      .catch(() => {
        if (controller.signal.aborted) return;
        setState(unavailableState('Daily intelligence is unavailable from the research feed right now.'));
      });
    return () => controller.abort();
  }, []);

  if (state.loading) {
    return <div className="p-8 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" /><p className="mt-4 text-sm font-bold uppercase text-gray-600">Loading daily intelligence...</p></div>;
  }

  const improvers = state.signals.filter((signal) => direction(signal) === 'improver');
  const decliners = state.signals.filter((signal) => direction(signal) === 'decliner');
  const monitors = state.signals.filter((signal) => direction(signal) === 'monitor');

  return (
    <div className="space-y-6">
      <div className="border-4 border-black bg-yellow-300 p-4" style={{ boxShadow: '6px 6px 0px #000' }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold uppercase tracking-wider">Daily Intelligence</h2>
            <p className="mt-1 text-sm font-bold">Prediction-registry snapshot differences</p>
          </div>
          <span className="border-2 border-black bg-white px-3 py-1 text-xs font-bold uppercase">{state.status}</span>
        </div>
        <div className="mt-3 grid gap-1 text-[10px] font-medium text-gray-700 sm:grid-cols-2">
          <span>As of: {state.asOf || 'Data unavailable'}</span>
          <span>Freshness: {state.freshness}</span>
          <span>Sources: {state.sourceTables.length > 0 ? state.sourceTables.join(', ') : 'Data unavailable'}</span>
          <span>Symbols analyzed: {state.symbolsAnalyzed ?? 'Data unavailable'}</span>
        </div>
      </div>

      {state.status === 'real' ? (
        <>
          <SignalSection title="Top improvers" items={improvers} accent="border-green-500 text-green-800" />
          <SignalSection title="Top decliners" items={decliners} accent="border-red-500 text-red-800" />
          <SignalSection title="Monitor" items={monitors} accent="border-blue-500 text-blue-800" />
        </>
      ) : (
        <div className="border-4 border-dashed border-black bg-gray-50 p-8 text-center">
          <p className="text-xl font-semibold">{state.status === 'empty' ? 'No significant changes' : 'Daily intelligence unavailable'}</p>
          <p className="mt-1 text-sm text-gray-600">{state.message}</p>
        </div>
      )}
    </div>
  );
}

function SignalSection({ title, items, accent }: { title: string; items: IntelligenceSignal[]; accent: string }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className={`mb-3 border-l-4 pl-3 ${accent}`}><h3 className="text-lg font-semibold uppercase">{title}</h3></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{items.map((signal, index) => <Card key={`${signal.symbol}-${signal.type}-${index}`} signal={signal} />)}</div>
    </section>
  );
}
