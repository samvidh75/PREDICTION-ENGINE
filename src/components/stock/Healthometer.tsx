import { useState, useEffect } from "react";

interface HealthometerProps {
  score: number | null;
  factors: {
    quality: number;
    valuation: number;
    growth: number;
    riskStability: number;
    momentum: number;
  } | null;
  thesis: string | null;
  stateLabel: string | null;
  details: string[];
  isPro: boolean;
  onUpgradeClick: () => void;
}

const STATE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "High Conviction": { bg: "var(--green-tint)", text: "var(--green-text)" },
  "Healthy":         { bg: "var(--green-tint)", text: "var(--green-text)" },
  "Moderate":        { bg: "var(--amber-tint)", text: "var(--amber-text)" },
  "Needs Review":    { bg: "var(--amber-tint)", text: "var(--amber-text)" },
  "Caution":         { bg: "var(--red-tint)",   text: "var(--red-text)" },
};

function getConfig(score: number) {
  if (score >= 80) return { color: "var(--green)", label: "Very Healthy" };
  if (score >= 65) return { color: "var(--green)", label: "Healthy" };
  if (score >= 50) return { color: "var(--amber)", label: "Moderate" };
  if (score >= 35) return { color: "var(--amber)", label: "Needs Attention" };
  return { color: "var(--red)", label: "Caution" };
}

