/**
 * TRACK-48 AGENT B — Stock Compare Tool
 * 
 * Compare two companies across: Health, Future Health, Quality, Risk, Narrative, Prediction Accuracy.
 * Winner by category. No recommendations. No buy/sell language.
 */
import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, Brain, CheckCircle2, Gauge,
  Heart, Scale, Shield, Sparkles, TrendingUp, Trophy, XCircle, Zap,
} from 'lucide-react';

interface CompareResult {
  healthScore: number | null;
  classification: string;
  growth: number | null;
  quality: number | null;
  stability: number | null;
  valuation: number | null;
  momentum: number | null;
  risk: number | null;
  futureHealth3m: number | null;
  futureHealth6m: number | null;
  futureHealth12m: number | null;
  narrative: string;
  hitRate: number | null;
  avgAlpha: number | null;
  asOf: string | null;
  lineage: Array<{ sourceTable?: string | null; provider?: string | null; asOf?: string | null; isFallback?: boolean; isSynthetic?: boolean }>;
  missingInputs: string[];
  evidenceState: 'available' | 'partial' | 'unavailable';
}

interface CategoryResult {
  category: string;
  companyA: number;
  companyB: number;
  winner: 'A' | 'B' | 'tie';
  diff: number;
}

function finiteScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function weightedScore(parts: Array<[number | null, number]>): number | null {
  if (parts.some(([score]) => score === null)) return null;
  return Math.round(parts.reduce((sum, [score, weight]) => sum + (score as number) * weight, 0));
}

function fetchCompareResult(symbol: string): Promise<CompareResult> {
  return fetch(`/api/stockstory/${encodeURIComponent(symbol)}`)
    .then(r => r.json())
    .then(data => {
      if (!data || data.status === 'unavailable') {
        throw new Error(data?.reason ?? 'STOCKSTORY_UNAVAILABLE');
      }
      const payload = data.data ?? data;
      const growth = finiteScore(payload.growth);
      const quality = finiteScore(payload.quality);
      const stability = finiteScore(payload.stability);
      const valuation = finiteScore(payload.valuation);
      const momentum = finiteScore(payload.momentum);
      const risk = finiteScore(payload.risk);
      const lineage = Array.isArray(data.dataState?.lineage) ? data.dataState.lineage : Array.isArray(data.lineage) ? data.lineage : [];
      const missingInputs = Array.isArray(data.dataState?.missingInputs)
        ? data.dataState.missingInputs
        : Array.isArray(data.missingInputs) ? data.missingInputs : [];
      const evidenceState = lineage.length > 0 && missingInputs.length === 0
        ? 'available'
        : lineage.length > 0 ? 'partial' : 'unavailable';

      return {
        healthScore: finiteScore(payload.healthScore ?? payload.rankingScore),
        classification: payload.classification ?? 'Unavailable',
        growth,
        quality,
        stability,
        valuation,
        momentum,
        risk,
        futureHealth3m: weightedScore([[growth, 0.4], [momentum, 0.35], [quality, 0.25]]),
        futureHealth6m: weightedScore([[growth, 0.35], [quality, 0.35], [stability, 0.3]]),
        futureHealth12m: weightedScore([[quality, 0.4], [stability, 0.35], [growth, 0.25]]),
        narrative: payload.narrative ?? 'Analysis unavailable from current source data.',
        hitRate: null,
        avgAlpha: null,
        asOf: data.asOf ?? data.dataState?.asOf ?? null,
        lineage,
        missingInputs,
        evidenceState,
      };
    });
}

function fetchPredictionsCompare(symbol: string): Promise<{ hitRate: number | null; avgAlpha: number | null }> {
  return fetch(`/api/stockstory/${encodeURIComponent(symbol)}/predictions`)
    .then(r => r.json())
    .then((preds: any[]) => {
      const validated = (preds || []).filter((p: any) => p.validation_status === 'validated' && p.future_return !== null);
      if (validated.length === 0) return { hitRate: null, avgAlpha: null };
      const hitRate = Math.round((validated.filter((p: any) => (p.future_return ?? 0) > 0).length / validated.length) * 100);
      const avgAlpha = validated.reduce((s: number, p: any) => s + (p.alpha ?? 0), 0) / validated.length;
      return { hitRate, avgAlpha };
    })
    .catch(() => ({ hitRate: null, avgAlpha: null }));
}

