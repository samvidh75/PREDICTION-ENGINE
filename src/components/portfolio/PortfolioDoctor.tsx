/**
 * Portfolio Doctor V2
 *
 * Renders the current portfolio intelligence envelope. The backend intentionally
 * returns explicit empty, unavailable and partial states instead of fabricated
 * holdings or silent neutral defaults. Position weights come from recorded cost
 * basis because live quote coverage is not guaranteed.
 */

import React, { useEffect, useState } from 'react';
import { PortfolioEngine, type CostBasisPosition } from '../../services/portfolio/PortfolioEngine';

interface NeutralizedPosition {
  symbol: string;
  neutralizedFactors: string[];
}

interface PortfolioIntelligence {
  diversificationStatus: string;
  riskConcentration: string;
  factorExposure: Record<string, number>;
  sectorExposure: Record<string, number>;
}

interface PortfolioViewData {
  intelligence: PortfolioIntelligence;
  holdingsCount: number;
  completenessScore: number | null;
  neutralizedFields: NeutralizedPosition[];
  isDemo: boolean;
  message: string;
}

type FetchState = 'loading' | 'loaded' | 'error' | 'empty' | 'unavailable';

type NormalizedResponse =
  | { state: 'loaded'; data: PortfolioViewData }
  | { state: 'empty' | 'unavailable'; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function toNumericMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, rawValue]) => [key, toFiniteNumber(rawValue)] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null),
  );
}

function toNeutralizedFields(value: unknown): NeutralizedPosition[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const symbol = toText(entry.symbol);
    const neutralizedFactors = Array.isArray(entry.neutralizedFactors)
      ? entry.neutralizedFactors.filter((factor): factor is string => typeof factor === 'string')
      : [];

    return symbol ? [{ symbol, neutralizedFactors }] : [];
  });
}

export function serializeCostBasisPositions(positions: CostBasisPosition[]): string {
  return positions
    .filter((position) => position.symbol && Number.isFinite(position.weight) && position.weight > 0)
    .map((position) => `${position.symbol.toUpperCase().trim()}:${position.weight.toFixed(8)}`)
    .join(',');
}

function normalizePortfolioResponse(value: unknown): NormalizedResponse {
  if (!isRecord(value)) {
    return {
      state: 'unavailable',
      message: 'Portfolio analysis is unavailable because the server returned an invalid response.',
    };
  }

  const status = toText(value.status)?.toLowerCase();
  const message = toText(value.message) ?? 'Portfolio analysis is unavailable.';

  if (status === 'empty') return { state: 'empty', message };
  if (status === 'unavailable' || status === 'error') return { state: 'unavailable', message };

  const payload = isRecord(value.data) ? value.data : value;
  const intelligencePayload = isRecord(payload.intelligence) ? payload.intelligence : payload;
  const diversificationStatus = toText(
    intelligencePayload.diversificationStatus ?? intelligencePayload.diversification_status,
  );
  const riskConcentration = toText(
    intelligencePayload.riskConcentration ?? intelligencePayload.risk_concentration,
  );
  const factorExposure = toNumericMap(
    intelligencePayload.factorExposure ?? intelligencePayload.factor_exposure,
  );
  const sectorExposure = toNumericMap(
    intelligencePayload.sectorExposure ?? intelligencePayload.sector_exposure,
  );

  if (!diversificationStatus || !riskConcentration) {
    return {
      state: 'unavailable',
      message: 'Portfolio analysis is unavailable because the latest snapshot is incomplete.',
    };
  }

  const holdingsCount = toFiniteNumber(
    payload.holdingsCount ?? value.holdingsCount,
  ) ?? (Array.isArray(payload.positions) ? payload.positions.length : 0);
  const dataState = isRecord(value.dataState) ? value.dataState : {};
  const completenessScore = toFiniteNumber(
    payload.completenessScore ?? dataState.completenessScore ?? value.completenessScore,
  );

  return {
    state: 'loaded',
    data: {
      intelligence: {
        diversificationStatus,
        riskConcentration,
        factorExposure,
        sectorExposure,
      },
      holdingsCount: Math.max(0, Math.round(holdingsCount)),
      completenessScore,
      neutralizedFields: toNeutralizedFields(payload.neutralizedFields),
      isDemo: payload.isDemo === true || status === 'demo',
      message,
    },
  };
}

function toPercent(value: number): number {
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Math.round(normalized)));
}

