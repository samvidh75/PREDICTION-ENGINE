/**
 * TRACK-96A — Validation Dashboard (LIVE)
 * 
 * All metrics sourced from GET /api/validation/performance.
 * No hardcoded numbers. No simulated data.
 */
import React, { useEffect, useState } from "react";
import TrustIndicatorsWidget from "../components/trust/TrustIndicatorsWidget";

interface HorizonMetrics {
  horizon: string;
  totalPredictions: number;
  hitRate: number;
  alphaRate: number;
  avgReturn: number;
  avgAlpha: number;
  calibrationError: number;
}

interface ClassificationPerf {
  classification: string;
  sampleSize: number;
  avgReturn: number;
  hitRate: number;
  expectedRank: number;
  actualRank: number;
}

interface CalibrationPoint {
  confidenceBucket: string;
  expected: number;
  actual: number;
  error: number;
  sampleSize: number;
}

interface FactorRank {
  factor: string;
  predictivePower: number;
  hitRate: number;
  alphaGeneration: number;
  rank: number;
}

interface DriftReport {
  currentPeriod: string;
  previousPeriod: string;
  hitRateChange: number;
  alphaChange: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface ScorecardData {
  hitRate: number;
  alphaRate: number;
  bestFactor: string;
  worstFactor: string;
  calibration: number;
  driftStatus: string;
  perHorizon: Record<string, HorizonMetrics>;
  classification: ClassificationPerf[];
  calibrationCurve: CalibrationPoint[];
  factorRanking: FactorRank[];
  drift: DriftReport;
}

const DRIFT_COLORS: Record<string, string> = {
  healthy: "#00D17A",
  warning: "#FFB347",
  critical: "#FF5B6E",
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  Exceptional: "#00D17A",
  Excellent: "#57B9FF",
  Good: "#8b5cf6",
  Fair: "#FFB347",
  Weak: "rgba(255,91,110,0.8)",
  Critical: "#FF5B6E",
};

export default function ValidationDashboard(): JSX.Element {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/validation/performance")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load performance data");
        return res.json();
      })
      .then((d: ScorecardData) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const horizon30 = data?.perHorizon?.["30d"];

  return (
    <main style={{
      minHeight: "100vh", background: "#020304",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
      padding: "40px 24px", maxWidth: 1100, margin: "0 auto",
    }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Prediction Performance Observatory
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7, margin: "0 0 24px" }}>
          All metrics derived from prediction_registry validated outcomes. No synthetic data.
        </p>
        <TrustIndicatorsWidget />
      </header>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>
          Computing performance metrics from realised outcomes...
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(255,91,110,0.06)", border: "1px solid rgba(255,91,110,0.15)",
          borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#FF5B6E", marginBottom: 8 }}>Data Unavailable</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{error}</div>
        </div>
      )}

      {data && (
        <>
          {/* ── KPI Row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <KpiCard label="30-Day Hit Rate" value={`${data.hitRate}%`} color="#00D17A" />
            <KpiCard label="Alpha Rate" value={`${data.alphaRate}%`} color="#57B9FF" />
            <KpiCard label="Avg Alpha" value={`${horizon30?.avgAlpha ?? '—'}%`} color="rgba(255,255,255,0.9)" />
            <KpiCard label="Calibration Error" value={`${data.calibration}%`} color="#FFB347" />
            <KpiCard label="Drift Status" value={data.driftStatus.toUpperCase()} color={DRIFT_COLORS[data.driftStatus] ?? "#fff"} />
            <KpiCard label="Best Factor" value={data.bestFactor} color="#00D17A" />
          </div>

          {/* ── Horizon Performance ── */}
          {data.perHorizon && Object.keys(data.perHorizon).length > 0 && (
            <Section title="Horizon Performance">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {Object.entries(data.perHorizon).map(([key, h]) => (
                  <div key={key} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: 16,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#E6EDF3", marginBottom: 10 }}>{key} Horizon</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                      <MetricRow label="Predictions" value={h.totalPredictions.toLocaleString()} />
                      <MetricRow label="Hit Rate" value={`${h.hitRate}%`} color="#00D17A" />
                      <MetricRow label="Alpha Rate" value={`${h.alphaRate}%`} color="#57B9FF" />
                      <MetricRow label="Avg Return" value={`${h.avgReturn}%`} color={h.avgReturn >= 0 ? "#00D17A" : "#FF5B6E"} />
                      <MetricRow label="Avg Alpha" value={`${h.avgAlpha}%`} />
                      <MetricRow label="Calibration Err" value={`${h.calibrationError}%`} color="#FFB347" />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Classification Performance ── */}
          {data.classification.length > 0 && (
            <Section title="Classification Performance">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th style={thStyle}>Class</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Samples</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Hit Rate</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Avg Return</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {data.classification.map(c => {
                    const inversion = c.expectedRank !== c.actualRank;
                    return (
                      <tr key={c.classification} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: CLASSIFICATION_COLORS[c.classification] ?? "rgba(255,255,255,0.7)" }}>
                          {c.classification}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "rgba(255,255,255,0.5)" }}>{c.sampleSize.toLocaleString()}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#00D17A" }}>{c.hitRate}%</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: c.avgReturn >= 0 ? "#00D17A" : "#FF5B6E" }}>{c.avgReturn}%</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: inversion ? "#FF5B6E" : "rgba(255,255,255,0.5)" }}>
                          #{c.actualRank}
                          {inversion && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Confidence Calibration ── */}
          {data.calibrationCurve.length > 0 && (
            <Section title="Confidence Calibration">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.calibrationCurve.map(c => {
                  const barWidth = Math.min(c.actual, 100);
                  const errorPx = Math.abs(c.error) * 2;
                  return (
                    <div key={c.confidenceBucket} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 70, fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "right" }}>
                        {c.confidenceBucket}
                      </div>
                      <div style={{ flex: 1, position: "relative", height: 22 }}>
                        <div style={{
                          width: `${barWidth}%`, height: "100%", background: "rgba(87,185,255,0.15)",
                          borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#57B9FF" }}>{c.actual}%</span>
                        </div>
                        <div style={{
                          position: "absolute", left: `${c.expected}%`, top: 0,
                          width: 2, height: "100%", background: "rgba(255,255,255,0.3)",
                        }} />
                      </div>
                      <div style={{ width: 50, fontSize: 10, color: c.error > 10 ? "#FF5B6E" : "rgba(255,255,255,0.35)", textAlign: "left" }}>
                        ±{c.error}%
                      </div>
                      <div style={{ width: 50, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>
                        n={c.sampleSize}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── Factor Attribution ── */}
          {data.factorRanking.length > 0 && (
            <Section title="Factor Attribution">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.factorRanking.map(f => {
                  const maxPower = data.factorRanking[0]?.predictivePower ?? 1;
                  const barWidth = Math.max((f.predictivePower / maxPower) * 100, 5);
                  return (
                    <div key={f.factor} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: f.rank === 1 ? "rgba(0,209,122,0.15)" : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: f.rank === 1 ? "#00D17A" : "rgba(255,255,255,0.4)",
                      }}>
                        #{f.rank}
                      </div>
                      <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                        {f.factor}
                      </div>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                        <div style={{
                          width: `${barWidth}%`, height: "100%",
                          background: f.rank <= 2 ? "#00D17A" : f.rank <= 4 ? "#57B9FF" : "rgba(255,255,255,0.25)",
                          borderRadius: 3,
                        }} />
                      </div>
                      <div style={{ width: 50, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>
                        {f.predictivePower}%
                      </div>
                      <div style={{ width: 50, fontSize: 10, color: f.alphaGeneration >= 0 ? "#00D17A" : "#FF5B6E", textAlign: "right" }}>
                        α {f.alphaGeneration > 0 ? '+' : ''}{f.alphaGeneration}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── Drift Monitor ── */}
          {data.drift && (
            <Section title="Drift Monitor">
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <span style={{
                      display: "inline-block", padding: "4px 12px", borderRadius: 6,
                      fontSize: 14, fontWeight: 800,
                      background: `${DRIFT_COLORS[data.drift.status] ?? "#fff"}20`,
                      color: DRIFT_COLORS[data.drift.status] ?? "#fff",
                      border: `1px solid ${DRIFT_COLORS[data.drift.status] ?? "#fff"}40`,
                      textTransform: "uppercase",
                    }}>
                      {data.drift.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Hit Rate Δ</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: data.drift.hitRateChange >= 0 ? "#00D17A" : "#FF5B6E" }}>
                        {data.drift.hitRateChange > 0 ? '+' : ''}{data.drift.hitRateChange}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>Alpha Δ</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: data.drift.alphaChange >= 0 ? "#00D17A" : "#FF5B6E" }}>
                        {data.drift.alphaChange > 0 ? '+' : ''}{data.drift.alphaChange}%
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {data.drift.currentPeriod} vs {data.drift.previousPeriod}
                  </div>
                </div>
              </div>
            </Section>
          )}
        </>
      )}
    </main>
  );
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.15em", color: "rgba(255,255,255,0.45)",
        marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "18px 16px",
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <>
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{label}</span>
      <span style={{ fontWeight: 700, color: color ?? "rgba(255,255,255,0.7)", textAlign: "right" }}>{value}</span>
    </>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "6px 12px", fontSize: 10,
  color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
};