function WinnerBadge({ winner }: { winner: 'A' | 'B' | 'tie' }) {
  if (winner === 'tie') return <span className="text-[9px] font-bold text-white/30">TIE</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
      winner === 'A' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-fuchsia-500/10 text-fuchsia-400'
    }`}>
      {winner === 'A' ? '▲' : '▼'}
    </span>
  );
}

function EvidenceBadge({ data }: { data: CompareResult }) {
  const label = data.evidenceState === 'available'
    ? 'Evidence available'
    : data.evidenceState === 'partial'
      ? 'Partial evidence'
      : 'Evidence unavailable';
  const sourceLabel = data.lineage
    .map(entry => entry.sourceTable || entry.provider)
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-[10px] text-white/45">
      <div className="font-bold uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1">
        As of: <span className="font-mono text-white/70">{data.asOf || 'Data unavailable'}</span>
      </div>
      <div>
        Source: <span className="font-mono text-white/70">{sourceLabel || 'Data unavailable'}</span>
      </div>
      {data.missingInputs.length > 0 && (
        <div>Missing: {data.missingInputs.slice(0, 3).join(', ')}</div>
      )}
    </div>
  );
}

function CategoryCard({ result, labelA, labelB }: {
  result: CategoryResult; labelA: string; labelB: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{result.category}</span>
        <WinnerBadge winner={result.winner} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-cyan-400 font-mono font-bold">{result.companyA}</span>
          <span className="text-fuchsia-400 font-mono font-bold">{result.companyB}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-l-full transition-all duration-700"
            style={{ width: `${Math.min(result.companyA / (result.companyA + result.companyB || 1) * 100, 100)}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 rounded-r-full transition-all duration-700"
            style={{ width: `${Math.min(result.companyB / (result.companyA + result.companyB || 1) * 100, 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-white/30 text-right">
          Difference: {Math.abs(result.diff)}
        </div>
      </div>
    </div>
  );
}

export const StockCompare: React.FC = () => {
  const [symA, setSymA] = useState('');
  const [symB, setSymB] = useState('');
  const [dataA, setDataA] = useState<CompareResult | null>(null);
  const [dataB, setDataB] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [compared, setCompared] = useState(false);

  const handleCompare = () => {
    if (!symA.trim() || !symB.trim()) return;
    setLoading(true);
    setCompared(true);

    Promise.all([
      fetchCompareResult(symA.trim().toUpperCase()),
      fetchCompareResult(symB.trim().toUpperCase()),
      fetchPredictionsCompare(symA.trim().toUpperCase()),
      fetchPredictionsCompare(symB.trim().toUpperCase()),
    ]).then(([a, b, pa, pb]) => {
      setDataA({ ...a, hitRate: pa.hitRate, avgAlpha: pa.avgAlpha });
      setDataB({ ...b, hitRate: pb.hitRate, avgAlpha: pb.avgAlpha });
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const buildCategory = (category: string, companyA: number | null, companyB: number | null, lowerIsBetter = false): CategoryResult | null => {
    if (companyA === null || companyB === null) return null;
    const winner = lowerIsBetter
      ? companyA < companyB ? 'A' : companyA > companyB ? 'B' : 'tie'
      : companyA > companyB ? 'A' : companyA < companyB ? 'B' : 'tie';
    return { category, companyA, companyB, winner, diff: Math.abs(companyA - companyB) };
  };

  const categories: CategoryResult[] = dataA && dataB ? [
    buildCategory('Health Score', dataA.healthScore, dataB.healthScore),
    buildCategory('Business Quality', dataA.quality, dataB.quality),
    buildCategory('Growth Outlook', dataA.growth, dataB.growth),
    buildCategory('Financial Stability', dataA.stability, dataB.stability),
    buildCategory('Valuation', dataA.valuation, dataB.valuation),
    buildCategory('Risk (Lower = Better)', dataA.risk, dataB.risk, true),
    buildCategory('3M Future Health', dataA.futureHealth3m, dataB.futureHealth3m),
    buildCategory('12M Future Health', dataA.futureHealth12m, dataB.futureHealth12m),
    buildCategory('Prediction Hit Rate', dataA.hitRate, dataB.hitRate),
  ].filter((item): item is CategoryResult => item !== null) : [];

  const aWins = categories.filter(c => c.winner === 'A').length;
  const bWins = categories.filter(c => c.winner === 'B').length;
  const ties = categories.filter(c => c.winner === 'tie').length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-16">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015] p-6">
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-extrabold text-white">Stock Compare</h2>
          </div>
          <p className="text-xs text-white/40">Compare two companies across key dimensions — data-driven, not opinion</p>
        </div>
      </div>

      {/* Input */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          value={symA}
          onChange={e => setSymA(e.target.value.toUpperCase())}
          placeholder="RELIANCE"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono font-bold text-cyan-400 placeholder-white/20 outline-none focus:border-cyan-400 transition-colors"
          maxLength={15}
          onKeyDown={e => e.key === 'Enter' && handleCompare()}
        />
        <ArrowRight className="h-5 w-5 text-white/20 shrink-0" />
        <input
          value={symB}
          onChange={e => setSymB(e.target.value.toUpperCase())}
          placeholder="INFY"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono font-bold text-fuchsia-400 placeholder-white/20 outline-none focus:border-fuchsia-400 transition-colors"
          maxLength={15}
          onKeyDown={e => e.key === 'Enter' && handleCompare()}
        />
        <button
          onClick={handleCompare}
          disabled={!symA.trim() || !symB.trim() || loading}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        {[
          ['RELIANCE', 'INFY'],
          ['TCS', 'INFY'],
          ['HDFCBANK', 'ICICIBANK'],
          ['HAL', 'BEL'],
          ['SBIN', 'HDFCBANK'],
        ].map(([a, b]) => (
          <button
            key={`${a}-${b}`}
            onClick={() => { setSymA(a); setSymB(b); }}
            className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[10px] text-white/50 hover:text-white hover:border-white/20 transition-colors"
          >
            {a} vs {b}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <span className="text-sm font-semibold text-cyan-400 uppercase animate-pulse">Analyzing...</span>
          </div>
        </div>
      )}

      {compared && !loading && dataA && dataB && (
        <>
          {/* Summary */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="text-center mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">Overall Result</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-cyan-400">{symA}</div>
                  <div className="text-xs text-white/40">{dataA.classification}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-400">{aWins}</div>
                  <span className="text-xs text-white/20">-</span>
                  <div className="rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 px-3 py-1 text-xs font-bold text-fuchsia-400">{bWins}</div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-fuchsia-400">{symB}</div>
                  <div className="text-xs text-white/40">{dataB.classification}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/50">
                {aWins > bWins ? `${symA} leads in ${aWins} of ${categories.length} categories` :
                 bWins > aWins ? `${symB} leads in ${bWins} of ${categories.length} categories` :
                 'Equal across all categories — no clear leader'}
                {ties > 0 ? ` (${ties} tied)` : ''}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <EvidenceBadge data={dataA} />
            <EvidenceBadge data={dataB} />
          </div>

          {/* Category Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat, i) => (
              <CategoryCard key={i} result={cat} labelA={symA} labelB={symB} />
            ))}
          </div>

          {/* Narratives */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">{symA} Narrative</div>
              <p className="text-xs text-cyan-200/70 leading-relaxed">{dataA.narrative}</p>
            </div>
            <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.03] p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 mb-2">{symB} Narrative</div>
              <p className="text-xs text-fuchsia-200/70 leading-relaxed">{dataB.narrative}</p>
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-[11px] leading-relaxed text-white/40 text-center">
        This comparison is based on quantitative factor analysis from StockStory India's scoring engines.
        It does not provide investment advice, recommendations, or buy/sell signals.
        All assessments are data-driven and reflect current engine outputs.
      </div>
    </div>
  );
};

export default StockCompare;
