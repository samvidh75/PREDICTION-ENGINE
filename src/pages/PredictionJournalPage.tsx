/**
 * TRACK-48 AGENT E — Prediction Journal
 * Public prediction history per company.
 * Core moat: nobody else exposes prediction history cleanly.
 */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Clock, History, Target, TrendingUp, Trophy, XCircle } from 'lucide-react';

interface PredictionRecord {
  id: string;
  symbol: string;
  prediction_date: string;
  ranking_score: number;
  classification: string;
  confidence_score: number;
  confidence_level: string;
  quality_score: number;
  growth_score: number;
  value_score: number;
  momentum_score: number;
  risk_score: number;
  price_at_prediction: number;
  validation_status: string;
  future_return: number | null;
  benchmark_return: number | null;
  alpha: number | null;
}

interface PredictionStats {
  totalPredictions: number;
  validatedPredictions: number;
  hitRate: number;
  averageAlpha: number;
  averageConfidence: number;
  bestPrediction: { date: string; alpha: number } | null;
}

export const PredictionJournalPage: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [symbols, setSymbols] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/predictions/journal')
      .then(r => r.json())
      .then(data => {
        const preds: PredictionRecord[] = Array.isArray(data) ? data : [];
        setPredictions(preds);
        const uniqueSymbols = [...new Set(preds.map(p => p.symbol))].sort();
        setSymbols(uniqueSymbols);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = selectedSymbol === 'ALL'
    ? predictions
    : predictions.filter(p => p.symbol === selectedSymbol);

  const stats: PredictionStats = React.useMemo(() => {
    const validated = filtered.filter(p => p.validation_status === 'validated' && p.future_return !== null);
    const hitRate = validated.length > 0
      ? Math.round((validated.filter(p => (p.future_return ?? 0) > 0).length / validated.length) * 100)
      : 0;
    const avgAlpha = validated.length > 0
      ? validated.reduce((s, p) => s + (p.alpha ?? 0), 0) / validated.length
      : 0;
    const avgConf = filtered.length > 0
      ? Math.round(filtered.reduce((s, p) => s + p.confidence_score, 0) / filtered.length)
      : 0;
    const best = validated
      .filter(p => p.alpha !== null)
      .sort((a, b) => (b.alpha ?? 0) - (a.alpha ?? 0))[0] ?? null;

    return {
      totalPredictions: filtered.length,
      validatedPredictions: validated.length,
      hitRate,
      averageAlpha: avgAlpha,
      averageConfidence: avgConf,
      bestPrediction: best ? { date: best.prediction_date, alpha: best.alpha! } : null,
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <span className="text-sm font-semibold text-amber-400 uppercase animate-pulse">Loading Prediction Journal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Prediction Journal</h1>
          <p className="text-xs text-white/40 mt-1">Public prediction history — transparent, verifiable, immutable</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
          <Target className="h-3.5 w-3.5" />
          Core Moat
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Total Predictions</div>
          <div className="text-2xl font-extrabold text-amber-400">{stats.totalPredictions}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Validated</div>
          <div className="text-2xl font-extrabold text-cyan-400">{stats.validatedPredictions}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Hit Rate</div>
          <div className="text-2xl font-extrabold text-emerald-400">{stats.hitRate}%</div>
          <div className="text-[9px] text-white/30">Directionally correct</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Avg Alpha</div>
          <div className={`text-2xl font-extrabold ${stats.averageAlpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.averageAlpha >= 0 ? '+' : ''}{stats.averageAlpha.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Avg Confidence</div>
          <div className="text-2xl font-extrabold text-indigo-400">{stats.averageConfidence}/100</div>
        </div>
      </div>

      {/* Best Prediction */}
      {stats.bestPrediction && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-emerald-400" />
          <div>
            <div className="text-sm font-bold text-emerald-300">Best Prediction</div>
            <div className="text-xs text-emerald-400/70">
              {stats.bestPrediction.date} — Alpha: +{stats.bestPrediction.alpha.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Symbol Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSymbol('ALL')}
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            selectedSymbol === 'ALL'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-white/[0.02] text-white/40 border border-white/10 hover:text-white'
          }`}
        >
          All ({predictions.length})
        </button>
        {symbols.map(sym => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              selectedSymbol === sym
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/[0.02] text-white/40 border border-white/10 hover:text-white'
            }`}
          >
            {sym} ({predictions.filter(p => p.symbol === sym).length})
          </button>
        ))}
      </div>

      {/* Prediction Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-white/40">
              <th className="p-3 text-left font-bold uppercase tracking-wider">Date</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Symbol</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Score</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Classification</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Confidence</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Price</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Status</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Actual Return</th>
              <th className="p-3 text-left font-bold uppercase tracking-wider">Alpha</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 50).map((p) => (
              <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="p-3 font-mono text-white/60">{p.prediction_date}</td>
                <td className="p-3 font-mono font-bold text-white">{p.symbol}</td>
                <td className="p-3 font-mono font-bold text-amber-400">{p.ranking_score.toFixed(0)}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    p.classification === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400' :
                    p.classification === 'Healthy' ? 'bg-cyan-500/10 text-cyan-400' :
                    p.classification === 'Stable' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>{p.classification}</span>
                </td>
                <td className="p-3">
                  <span className={`${
                    p.confidence_level === 'Very High' ? 'text-indigo-400' :
                    p.confidence_level === 'High' ? 'text-cyan-400' :
                    p.confidence_level === 'Medium' ? 'text-amber-400' :
                    'text-rose-400'
                  }`}>{p.confidence_level} ({p.confidence_score})</span>
                </td>
                <td className="p-3 font-mono text-white/50">₹{p.price_at_prediction?.toFixed(2) || '—'}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    p.validation_status === 'validated' ? 'bg-emerald-500/10 text-emerald-400' :
                    p.validation_status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-white/5 text-white/40'
                  }`}>{p.validation_status}</span>
                </td>
                <td className={`p-3 font-mono font-bold ${(p.future_return ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {p.future_return !== null ? `${(p.future_return >= 0 ? '+' : '')}${(p.future_return * 100).toFixed(1)}%` : '—'}
                </td>
                <td className={`p-3 font-mono font-bold ${(p.alpha ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {p.alpha !== null ? `${(p.alpha >= 0 ? '+' : '')}${(p.alpha * 100).toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-white/30 text-sm">
          No predictions recorded yet. Predictions are generated daily and will appear here.
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-[11px] leading-relaxed text-white/40 text-center">
        All predictions are recorded before outcomes. Results are validated after the prediction horizon passes.
        Predictions are never retroactively edited. This journal is the immutable record of StockStory's analytical output.
      </div>
    </div>
  );
};

export default PredictionJournalPage;
