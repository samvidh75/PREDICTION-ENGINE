/**
 * TRACK-95T — "Why It Changed" Tab
 * 
 * Displays prediction explainability for a stock page.
 * Pulls from GET /api/predictions/explain/:symbol.
 * 
 * Shows:
 * - Health Score delta (yesterday vs today)
 * - Classification changes
 * - Factor drivers ranked by contribution
 * - Historical reliability data from SignalValidationEngine
 */
import React, { useEffect, useState } from "react";

interface Driver {
  factor: string;
  previous: number;
  current: number;
  delta: number;
  percentContribution: number;
  importanceRank: number;
}

interface HistoricalReliability {
  signalType: string;
  successRate: number;
  sampleSize: number;
  avgAlphaPct: number;
  predictivePower: string;
}

interface ExplanationData {
  symbol: string;
  classification: { from: string | null; to: string; changed: boolean };
  healthScore: { from: number | null; to: number; delta: number | null };
  summary: string;
  drivers: Driver[];
  positives: string[];
  negatives: string[];
  factorContributions: {
    factor: string;
    delta: number;
    percentContribution: number;
    importanceRank: number;
    direction: string;
  }[];
  historicalReliability: HistoricalReliability | null;
  generatedAt: string;
}

const PREDICTIVE_POWER_COLORS: Record<string, string> = {
  Strong: "#00D17A",
  Moderate: "#FFB347",
  Weak: "rgba(255,255,255,0.45)",
  "Not Predictive": "rgba(255,91,110,0.6)",
};

const DRIVER_COLORS: Record<number, string> = {
  1: "#06b6d4",
  2: "#8b5cf6",
  3: "#f59e0b",
  4: "rgba(255,255,255,0.4)",
  5: "rgba(255,255,255,0.3)",
  6: "rgba(255,255,255,0.2)",
};

interface WhyItChangedTabProps {
  symbol: string;
}