export default function Healthometer({
  score, factors, thesis, stateLabel, details, isPro, onUpgradeClick,
}: HealthometerProps) {
  const [barsAnimated, setBarsAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarsAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (score === null) {
    return <div className="skeleton" style={{ height: 200, borderRadius: "var(--r-lg)" }} />;
  }

  const cfg = getConfig(score);
  const badgeStyle = STATE_BADGE_COLORS[stateLabel ?? ""] ?? STATE_BADGE_COLORS["Moderate"];

  const FACTORS = [
    { label: "Business Quality", value: factors?.quality ?? 50 },
    { label: "Valuation", value: factors?.valuation ?? 50 },
    { label: "Growth", value: factors?.growth ?? 50 },
    { label: "Risk & Stability", value: factors?.riskStability ?? 50 },
    { label: "Market Timing", value: factors?.momentum ?? 50 },
  ];

  const positiveDetails = details.filter(d => d.startsWith("\u2713"));
  const negativeDetails = details.filter(d => d.startsWith("\u2717"));

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: "28px 28px 24px",
    }}>
      <div style={{
        fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20,
      }}>
        Research Score
      </div>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0, minWidth: 120 }}>
          <div style={{
            fontSize: "var(--sz-5xl)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 1, color: cfg.color, marginBottom: 8,
          }}>
            {score}
          </div>
          <div style={{ fontSize: "var(--sz-sm)", color: "var(--text-300)", marginBottom: 10 }}>
            out of 100
          </div>
          {stateLabel && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: "var(--r-pill)",
              background: badgeStyle.bg, color: badgeStyle.text,
              fontSize: "var(--sz-xs)", fontWeight: 700,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: badgeStyle.text, flexShrink: 0,
              }} />
              {stateLabel}
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: "var(--sz-sm)", fontWeight: 600, color: cfg.color }}>
            {cfg.label}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          {FACTORS.map(({ label, value }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: "var(--sz-sm)", color: "var(--text-500)", fontWeight: 500 }}>
                  {label}
                </span>
                <span style={{
                  fontSize: "var(--sz-sm)", fontWeight: 700,
                  color: value >= 70 ? "var(--green-text)" : value >= 50 ? "var(--text-700)" : "var(--amber-text)",
                }}>
                  {value}
                </span>
              </div>
              <div style={{ height: 6, background: "var(--chip)", borderRadius: "var(--r-pill)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "var(--r-pill)",
                  width: barsAnimated ? `${value}%` : "0%",
                  background: value >= 70 ? "var(--green)" : value >= 50 ? "var(--brand)" : "var(--amber)",
                  transition: "width var(--t-spring)",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {thesis && (
        <div style={{
          fontSize: "var(--sz-base)", color: "var(--text-500)", lineHeight: 1.6,
          borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20,
        }}>
          {thesis}
        </div>
      )}

      {!isPro ? (
        <div style={{
          background: "linear-gradient(145deg, var(--brand-tint) 0%, #F5F0FF 100%)",
          border: "1px solid #C7D9F8", borderRadius: "var(--r-lg)",
          padding: "20px 22px", marginTop: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>{String.fromCodePoint(0x1F512)}</span>
            <span style={{ fontSize: "var(--sz-base)", fontWeight: 700, color: "var(--text-900)" }}>
              Why {score}/100 \u2014 specific analysis
            </span>
          </div>

          <div style={{ position: "relative", marginBottom: 16 }}>
            <div style={{ filter: "blur(4.5px)", userSelect: "none", pointerEvents: "none", lineHeight: 1.7 }}>
              {negativeDetails.length > 0 && negativeDetails.slice(0, 2).map((d, i) => (
                <div key={`neg-${i}`} style={{ fontSize: "var(--sz-sm)", color: "var(--red-text)", fontWeight: 500, marginBottom: 4 }}>
                  {d}
                </div>
              ))}
              {positiveDetails.length > 0 && positiveDetails.slice(0, 2).map((d, i) => (
                <div key={`pos-${i}`} style={{ fontSize: "var(--sz-sm)", color: "var(--green-text)", fontWeight: 500, marginBottom: 4 }}>
                  {d}
                </div>
              ))}
              {details.length === 0 && (
                <>
                  <div style={{ fontSize: "var(--sz-sm)", color: "var(--red-text)", fontWeight: 500, marginBottom: 4 }}>
                    \u26A0 PE 28.4\u00D7 vs sector median 22.1\u00D7 \u2014 premium to peers
                  </div>
                  <div style={{ fontSize: "var(--sz-sm)", color: "var(--green-text)", fontWeight: 500, marginBottom: 4 }}>
                    \u2713 ROE 45.8% \u2014 top decile in sector (avg: 24.1%)
                  </div>
                  <div style={{ fontSize: "var(--sz-sm)", color: "var(--green-text)", fontWeight: 500 }}>
                    \u2713 Zero net debt
                  </div>
                </>
              )}
            </div>
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 48,
              background: "linear-gradient(transparent, var(--brand-tint))",
              pointerEvents: "none",
            }} />
          </div>

          <button
            onClick={onUpgradeClick}
            style={{
              width: "100%", height: 44,
              background: "var(--brand)", color: "var(--text-inverse)",
              border: "none", borderRadius: "var(--r-md)",
              fontSize: "var(--sz-sm)", fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.01em", fontFamily: "var(--font)",
            }}
          >
            Unlock deep analysis \u2014 \u20B9299/mo \u2192
          </button>
          <div style={{
            fontSize: "var(--sz-xs)", color: "var(--text-300)",
            textAlign: "center", marginTop: 10,
          }}>
            Cancel anytime \u00B7 Indian pricing \u00B7 Secure
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ fontSize: "var(--sz-base)", fontWeight: 700, color: "var(--text-900)", marginBottom: 14 }}>
            Why {score}/100 \u2014 specific to this stock
          </div>
          {details.map((d, i) => {
            const isPositive = d.startsWith("\u2713");
            const isNegative = d.startsWith("\u2717");
            return (
              <div key={i} style={{
                fontSize: "var(--sz-sm)", fontWeight: 500, marginBottom: 7,
                display: "flex", gap: 8,
                color: isPositive ? "var(--green-text)" : isNegative ? "var(--red-text)" : "var(--text-500)",
              }}>
                <span>{d[0]}</span>
                <span>{d.replace(/^[\u2713\u2717?]\s*/, "")}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
