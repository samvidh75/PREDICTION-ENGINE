/**
 * TRACK-49 Agent F — Portfolio Doctor V2
 * Displays portfolio health analysis from portfolio_doctor_registry.
 * Cartoon brutalist styling.
 */

import React, { useEffect, useState } from 'react';

interface FactorExposure {
  quality?: number;
  growth?: number;
  value?: number;
  momentum?: number;
  risk?: number;
}

interface RiskExposure {
  aggregate_risk?: number;
  risk_level?: string;
}

interface PortfolioData {
  diversification_score: number;
  concentration_score: number;
  factor_exposure: string | FactorExposure;
  risk_exposure: string | RiskExposure;
  portfolio_health: string;
  portfolio_fragility: string;
  portfolio_resilience: string;
  stock_count: number;
  sector_count: number;
}

type FetchState = 'loading' | 'loaded' | 'error' | 'empty' | 'unavailable';

const STATUS_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-green-400',
  HEALTHY: 'bg-green-300',
  MODERATE: 'bg-amber-300',
  FRAGILE: 'bg-red-400',
  STRONG: 'bg-blue-400',
  WEAK: 'bg-red-300',
  HIGH: 'bg-red-400',
  LOW: 'bg-green-400',
};

const STATUS_TEXT: Record<string, string> = {
  EXCELLENT: 'text-green-900',
  HEALTHY: 'text-green-900',
  MODERATE: 'text-amber-900',
  FRAGILE: 'text-red-900',
  STRONG: 'text-blue-900',
  WEAK: 'text-red-900',
  HIGH: 'text-red-900',
  LOW: 'text-green-900',
  ELEVATED: 'text-amber-900',
};

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

function toStatus(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : 'UNAVAILABLE';
}

function parseExposure<T extends Record<string, unknown>>(value: unknown): Partial<T> {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed as Partial<T> : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value as Partial<T> : {};
}

function unwrapPortfolioPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return 'data' in value ? value.data : value;
}

function normalizePortfolioData(value: unknown): PortfolioData | null {
  if (!isRecord(value)) return null;

  const diversificationScore = toFiniteNumber(value.diversification_score);
  const concentrationScore = toFiniteNumber(value.concentration_score);
  const stockCount = toFiniteNumber(value.stock_count);
  const sectorCount = toFiniteNumber(value.sector_count);

  if (
    diversificationScore === null ||
    concentrationScore === null ||
    stockCount === null ||
    sectorCount === null
  ) {
    return null;
  }

  return {
    diversification_score: diversificationScore,
    concentration_score: concentrationScore,
    factor_exposure: typeof value.factor_exposure === 'string' || isRecord(value.factor_exposure)
      ? value.factor_exposure as string | FactorExposure
      : {},
    risk_exposure: typeof value.risk_exposure === 'string' || isRecord(value.risk_exposure)
      ? value.risk_exposure as string | RiskExposure
      : {},
    portfolio_health: toStatus(value.portfolio_health),
    portfolio_fragility: toStatus(value.portfolio_fragility),
    portfolio_resilience: toStatus(value.portfolio_resilience),
    stock_count: Math.max(0, Math.round(stockCount)),
    sector_count: Math.max(0, Math.round(sectorCount)),
  };
}

