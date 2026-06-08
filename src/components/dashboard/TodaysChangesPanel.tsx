/**
 * TRACK-95M — Today's Changes Panel
 * Replaces static dashboard cards with live intelligence signals.
 * Consumes SignalFeedEngine to show upgrades, downgrades, confidence moves, 
 * and factor changes in real time.
 */
import React, { useEffect, useState, useMemo } from "react";
import { generateSignalFeed, type IntelligenceSignal } from "../../intelligence/SignalFeedEngine";

interface AggregatedSignal {
  symbol: string;
  type: IntelligenceSignal["type"];
  severity: IntelligenceSignal["severity"];
  explanation: string;
  delta?: number;
}

const SEVERITY_COLORS = {
  high: { bg: "rgba(255,91,110,0.12)", border: "rgba(255,91,110,0.30)", dot: "#FF5B6E" },
  medium: { bg: "rgba(255,179,71,0.12)", border: "rgba(255,179,71,0.25)", dot: "#FFB347" },
  low: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", dot: "rgba(255,255,255,0.4)" },
} as const;

const TYPE_ICONS: Record<IntelligenceSignal["type"], string> = {
  upgrade: "↑",
  downgrade: "↓",
  confidence_increase: "↗",
  confidence_decrease: "↘",
  factor_improvement: "+",
  factor_deterioration: "−",
  ranking_entered: "★",
  ranking_left: "◊",
  classification_change: "↻",
  watchlist_attention: "⊕",
};

function SeverityBadge({ severity }: { severity: IntelligenceSignal["severity"] }) {
  const c = SEVERITY_COLORS[severity];
  return (
    <span
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        padding: "1px 8px",
        fontSize: 10,
        fontWeight: 600,
        color: c.dot,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
      }}
    >
      {severity}
    </span>
  );
}

export default function TodaysChangesPanel(): JSX.Element {
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [summary, setSummary] = useState<{
    upgrades: number; downgrades: number;
    confidenceIncreases: number; confidenceDecreases: number;
    watchlistMonitored: number; totalSignals: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const result = await generateSignalFeed();
        if (!cancelled) {
          setSignals(result.signals);
          setSummary(result.summary);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load signals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visibleSignals = useMemo(() => signals.slice(0, 15), [signals]);

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
          Today's Intelligence
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "20px 0", textAlign: "center" }}>
          Analysing market signals...
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div style={{
        background: "rgba(255,91,110,0.06)",
        border: "1px solid rgba(255,91,110,0.18)",
        borderRadius: 16,
        padding: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,91,110,0.7)", marginBottom: 8 }}>
          Signal Engine
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Unable to load intelligence signals. {error}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (signals.length === 0) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
          Today's Intelligence
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: "12px 0", textAlign: "center" }}>
          No significant changes detected today. Markets are stable.
        </div>
      </div>
    );
  }

  // ── Data state ──
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Executive summary */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)" }}>
          Today's Intelligence
        </div>
        {summary && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {summary.upgrades > 0 && (
              <span style={{ fontSize: 11, color: "#00D17A", fontWeight: 700 }}>
                {summary.upgrades} upgrades
              </span>
            )}
            {summary.downgrades > 0 && (
              <span style={{ fontSize: 11, color: "#FF5B6E", fontWeight: 700 }}>
                {summary.downgrades} downgrades
              </span>
            )}
            {summary.confidenceIncreases > 0 && (
              <span style={{ fontSize: 11, color: "#57B9FF", fontWeight: 600 }}>
                {summary.confidenceIncreases} confidence ↑
              </span>
            )}
            {summary.confidenceDecreases > 0 && (
              <span style={{ fontSize: 11, color: "#FFB347", fontWeight: 600 }}>
                {summary.confidenceDecreases} confidence ↓
              </span>
            )}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {summary.watchlistMonitored} watchlist stocks
            </span>
          </div>
        )}
      </div>

      {/* Signal list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleSignals.map((s, i) => (
          <a
            key={`${s.symbol}:${s.type}:${i}`}
            href={`/?page=stock&symbol=${s.symbol}`}
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", `/?page=stock&symbol=${s.symbol}`);
              window.dispatchEvent(new Event("urlchange"));
            }}
            style={{
              background: SEVERITY_COLORS[s.severity].bg,
              border: `1px solid ${SEVERITY_COLORS[s.severity].border}`,
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = SEVERITY_COLORS[s.severity].bg.replace("0.12", "0.2").replace("0.04", "0.08");
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = SEVERITY_COLORS[s.severity].bg;
            }}
          >
            <span style={{
              width: 22, height: 22,
              borderRadius: 6,
              background: SEVERITY_COLORS[s.severity].bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
              color: SEVERITY_COLORS[s.severity].dot,
              flexShrink: 0,
            }}>
              {TYPE_ICONS[s.type]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                {s.symbol}
                {s.delta != null && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                    {s.delta} pts
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.explanation}
              </div>
            </div>
            <SeverityBadge severity={s.severity} />
          </a>
        ))}
      </div>

      {signals.length > 15 && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 4 }}>
          +{signals.length - 15} more signals
        </div>
      )}
    </div>
  );
}