function Bar({ label, value, color = 'bg-blue-500' }: { label: string; value: number; color?: string }) {
  const pct = toPercent(value);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-bold uppercase mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-6 border-2 border-black bg-gray-100 rounded-sm overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatePanel({ title, message, tone }: { title: string; message: string; tone: 'empty' | 'error' | 'unavailable' }) {
  const background = tone === 'error' ? 'bg-red-100' : tone === 'unavailable' ? 'bg-slate-100' : 'bg-gray-50';
  const border = tone === 'empty' ? 'border-dashed' : '';

  return (
    <div className={`p-8 border-4 ${border} border-black ${background} text-center`} style={{ boxShadow: '6px 6px 0px #000' }}>
      <p className="font-semibold text-2xl mb-2">{title}</p>
      <p className="text-sm text-gray-700">{message}</p>
    </div>
  );
}

export default function PortfolioDoctor() {
  const [state, setState] = useState<FetchState>('loading');
  const [data, setData] = useState<PortfolioViewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let controller: AbortController | null = null;

    const load = () => {
      controller?.abort();
      const positions = PortfolioEngine.getCostBasisPositions();
      if (positions.length === 0) {
        setData(null);
        setError('Add recorded holdings to your portfolio before running Portfolio Doctor.');
        setState('empty');
        return;
      }

      controller = new AbortController();
      const serialized = serializeCostBasisPositions(positions);
      setState('loading');
      setError('');

      fetch(`/api/intelligence/portfolio?positions=${encodeURIComponent(serialized)}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json() as Promise<unknown>;
        })
        .then((json: unknown) => {
          const result = normalizePortfolioResponse(json);
          if (result.state === 'loaded') {
            setData(result.data);
            setState('loaded');
            return;
          }
          setData(null);
          setError(result.message);
          setState(result.state);
        })
        .catch((caught: Error) => {
          if (controller?.signal.aborted) return;
          setData(null);
          setError(caught.message);
          setState('error');
        });
    };

    load();
    window.addEventListener('portfoliochange', load);
    return () => {
      controller?.abort();
      window.removeEventListener('portfoliochange', load);
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 font-bold uppercase text-sm text-[#64748B]">Analyzing portfolio...</p>
      </div>
    );
  }

  if (state === 'error') return <StatePanel title="Analysis Failed" message={error} tone="error" />;
  if (state === 'unavailable') return <StatePanel title="Portfolio Analysis Unavailable" message={error} tone="unavailable" />;
  if (state === 'empty' || !data) return <StatePanel title="No Portfolio Data" message={error} tone="empty" />;

  const { intelligence } = data;
  const factorEntries = Object.entries(intelligence.factorExposure).sort((a, b) => b[1] - a[1]);
  const sectorEntries = Object.entries(intelligence.sectorExposure).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="border-4 border-black bg-yellow-300 p-4" style={{ boxShadow: '6px 6px 0px #000' }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-2xl uppercase tracking-wider">Portfolio Doctor</h2>
          {data.isDemo && <span className="border-2 border-black bg-white px-2 py-1 text-xs font-semibold uppercase">Demo</span>}
        </div>
        <p className="text-sm font-bold mt-2">{intelligence.riskConcentration}</p>
      </div>

      <div className="border-4 border-black bg-blue-100 p-4 text-sm" style={{ boxShadow: '4px 4px 0px #000' }}>
        <strong>Input basis:</strong> recorded cost basis. Portfolio Doctor does not substitute missing live quotes or infer market-value weights.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard label="Diversification" status={intelligence.diversificationStatus} />
        <MetricCard label="Holdings" value={String(data.holdingsCount)} />
        <MetricCard label="Sectors" value={String(sectorEntries.length)} />
        <MetricCard label="Data completeness" value={data.completenessScore === null ? '—' : `${Math.round(data.completenessScore)}%`} />
      </div>

      <div className="rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[#0C1119] p-5">
        <h3 className="font-semibold text-lg uppercase mb-4 text-[#E6EDF3]">Factor Exposure</h3>
        {factorEntries.length > 0 ? factorEntries.map(([key, value]) => (
          <Bar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={value} color={toPercent(value) >= 60 ? 'bg-green-500' : toPercent(value) >= 40 ? 'bg-slate-400' : 'bg-red-400'} />
        )) : <p className="text-sm text-gray-500">No factor exposure data available.</p>}
      </div>

      <div className="border-4 border-black bg-white p-5" style={{ boxShadow: '6px 6px 0px #000' }}>
        <h3 className="font-semibold text-lg uppercase mb-4">Sector Exposure</h3>
        {sectorEntries.length > 0 ? sectorEntries.map(([sector, value]) => (
          <Bar key={sector} label={sector} value={value} color="bg-blue-500" />
        )) : <p className="text-sm text-gray-500">No sector exposure data available.</p>}
      </div>

      {data.neutralizedFields.length > 0 && (
        <div className="border-4 border-black bg-slate-100 p-5" style={{ boxShadow: '6px 6px 0px #000' }}>
          <h3 className="font-semibold text-lg uppercase mb-2">Data Caveats</h3>
          <p className="text-sm mb-3">Some factor inputs were unavailable and were neutralized by the portfolio engine. Review these holdings before acting on the analysis.</p>
          <ul className="space-y-1 text-sm">
            {data.neutralizedFields.map((entry) => <li key={entry.symbol}><strong>{entry.symbol}:</strong> {entry.neutralizedFactors.join(', ') || 'unspecified factors'}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <div className="border-4 border-black bg-white p-3 text-center" style={{ boxShadow: '4px 4px 0px #000' }}><p className="text-xs font-bold uppercase text-gray-500">{label}</p><p className="text-2xl font-semibold">{value}</p></div>;
}

function StatusCard({ label, status }: { label: string; status: string }) {
  return <div className="border-4 border-black bg-blue-100 p-3 text-center" style={{ boxShadow: '4px 4px 0px #000' }}><p className="text-xs font-bold uppercase text-gray-500">{label}</p><p className="text-lg font-semibold">{status}</p></div>;
}
