/**
 * TRACK-95N — Attention Centre
 * Top of dashboard. Shows ONLY what needs user attention today.
 * Max 3 Critical + 5 Important. No spam.
 * 
 * Powered by: SignalValidationEngine, prediction_registry, watchlists.
 */
import React, { useEffect, useMemo, useState } from "react";

interface AttentionItem {
  id: string;
  severity: "critical" | "important";
  symbol: string;
  title: string;
  detail: string;
  action: string;
  actionUrl: string;
  timestamp: string;
}

interface AttentionCentreProps {
  /** List of watchlist symbols to filter for */
  watchlistSymbols?: string[];
  /** Max items to show before "Show more" */
  limit?: number;
}

const MAX_CRITICAL = 3;
const MAX_IMPORTANT = 5;

export default function AttentionCentre({ watchlistSymbols = [], limit = MAX_CRITICAL + MAX_IMPORTANT }: AttentionCentreProps): JSX.Element {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttention = async () => {
      try {
        const res = await fetch("/api/intelligence/attention?limit=15");
        if (res.ok) {
          const data = await res.json();
          let attentionItems: AttentionItem[] = (data.items ?? []).map((i: any) => ({
            id: i.id ?? crypto.randomUUID(),
            severity: i.severity ?? "important",
            symbol: i.symbol ?? "",
            title: i.title ?? i.signalType ?? "",
            detail: i.detail ?? i.reason ?? "",
            action: i.action ?? "View stock",
            actionUrl: i.actionUrl ?? `/?page=stock&id=${encodeURIComponent(i.symbol)}`,
            timestamp: i.timestamp ?? new Date().toISOString(),
          }));

          // Prioritize: watchlist items first, then by severity
          if (watchlistSymbols.length > 0) {
            attentionItems = attentionItems.sort((a, b) => {
              const aInWatchlist = watchlistSymbols.includes(a.symbol) ? 0 : 1;
              const bInWatchlist = watchlistSymbols.includes(b.symbol) ? 0 : 1;
              if (aInWatchlist !== bInWatchlist) return aInWatchlist - bInWatchlist;
              if (a.severity === "critical" && b.severity !== "critical") return -1;
              if (b.severity === "critical" && a.severity !== "critical") return 1;
              return 0;
            });
          }

          setItems(attentionItems.slice(0, limit));
        }
      } catch {
        // Fallback: no attention items
      } finally {
        setLoading(false);
      }
    };
    fetchAttention();
  }, [watchlistSymbols.join(","), limit]);

  const critical = items.filter(i => i.severity === "critical").slice(0, MAX_CRITICAL);
  const important = items.filter(i => i.severity === "important").slice(0, MAX_IMPORTANT);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#0D1117] border border-white/[0.06] rounded-xl p-4 animate-pulse">
            <div className="h-4 w-32 bg-white/[0.04] rounded mb-2" />
            <div className="h-3 w-64 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <div className="text-[#E6EDF3] text-sm font-medium">Nothing needs attention</div>
        <div className="text-white/30 text-xs mt-1">All watchlist stocks are stable today</div>
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
                className="block bg-[#0D1117] border border-red-500/20 hover:border-red-500/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#E6EDF3]">{item.symbol}</span>
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
                    {item.severity}
                  </span>
                </div>
                <div className="mt-1.5 text-sm text-[#E6EDF3] font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-white/50">{item.detail}</div>
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
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Important</span>
          </div>
          <div className="space-y-2">
            {important.map(item => (
              <a
                key={item.id}
                href={item.actionUrl}
                className="block bg-[#0D1117] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#E6EDF3]">{item.symbol}</span>
                </div>
                <div className="mt-1 text-sm text-[#E6EDF3]/80">{item.title}</div>
                <div className="mt-1 text-xs text-white/40">{item.detail}</div>
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
          +{items.length - critical.length - important.length} more items
        </button>
      )}
    </div>
  );
}
