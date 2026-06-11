/**
 * TRACK-49 Agent F — Portfolio Doctor V2
 * Displays portfolio health analysis from portfolio_doctor_registry.
 * Cartoon brutalist styling.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { PortfolioEngine } from '../../services/portfolio/PortfolioEngine';

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

type FetchState = 'loading' | 'loaded' | 'error' | 'empty';
type PortfolioGoal = 'capital_preservation' | 'balanced' | 'growth' | 'income';

const GOAL_STORAGE_KEY = 'stockstory_portfolio_goal_v1';

const GOALS: Array<{ id: PortfolioGoal; label: string; description: string }> = [
  { id: 'capital_preservation', label: 'Preserve Capital', description: 'Lower drawdown sensitivity and stronger resilience matter most.' },
  { id: 'balanced', label: 'Balanced', description: 'Blend diversification, resilience, and factor breadth.' },
  { id: 'growth', label: 'Growth', description: 'Accepts more volatility when growth and momentum exposure are supported.' },
  { id: 'income', label: 'Income', description: 'Prefers stability and lower concentration over aggressive factor exposure.' },
];

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

function parseIfString<T>(val: T | string): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return val as unknown as T; }
  }
  return val;
}

function loadGoal(): PortfolioGoal {
  if (typeof window === 'undefined') return 'balanced';
  const stored = window.localStorage.getItem(GOAL_STORAGE_KEY) as PortfolioGoal | null;
  return GOALS.some((goal) => goal.id === stored) ? stored as PortfolioGoal : 'balanced';
}

function saveGoal(goal: PortfolioGoal): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GOAL_STORAGE_KEY, goal);
}

function extractPortfolioData(json: any): PortfolioData | null {
  const payload = json?.data?.intelligence ?? json?.intelligence ?? json?.data ?? json;
  if (!payload) return null;
  return {
    diversification_score: Number(payload.diversification_score ?? payload.diversificationScore ?? 0),
    concentration_score: Number(payload.concentration_score ?? payload.concentrationScore ?? 0),
    factor_exposure: payload.factor_exposure ?? payload.factorExposure ?? {},
    risk_exposure: payload.risk_exposure ?? payload.riskExposure ?? {},
    portfolio_health: String(payload.portfolio_health ?? payload.portfolioHealth ?? 'Data unavailable'),
    portfolio_fragility: String(payload.portfolio_fragility ?? payload.portfolioFragility ?? 'Data unavailable'),
    portfolio_resilience: String(payload.portfolio_resilience ?? payload.portfolioResilience ?? 'Data unavailable'),
    stock_count: Number(payload.stock_count ?? payload.holdingsCount ?? json?.data?.holdingsCount ?? 0),
    sector_count: Number(payload.sector_count ?? payload.sectorCount ?? 0),
  };
}

function goalFit(goal: PortfolioGoal, data: PortfolioData, factors: FactorExposure, risk: RiskExposure): { label: string; detail: string; tone: string } {
  const aggregateRisk = risk.aggregate_risk ?? 0.5;
  const concentration = data.concentration_score ?? 0;
  const diversification = data.diversification_score ?? 0;
  const growth = factors.growth ?? 0;
  const momentum = factors.momentum ?? 0;
  const quality = factors.quality ?? 0;

  if (goal === 'capital_preservation') {
    const fits = aggregateRisk <= 0.45 && concentration <= 0.35 && data.portfolio_resilience === 'STRONG';
    return fits
      ? { label: 'Goal aligned', detail: 'Risk, concentration, and resilience currently fit a preservation objective.', tone: 'bg-green-100 text-green-900' }
      : { label: 'Goal mismatch', detail: 'Preservation needs lower concentration, lower aggregate risk, or stronger resilience evidence.', tone: 'bg-amber-100 text-amber-900' };
  }

  if (goal === 'growth') {
    const fits = growth >= 0.55 && momentum >= 0.45 && quality >= 0.45;
    return fits
      ? { label: 'Goal aligned', detail: 'Growth, momentum, and quality exposure currently support a growth objective.', tone: 'bg-green-100 text-green-900' }
      : { label: 'Goal watch', detail: 'Growth objective lacks enough growth, momentum, or quality support in current factor evidence.', tone: 'bg-amber-100 text-amber-900' };
  }

  if (goal === 'income') {
    const fits = aggregateRisk <= 0.5 && concentration <= 0.4 && quality >= 0.5;
    return fits
      ? { label: 'Goal aligned', detail: 'Current risk, concentration, and quality evidence fit a steadier income-oriented profile.', tone: 'bg-green-100 text-green-900' }
      : { label: 'Goal watch', detail: 'Income objective needs steadier risk, less concentration, or stronger quality evidence.', tone: 'bg-amber-100 text-amber-900' };
  }

  const fits = diversification >= 0.45 && aggregateRisk <= 0.65;
  return fits
    ? { label: 'Goal aligned', detail: 'Diversification and aggregate risk currently fit a balanced objective.', tone: 'bg-green-100 text-green-900' }
    : { label: 'Goal watch', detail: 'Balanced objective needs more diversification or lower aggregate risk.', tone: 'bg-amber-100 text-amber-900' };
}

function Bar({ label, value, color = 'bg-blue-500' }: { label: string; value: number; color?: string }) {
  const pct = Math.min(100, Math.round(value * 100));
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
  const [goal, setGoal] = useState<PortfolioGoal>(() => loadGoal());

  const holdings = useMemo(() => PortfolioEngine.getHoldings(), []);

  useEffect(() => {
    if (holdings.length === 0) {
      setState('empty');
      return;
    }

    const totalCost = holdings.reduce((sum, holding) => sum + holding.shares * holding.avgBuyPrice, 0);
    const positions = holdings.map((holding) => ({
      symbol: holding.symbol,
      weight: totalCost > 0 ? Number(((holding.shares * holding.avgBuyPrice) / totalCost).toFixed(4)) : 0,
    })).filter((position) => position.weight > 0);

    if (positions.length === 0) {
      setState('empty');
      return;
    }

    fetch('/api/intelligence/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions, goal }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: any) => {
        const parsed = extractPortfolioData(json);
        if (!parsed || (parsed.stock_count === 0 && parsed.sector_count === 0 && !parsed.portfolio_health)) {
          setState('empty');
        } else {
          setData(parsed);
          setState('loaded');
        }
      })
      .catch((e: Error) => {
        setError(e.message);
        setState('error');
      });
  }, [goal, holdings]);

  const handleGoalChange = (nextGoal: PortfolioGoal) => {
    setGoal(nextGoal);
    saveGoal(nextGoal);
    setState('loading');
  };

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

  if (state === 'empty' || !data) {
    return (
      <div className="p-8 border-4 border-dashed border-black bg-gray-50 text-center" style={{ boxShadow: '6px 6px 0px #000' }}>
        <p className="font-extrabold text-2xl mb-2">No Portfolio Data</p>
        <p className="text-sm text-gray-600">
          Add stocks to your portfolio and choose a goal to see goal-linked diagnostics.
        </p>
      </div>
    );
  }

  const factorExp = parseIfString<FactorExposure>(data.factor_exposure);
  const riskExp = parseIfString<RiskExposure>(data.risk_exposure);
  const factors = factorExp || {};
  const factorEntries = Object.entries(factors) as [string, number][];
  const fit = goalFit(goal, data, factors, riskExp || {});

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-4 border-black bg-yellow-300 p-4" style={{ boxShadow: '6px 6px 0px #000' }}>
        <h2 className="font-extrabold text-2xl uppercase tracking-wider">
          Portfolio Doctor
        </h2>
        <p className="text-sm font-bold mt-1">{generateExplanation(data)}</p>
      </div>

      <div className="border-4 border-black bg-white p-4" style={{ boxShadow: '6px 6px 0px #000' }}>
        <h3 className="font-extrabold text-lg uppercase mb-3">Goal Link</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          {GOALS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleGoalChange(item.id)}
              className={`border-2 border-black p-3 text-left ${goal === item.id ? 'bg-cyan-200' : 'bg-gray-50'}`}
            >
              <div className="text-xs font-extrabold uppercase">{item.label}</div>
              <div className="mt-1 text-[10px] font-semibold text-gray-600">{item.description}</div>
            </button>
          ))}
        </div>
        <div className={`mt-4 border-2 border-black p-3 text-sm font-bold ${fit.tone}`}>
          {fit.label}: <span className="font-semibold">{fit.detail}</span>
        </div>
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
            className={`px-4 py-2 border-2 border-black font-extrabold text-lg uppercase ${STATUS_COLORS[riskExp.risk_level || 'MODERATE'] || 'bg-gray-300'} ${STATUS_TEXT[riskExp.risk_level || 'MODERATE'] || 'text-gray-900'}`}
          >
            {riskExp.risk_level || 'N/A'}
          </div>
          <div>
            <p className="text-sm font-bold">Aggregate Risk: {Math.round((riskExp.aggregate_risk || 0.5) * 100)}%</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScoreCard({ label, value, color = 'blue' }: { label: string; value: number; color?: string }) {
  const pct = Math.round(value * 100);
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
