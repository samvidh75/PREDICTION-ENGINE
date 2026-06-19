/**
 * TRACK-95O — Today's Changes Panel
 * Consumes real prediction_registry signals via SignalFeedEngine.
 * Shows upgrades, downgrades, confidence moves, factor changes, and ranking shifts.
 * 
 * All signals are traceable to prediction_registry snapshot diffs.
 * No synthetic events. No inferred upgrades. No pseudo scoring.
 */
import React, { useEffect, useState, useMemo } from "react";
import { generateSignalFeed, type IntelligenceSignal } from "../../intelligence/SignalFeedEngine";

const SEVERITY_COLORS = {
  critical: { bg: "rgba(255,91,110,0.12)", border: "rgba(255,91,110,0.30)", dot: "#FF5B6E" },
  important: { bg: "rgba(255,179,71,0.12)", border: "rgba(255,179,71,0.25)", dot: "#FFB347" },
  monitor: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", dot: "rgba(255,255,255,0.4)" },
} as const;

const TYPE_ICONS: Record<string, string> = {
  classification_upgrade: "↑",
  classification_downgrade: "↓",
  upgrade: "↑",
  downgrade: "↓",
  confidence_increase: "↗",
  confidence_decrease: "↘",
  factor_change: "⚡",
  factor_improvement: "+",
  factor_deterioration: "−",
  ranking_change: "⇅",
  ranking_entered: "★",
  ranking_left: "◊",
  classification_change: "↻",
  watchlist_attention: "⊕",
};

function SeverityBadge({ severity }: { severity: string }) {
  const c = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.monitor;
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
    symbolsAnalyzed: number;
  } | null>(null);
  const [dataSource, setDataSource] = useState<"backend" | "unavailable">("unavailable");
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
          setDataSource(result.dataSource);
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
          Analysing prediction registry deltas...
        </div>
      </div>
    );
  }

  // ── Backend unavailable — honest state ──
  if (dataSource === "unavailable") {
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
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "16px 0", textAlign: "center", lineHeight: 1.6 }}>
          Research signals are currently unavailable.<br />
          Signals will appear when the data pipeline is active.
        </div>
        {summary && summary.watchlistMonitored > 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 8 }}>
            {summary.watchlistMonitored} watchlist stocks monitored
          </div>
        )}
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
          Unable to load signals. {error}
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

  // ── Empty state — backend available, no significant diffs ──
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
          {summary && summary.symbolsAnalyzed > 0
            ? `${summary.symbolsAnalyzed} symbols analyzed — no significant changes detected. Markets are stable.`
            : "No significant changes detected today. Markets are stable."}
        </div>
        {summary && summary.watchlistMonitored > 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 8 }}>
            {summary.watchlistMonitored} watchlist stocks monitored
          </div>
        )}
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
          Today's Signals
        </div>
        {summary && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {summary.upgrades > 0 && (
              <span style={{ fontSize: 11, color: "#00D17A", fontWeight: 700 }}>
                {summary.upgrades} ↑
              </span>
            )}
            {summary.downgrades > 0 && (
              <span style={{ fontSize: 11, color: "#FF5B6E", fontWeight: 700 }}>
                {summary.downgrades} ↓
              </span>
            )}
            {summary.confidenceIncreases > 0 && (
              <span style={{ fontSize: 11, color: "#57B9FF", fontWeight: 600 }}>
                {summary.confidenceIncreases} conf ↑
              </span>
            )}
            {summary.confidenceDecreases > 0 && (
              <span style={{ fontSize: 11, color: "#FFB347", fontWeight: 600 }}>
                {summary.confidenceDecreases} conf ↓
              </span>
            )}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {summary.symbolsAnalyzed > 0 ? `${summary.symbolsAnalyzed} symbols` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Signal list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleSignals.map((s, i) => {
          const sev = s.severity ?? "monitor";
          const c = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.monitor;
          const icon = TYPE_ICONS[s.type] ?? "●";

          return (
            <a
              key={`${s.symbol}:${s.type}:${i}`}
              href={`/?page=stock&symbol=${s.symbol}`}
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", `/?page=stock&symbol=${s.symbol}`);
                window.dispatchEvent(new Event("urlchange"));
              }}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
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
                (e.currentTarget as HTMLAnchorElement).style.background = c.bg.replace("0.12", "0.2").replace("0.04", "0.08");
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = c.bg;
              }}
            >
              <span style={{
                width: 22, height: 22,
                borderRadius: 6,
                background: c.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                color: c.dot,
                flexShrink: 0,
              }}>
                {icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                  {s.symbol}
                  <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                    {typeof s.delta === 'string' ? s.delta : s.delta != null ? `${s.delta}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.explanation}
                </div>
                {s.validation && s.validation.historicalSuccessRate !== null && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                    Historical: {s.validation.historicalSuccessRate}% success · n={s.validation.sampleSize}
                    {s.validation.avgAlpha !== null ? ` · α=${s.validation.avgAlpha}%` : ''}
                  </div>
                )}
              </div>
              <SeverityBadge severity={sev} />
            </a>
          );
        })}
      </div>

      {signals.length > 15 && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 4 }}>
          +{signals.length - 15} more signals
        </div>
      )}
    </div>
  );
}