export default function WhyItChangedTab({ symbol }: WhyItChangedTabProps): JSX.Element {
  const [data, setData] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/predictions/explain/${encodeURIComponent(symbol)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? 'Failed to load explanation');
        }
        return res.json();
      })
      .then((explanation: ExplanationData) => {
        if (!cancelled) setData(explanation);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol]);

  // Loading state
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: 16,
          }}>
            <div style={{ height: 12, width: "40%", background: "rgba(255,255,255,0.04)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 8, width: "60%", background: "rgba(255,255,255,0.03)", borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div style={{
        background: "rgba(255,91,110,0.06)",
        border: "1px solid rgba(255,91,110,0.15)",
        borderRadius: 12,
        padding: 20,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
          Explanation Unavailable
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {error || "Unable to load prediction explanation for this symbol."}
        </div>
      </div>
    );
  }

  // No previous snapshot
  if (!data.classification.from) {
    return (
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 20,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
          First Prediction
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
          This is the first prediction for {data.symbol}. Change tracking begins with the next prediction cycle.
        </div>
      </div>
    );
  }

  const hs = data.healthScore;
  const classChange = data.classification;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* --- Summary Banner --- */}
      <div style={{
        background: "rgba(6,182,212,0.05)",
        border: "1px solid rgba(6,182,212,0.15)",
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
          What Changed
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>
          {data.summary}
        </div>
      </div>

      {/* --- Health Score Delta --- */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
          Health Score
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 4 }}>Yesterday</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: hs.delta !== null && hs.delta > 0 ? "#00D17A" : "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>
              {hs.from ?? "—"}
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.25)" }}>→</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 4 }}>Today</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#E6EDF3", fontVariantNumeric: "tabular-nums" }}>
              {hs.to}
            </div>
          </div>
          {hs.delta !== null && (
            <div style={{
              background: hs.delta > 0 ? "rgba(0,209,122,0.1)" : "rgba(255,91,110,0.1)",
              border: `1px solid ${hs.delta > 0 ? "rgba(0,209,122,0.25)" : "rgba(255,91,110,0.25)"}`,
              borderRadius: 8,
              padding: "4px 12px",
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: hs.delta > 0 ? "#00D17A" : "#FF5B6E" }}>
                {hs.delta > 0 ? '+' : ''}{hs.delta}
              </span>
            </div>
          )}
        </div>

        {/* Classification change */}
        {classChange.changed && (
          <div style={{ marginTop: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginRight: 8 }}>Classification:</span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: classChange.from && classChange.from !== classChange.to
                ? (hs.delta && hs.delta > 0 ? "#00D17A" : "#FF5B6E") : "#E6EDF3",
            }}>
              {classChange.from} → {classChange.to}
            </span>
          </div>
        )}
      </div>

      {/* --- Biggest Drivers --- */}
      {data.drivers.filter(d => Math.abs(d.delta) >= 3).length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
            Biggest Drivers
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.drivers.filter(d => Math.abs(d.delta) >= 3).slice(0, 6).map(d => {
              const barWidth = Math.min(Math.abs(d.delta * 2), 100);
              const barColor = d.delta > 0 ? "#00D17A" : "#FF5B6E";
              const rankColor = DRIVER_COLORS[d.importanceRank] ?? "rgba(255,255,255,0.3)";

              return (
                <div key={d.factor} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 6,
                        background: rankColor.replace(/[^,]+$/, "0.15)").replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, "rgba($1,$2,$3,0.15)"),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: rankColor,
                      }}>
                        {d.importanceRank}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                        {d.factor}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor, fontVariantNumeric: "tabular-nums" }}>
                      {d.delta > 0 ? '+' : ''}{d.delta}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${barWidth}%`,
                        height: "100%",
                        background: barColor,
                        borderRadius: 2,
                        transition: "width 0.6s ease-out",
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", minWidth: 36, textAlign: "right" }}>
                      {d.percentContribution}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Factor Contribution Table --- */}
      {data.factorContributions.length > 1 && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 16,
          overflow: "auto",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
            Factor Contributions
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Rank</th>
                <th style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Factor</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Delta</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Contribution</th>
                <th style={{ textAlign: "center", padding: "6px 8px", fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Direction</th>
              </tr>
            </thead>
            <tbody>
              {data.factorContributions.map(fc => (
                <tr key={fc.factor} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: "8px", color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                    #{fc.importanceRank}
                  </td>
                  <td style={{ padding: "8px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                    {fc.factor}
                  </td>
                  <td style={{
                    padding: "8px",
                    textAlign: "right",
                    fontWeight: 700,
                    color: fc.delta >= 0 ? "#00D17A" : "#FF5B6E",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {fc.delta > 0 ? '+' : ''}{fc.delta}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                    {fc.percentContribution}%
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: fc.direction === 'positive' ? "rgba(0,209,122,0.1)" : "rgba(255,91,110,0.1)",
                      color: fc.direction === 'positive' ? "#00D17A" : "#FF5B6E",
                    }}>
                      {fc.direction === 'positive' ? '↑ UP' : '↓ DOWN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Positives & Negatives --- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {data.positives.length > 0 && (
          <div style={{
            background: "rgba(0,209,122,0.04)", border: "1px solid rgba(0,209,122,0.12)",
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#00D17A", marginBottom: 8 }}>
              Positives
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              {data.positives.map((p, i) => (
                <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        {data.negatives.length > 0 && (
          <div style={{
            background: "rgba(255,91,110,0.04)", border: "1px solid rgba(255,91,110,0.12)",
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#FF5B6E", marginBottom: 8 }}>
              Negatives
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              {data.negatives.map((n, i) => (
                <li key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- Historical Reliability --- */}
      {data.historicalReliability && (
        <div style={{
          background: "rgba(139,92,246,0.04)",
          border: "1px solid rgba(139,92,246,0.15)",
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>
            Historical Reliability
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: PREDICTIVE_POWER_COLORS[data.historicalReliability.predictivePower] ?? "rgba(255,255,255,0.5)" }}>
                {data.historicalReliability.successRate}%
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Success Rate</div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>
                {data.historicalReliability.sampleSize}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Sample Size</div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: data.historicalReliability.avgAlphaPct >= 0 ? "#00D17A" : "#FF5B6E", fontVariantNumeric: "tabular-nums" }}>
                {data.historicalReliability.avgAlphaPct > 0 ? '+' : ''}{data.historicalReliability.avgAlphaPct}%
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Avg Alpha</div>
            </div>
            <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.08)" }} />
            <div>
              <span style={{
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: `${PREDICTIVE_POWER_COLORS[data.historicalReliability.predictivePower] ?? "rgba(255,255,255,0.15)"}20`,
                color: PREDICTIVE_POWER_COLORS[data.historicalReliability.predictivePower] ?? "rgba(255,255,255,0.5)",
                border: `1px solid ${PREDICTIVE_POWER_COLORS[data.historicalReliability.predictivePower] ?? "rgba(255,255,255,0.15)"}40`,
              }}>
                {data.historicalReliability.predictivePower}
              </span>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
            Signals like this ({data.historicalReliability.signalType}) historically succeeded <strong style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{data.historicalReliability.successRate}%</strong> of the time
            with an average alpha of <strong style={{ color: data.historicalReliability.avgAlphaPct >= 0 ? "#00D17A" : "#FF5B6E", fontWeight: 600 }}>{data.historicalReliability.avgAlphaPct > 0 ? '+' : ''}{data.historicalReliability.avgAlphaPct}%</strong>.
            Based on <strong style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{data.historicalReliability.sampleSize}</strong> validated outcomes.
          </div>
        </div>
      )}

      {/* --- Generated at --- */}
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
        Explanation generated {new Date(data.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
