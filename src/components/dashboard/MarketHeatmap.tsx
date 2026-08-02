import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface HeatmapQuote {
  symbol: string;
  name: string;
  changePercent: number;
}

/** Intensity-graded tile color — same clamp/scale logic as SectorHeatmap's
    heatTint, applied per-stock instead of per-sector. All tiles are equal
    size: PHISIX doesn't expose per-stock market cap, so a size-weighted
    treemap would have to invent its sizing — a uniform grid doesn't. */
function heatTint(pct: number): string {
  const clamped = Math.max(-3, Math.min(3, pct));
  const intensity = Math.abs(clamped) / 3;
  return pct >= 0
    ? `rgba(52, 199, 89, ${0.10 + intensity * 0.35})`
    : `rgba(255, 69, 58, ${0.10 + intensity * 0.35})`;
}

export function MarketHeatmap() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<HeatmapQuote[] | null>(null);

  useEffect(() => {
    fetch("/api/market-pulse")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.ok && Array.isArray(payload.quotes)) setQuotes(payload.quotes);
      })
      .catch(() => {});
  }, []);

  if (!quotes || quotes.length === 0) return null;

  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent);

  return (
    <section aria-label="PSEi-30 market heatmap" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 3 }}>
        <span className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--accent)" }}>
          Market heatmap
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          All {sorted.length} PSEi-30 constituents, colored by today's move
        </span>
      </div>
      <div
        className="stockex-stagger"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: 6,
        }}
      >
        {sorted.map((q) => (
          <button
            key={q.symbol}
            onClick={() => navigate(`/stock/${q.symbol}`)}
            title={`${q.name}: ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`}
            style={{
              padding: "10px 8px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: heatTint(q.changePercent),
              cursor: "pointer",
              display: "grid",
              gap: 2,
              textAlign: "left",
              transition: "transform 140ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12.5, color: "var(--text-primary)" }}>
              {q.symbol}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>
              {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
