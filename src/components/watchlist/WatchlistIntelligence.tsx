/**
 * TRACK-48 AGENT D — Watchlist Intelligence
 * 
 * Replaces traditional watchlists. Shows what changed since yesterday.
 * Answers: What changed since yesterday? at a glance.
 */
import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Bell, Brain,
  Clock, Gauge, Heart, Minus, Shield, Sparkles, TrendingDown, TrendingUp, Zap,
} from 'lucide-react';

interface WatchlistChange {
  symbol: string;
  healthScoreCurrent: number;
  healthScorePrevious: number | null;
  classification: string;
  changes: {
    health: number | null;
    growth: number | null;
    quality: number | null;
    stability: number | null;
    momentum: number | null;
    risk: number | null;
  };
  narrativeChange: string;
  alerts: string[];
}

function ChangeIndicator({ value, label }: { value: number | null; label: string }) {
  if (value === null || value === undefined) return (
    <div className="flex items-center gap-1.5 text-white/20">
      <Minus className="h-3 w-3" />
      <span className="text-[10px]">{label}</span>
    </div>
  );

  const abs = Math.abs(value);
  if (abs < 1) return (
    <div className="flex items-center gap-1.5 text-white/40">
      <Minus className="h-3 w-3" />
      <span className="text-[10px]">{label}: Stable</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-1.5 ${value > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="text-[10px] font-bold">{label}: {value > 0 ? '+' : ''}{abs.toFixed(1)}</span>
    </div>
  );
}

function WatchlistIntelligenceCard({ change }: { change: WatchlistChange }) {
  const hasSignificantChange = Object.values(change.changes).some(v => v !== null && Math.abs(v!) > 5);
  const healthDelta = change.healthScorePrevious !== null ? change.healthScoreCurrent - change.healthScorePrevious : null;
  const healthTrend = healthDelta !== null
    ? (healthDelta > 0 ? 'improving' : healthDelta < 0 ? 'declining' : 'stable')
    : 'unknown';

  return (
    <div className={`rounded-xl border p-4 backdrop-blur-sm transition-colors ${
      hasSignificantChange
        ? 'border-slate-500/30 bg-slate-500/[0.02] hover:border-slate-500/50'
        : 'border-white/5 bg-white/[0.01] hover:border-white/20'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-mono font-semibold text-white">{change.symbol}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`h-1.5 w-1.5 rounded-full ${
              healthTrend === 'improving' ? 'bg-emerald-400' :
              healthTrend === 'declining' ? 'bg-rose-400' :
              'bg-slate-400'
            }`} />
            <span className="text-[9px] text-white/40 uppercase">{healthTrend} since yesterday</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-white">{change.healthScoreCurrent}</div>
          {healthDelta !== null && (
            <div className={`text-[9px] font-bold ${healthDelta > 0 ? 'text-emerald-400' : healthDelta < 0 ? 'text-rose-400' : 'text-white/30'}`}>
              {healthDelta > 0 ? '+' : ''}{healthDelta}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mt-3 pt-3 border-t border-white/5">
        <ChangeIndicator value={change.changes.quality} label="Quality" />
        <ChangeIndicator value={change.changes.growth} label="Growth" />
        <ChangeIndicator value={change.changes.momentum} label="Momentum" />
        <ChangeIndicator value={change.changes.risk ? -change.changes.risk : null} label="Risk" />
      </div>

      {change.narrativeChange && (
        <div className="mt-3 rounded-lg bg-white/[0.02] border border-white/5 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="h-3 w-3 text-slate-400" />
            <span className="text-[9px] font-bold uppercase text-slate-400">Narrative Change</span>
          </div>
          <p className="text-[10px] text-white/60 leading-relaxed">{change.narrativeChange}</p>
        </div>
      )}

      {change.alerts.length > 0 && (
        <div className="mt-3 space-y-1">
          {change.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-300/80">
              <AlertTriangle className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
              {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const WatchlistIntelligence: React.FC<{ symbols: string[] }> = ({ symbols }) => {
  const [changes, setChanges] = useState<WatchlistChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbols.length === 0) { setLoading(false); return; }
    const qs = symbols.join(',');
    fetch(`/api/intelligence/watchlist?symbols=${encodeURIComponent(qs)}`)
      .then(r => r.json())
      .then(data => {
        const mapped: WatchlistChange[] = symbols.map(sym => {
          const mover = (data.movers || []).find((m: any) => m.symbol === sym);
          const scoreChanges = (data.scoreChanges || []).filter((s: any) => s.symbol === sym);
          const changes: any = { health: null, growth: null, quality: null, stability: null, momentum: null, risk: null };
          scoreChanges.forEach((s: any) => {
            if (s.factor === 'Quality') changes.quality = s.change;
            if (s.factor === 'Growth') changes.growth = s.change;
            if (s.factor === 'Momentum') changes.momentum = s.change;
            if (s.factor === 'Risk') changes.risk = s.change;
            if (s.factor === 'Value') changes.stability = s.change;
          });

          const hasSignificant = Object.values(changes).some((v: any) => v !== null && Math.abs(v ?? 0) > 3);
          const alerts: string[] = [];
          scoreChanges.forEach((s: any) => {
            if (Math.abs(s.change) > 5) {
              alerts.push(`${s.factor}: ${s.change > 0 ? '+' : ''}${s.change.toFixed(1)} ${s.change > 0 ? 'rally' : 'decline'} — significant change`);
            }
          });

          return {
            symbol: sym,
            healthScoreCurrent: 50,
            healthScorePrevious: mover ? 50 - (mover.change ?? 0) : null,
            classification: 'Stable',
            changes,
            narrativeChange: hasSignificant
              ? `Factor shifts detected in ${scoreChanges.map((s: any) => s.factor).join(', ')}.`
              : 'No significant factor changes detected.',
            alerts,
          };
        });
        setChanges(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [symbols.join(',')]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white">What Changed Since Yesterday?</h3>
        <span className="text-[9px] text-white/30 ml-2">
          {changes.filter(c => c.alerts.length > 0).length} stock(s) with changes
        </span>
      </div>

      {changes.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.01] p-6 text-center text-sm text-white/30">
          Add stocks to your watchlist to track daily changes.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {changes.map((change) => (
            <WatchlistIntelligenceCard key={change.symbol} change={change} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistIntelligence;
