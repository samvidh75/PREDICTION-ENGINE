/**
 * TRACK-95O — Attention Centre
 * Top of dashboard. Shows ONLY what needs user attention today.
 * Max 3 Critical + 5 Important. No spam.
 * 
 * Powered by: PredictionDiffEngine via GET /api/predictions/signals,
 * SignalValidationEngine, prediction_registry, watchlists.
 * 
 * Priority: Watchlist + Critical > Watchlist + Important > Critical > Important > Monitor
 */
import React, { useEffect, useState } from "react";

interface AttentionItem {
  id: string;
  severity: "critical" | "important" | "monitor";
  symbol: string;
  title: string;
  detail: string;
  action: string;
  actionUrl: string;
  timestamp: string;
  // Validation data
  validation?: {
    historicalSuccessRate: number | null;
    sampleSize: number | null;
    avgAlpha: number | null;
  };
}

interface AttentionCentreProps {
  watchlistSymbols?: string[];
  limit?: number;
}

const MAX_CRITICAL = 3;
const MAX_IMPORTANT = 5;

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  important: '🟠',
  monitor: '⚪',
};

export default function AttentionCentre({ watchlistSymbols = [], limit = MAX_CRITICAL + MAX_IMPORTANT }: AttentionCentreProps): JSX.Element {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAttention = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch("/api/predictions/signals?limit=50");
        if (!res.ok) throw new Error("unavailable");

        const data = await res.json();
        const signals = data.signals ?? [];

        // Map PredictionDiffEngine signals to AttentionItems
        let attentionItems: AttentionItem[] = signals.map((s: any) => ({
          id: `${s.symbol}:${s.type}:${Date.now()}`,
          severity: s.severity ?? "monitor",
          symbol: s.symbol ?? "",
          title: formatTitle(s),
          detail: s.explanation ?? "",
          action: "View stock",
          actionUrl: `/?page=stock&id=${encodeURIComponent(s.symbol)}`,
          timestamp: new Date().toISOString(),
          validation: s.validation ?? undefined,
        }));

        // Priority sort: Watchlist items first, then by severity
        if (watchlistSymbols.length > 0) {
          attentionItems = attentionItems.sort((a, b) => {
            const aInWatchlist = watchlistSymbols.includes(a.symbol) ? 0 : 1;
            const bInWatchlist = watchlistSymbols.includes(b.symbol) ? 0 : 1;
            if (aInWatchlist !== bInWatchlist) return aInWatchlist - bInWatchlist;

            const severityRank = { critical: 0, important: 1, monitor: 2 };
            return severityRank[a.severity] - severityRank[b.severity];
          });
        } else {
          const severityRank = { critical: 0, important: 1, monitor: 2 };
          attentionItems.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
        }

        setItems(attentionItems.slice(0, limit));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAttention();
  }, [watchlistSymbols.join(","), limit]);

  const critical = items.filter(i => i.severity === "critical").slice(0, MAX_CRITICAL);
  const important = items.filter(i => i.severity === "important").slice(0, MAX_IMPORTANT);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-4 animate-pulse">
            <div className="h-4 w-32 bg-white/[0.04] rounded mb-2" />
            <div className="h-3 w-64 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[var(--color-surface)] border border-red-500/10 rounded-xl p-6 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <div className="text-[#E6EDF3] text-sm font-medium">Research signals pending</div>
        <div className="text-white/30 text-xs mt-1">Research signals pending.</div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <div className="text-[#E6EDF3] text-sm font-medium">Nothing needs attention</div>
        <div className="text-white/30 text-xs mt-1">No significant prediction changes detected today</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Critical Items */}
      {critical.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Critical</span>
          </div>
          <div className="space-y-2">
            {critical.map(item => (
              <a
                key={item.id}
                href={item.actionUrl}
                className="block bg-[var(--color-surface)] border border-red-500/20 hover:border-red-500/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#E6EDF3]">{item.symbol}</span>
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
                    critical
                  </span>
                </div>
                <div className="mt-1.5 text-sm text-[#E6EDF3] font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-white/50">{item.detail}</div>
                {item.validation && item.validation.historicalSuccessRate !== null && (
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-white/30">
                    <span>Historical: {item.validation.historicalSuccessRate}% success</span>
                    <span>n={item.validation.sampleSize}</span>
                    {item.validation.avgAlpha !== null && (
                      <span>α={item.validation.avgAlpha > 0 ? '+' : ''}{item.validation.avgAlpha}%</span>
                    )}
                  </div>
                )}
                <div className="mt-2 text-xs text-[#2962FF] group-hover:underline">{item.action} →</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Important Items */}
      {important.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Important</span>
          </div>
          <div className="space-y-2">
            {important.map(item => (
              <a
                key={item.id}
                href={item.actionUrl}
                className="block bg-[var(--color-surface)] border border-[var(--color-border-light)] hover:border-[var(--color-border-accent)] rounded-xl p-3 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#E6EDF3]">{item.symbol}</span>
                </div>
                <div className="mt-1 text-sm text-[#E6EDF3]/80">{item.title}</div>
                <div className="mt-1 text-xs text-white/40">{item.detail}</div>
                {item.validation && item.validation.historicalSuccessRate !== null && (
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/25">
                    <span>{item.validation.historicalSuccessRate}% success</span>
                    <span>n={item.validation.sampleSize}</span>
                  </div>
                )}
                <div className="mt-1.5 text-xs text-[#2962FF] group-hover:underline">{item.action} →</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {items.length > critical.length + important.length && (
        <button
          type="button"
          className="w-full text-center text-xs text-white/30 hover:text-white/50 py-2 transition-colors"
        >
          +{items.length - critical.length - important.length} more monitoring signals
        </button>
      )}
    </div>
  );
}

/** Format signal type into human-readable title */
function formatTitle(signal: any): string {
  const typeMap: Record<string, string> = {
    classification_upgrade: 'Classification Upgrade',
    classification_downgrade: 'Classification Downgrade',
    confidence_increase: 'Confidence Increase',
    confidence_decrease: 'Confidence Decrease',
    factor_change: 'Factor Change',
    ranking_change: 'Ranking Change',
  };
  return typeMap[signal.type] ?? signal.type ?? 'Signal';
}