function Bar({ label, value, color = 'bg-blue-500' }: { label: string; value: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-bold uppercase mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-6 border-2 border-black bg-gray-100 rounded-sm overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PortfolioDoctor() {
  const [state, setState] = useState<FetchState>('loading');
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/intelligence/portfolio')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((json: unknown) => {
        if (isRecord(json) && json.status === 'empty') {
          setState('empty');
          return;
        }

        const normalized = normalizePortfolioData(unwrapPortfolioPayload(json));
        if (!normalized) {
          setError('Portfolio analysis is unavailable because the latest snapshot is incomplete.');
          setState('unavailable');
          return;
        }

        if (normalized.stock_count === 0 && normalized.sector_count === 0) {
          setState('empty');
          return;
        }

        setData(normalized);
        setState('loaded');
      })
      .catch((e: Error) => {
        setError(e.message);
        setState('error');
      });
  }, []);

  const generateExplanation = (d: PortfolioData): string => {
    const parts: string[] = [];
    if (d.sector_count >= 8) parts.push('well-diversified');
    else if (d.sector_count >= 5) parts.push('moderately diversified');
    else parts.push('concentrated');

    if (d.portfolio_health === 'EXCELLENT' || d.portfolio_health === 'HEALTHY') {
      parts.push('with strong underlying quality');
    } else if (d.portfolio_health === 'FRAGILE') {
      parts.push('showing signs of quality stress');
    }

    if (d.portfolio_resilience === 'STRONG') {
      parts.push('and high resilience to market shocks');
    }

    return `Your portfolio is ${parts.join(', ')}.`;
  };

  if (state === 'loading') {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 font-bold uppercase text-sm text-gray-600">Analyzing portfolio...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="p-8 border-4 border-black bg-red-100 text-center" style={{ boxShadow: '6px 6px 0px #000' }}>
        <p className="font-extrabold text-lg text-red-900 mb-2">⚠️ Analysis Failed</p>
        <p className="text-sm text-red-800 mb-4">{error}</p>
        <button
          onClick={() => { setState('loading'); window.location.reload(); }}
          className="border-2 border-black bg-white px-6 py-2 font-bold uppercase text-sm hover:bg-black hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (state === 'unavailable') {
    return (
      <div className="p-8 border-4 border-black bg-amber-100 text-center" style={{ boxShadow: '6px 6px 0px #000' }}>
        <p className="font-extrabold text-2xl mb-2">Portfolio Analysis Unavailable</p>
        <p className="text-sm text-amber-900">{error}</p>
      </div>
    );
  }

  if (state === 'empty' || !data) {
    return (
      <div className="p-8 border-4 border-dashed border-black bg-gray-50 text-center" style={{ boxShadow: '6px 6px 0px #000' }}>
        <p className="font-extrabold text-2xl mb-2">No Portfolio Data</p>
        <p className="text-sm text-gray-600">
          Add stocks to your portfolio to see the Doctor's analysis.
        </p>
      </div>
    );
  }

  const factors = parseExposure<FactorExposure>(data.factor_exposure);
  const riskExp = parseExposure<RiskExposure>(data.risk_exposure);
  const factorEntries = Object.entries(factors)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]));
  const riskLevel = typeof riskExp.risk_level === 'string' ? riskExp.risk_level : 'N/A';
  const aggregateRisk = toFiniteNumber(riskExp.aggregate_risk) ?? 0.5;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-4 border-black bg-yellow-300 p-4" style={{ boxShadow: '6px 6px 0px #000' }}>
        <h2 className="font-extrabold text-2xl uppercase tracking-wider">
          🏥 Portfolio Doctor
        </h2>
        <p className="text-sm font-bold mt-1">{generateExplanation(data)}</p>
      </div>

      {/* SCORE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <ScoreCard label="Diversification" value={data.diversification_score} />
        <ScoreCard label="Concentration" value={data.concentration_score} color="amber" />
        <StatusCard label="Health" status={data.portfolio_health} />
        <StatusCard label="Fragility" status={data.portfolio_fragility} />
        <StatusCard label="Resilience" status={data.portfolio_resilience} />
        <div className="border-4 border-black bg-white p-3 text-center" style={{ boxShadow: '4px 4px 0px #000' }}>
          <p className="text-xs font-bold uppercase text-gray-500">Size</p>
          <p className="text-3xl font-extrabold">{data.stock_count}</p>
          <p className="text-xs font-bold">{data.sector_count} sectors</p>
        </div>
      </div>

      {/* FACTOR EXPOSURE */}
      <div className="border-4 border-black bg-white p-5" style={{ boxShadow: '6px 6px 0px #000' }}>
        <h3 className="font-extrabold text-lg uppercase mb-4">Factor Exposure</h3>
        {factorEntries.length > 0 ? (
          factorEntries.map(([key, val]) => (
            <Bar
              key={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={val}
              color={val > 0.6 ? 'bg-green-500' : val > 0.4 ? 'bg-amber-400' : 'bg-red-400'}
            />
          ))
        ) : (
          <p className="text-sm text-gray-500">No factor data available</p>
        )}
      </div>

      {/* RISK EXPOSURE */}
      <div className="border-4 border-black bg-white p-5" style={{ boxShadow: '6px 6px 0px #000' }}>
        <h3 className="font-extrabold text-lg uppercase mb-4">Risk Exposure</h3>
        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 border-2 border-black font-extrabold text-lg uppercase ${STATUS_COLORS[riskLevel] || 'bg-gray-300'} ${STATUS_TEXT[riskLevel] || 'text-gray-900'}`}
          >
            {riskLevel}
          </div>
          <div>
            <p className="text-sm font-bold">Aggregate Risk: {Math.round(aggregateRisk * 100)}%</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScoreCard({ label, value, color = 'blue' }: { label: string; value: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  const barColor = color === 'amber' ? 'bg-amber-400' : 'bg-blue-500';
  return (
    <div className="border-4 border-black bg-white p-3 text-center" style={{ boxShadow: '4px 4px 0px #000' }}>
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="text-3xl font-extrabold">{pct}%</p>
      <div className="h-2 border border-black bg-gray-100 mt-2 rounded-sm">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusCard({ label, status }: { label: string; status: string }) {
  const bg = STATUS_COLORS[status] || 'bg-gray-300';
  const text = STATUS_TEXT[status] || 'text-gray-900';
  return (
    <div className={`border-4 border-black p-3 text-center ${bg}`} style={{ boxShadow: '4px 4px 0px #000' }}>
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className={`text-2xl font-extrabold ${text}`}>{status}</p>
    </div>
  );
}
