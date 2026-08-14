import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, TrendingUp, TrendingDown, BarChart3, RefreshCw,
  Activity, Calendar, AlertCircle,
} from "lucide-react";
import { SECTORS } from "../stockstory/content/sector/SectorTypes";
import { useMarketStatus } from "../hooks/useMarketStatus";

interface SectorPerformance {
  sector: string;
  stockCount: number;
  avgChangePercent: number;
  totalVolume: number;
  topStock: string;
  topStockChange: number;
  marketCapBillion?: number;
}

interface SectorTrendPoint {
  date: string;
  [key: string]: string | number;
}

type TimeRange = "1d" | "1w" | "1m";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[&\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function fmtPeso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtBillion(n: number | undefined) {
  if (!n) return "—";
  return `₱${(n / 1000).toFixed(1)}B`;
}

const SECTOR_COLORS: Record<string, { primary: string; light: string }> = {
  "Financials": { primary: "#1E5FAD", light: "rgba(30,95,173,0.15)" },
  "Industrial": { primary: "#1A7A5A", light: "rgba(26,122,90,0.15)" },
  "Holding Firms": { primary: "#5B3EA6", light: "rgba(91,62,166,0.15)" },
  "Property": { primary: "#8A3A3A", light: "rgba(138,58,58,0.15)" },
  "Services": { primary: "#0A7A9A", light: "rgba(10,122,154,0.15)" },
  "Mining & Oil": { primary: "#8A6020", light: "rgba(138,96,32,0.15)" },
  "Healthcare": { primary: "#0D7377", light: "rgba(13,115,119,0.15)" },
  "Retail": { primary: "#C73866", light: "rgba(199,56,102,0.15)" },
  "Utilities": { primary: "#6A4C93", light: "rgba(106,76,147,0.15)" },
  "Technology": { primary: "#B5502E", light: "rgba(181, 80, 46,0.15)" },
  "Telecom": { primary: "#14B8A6", light: "rgba(20,184,166,0.15)" },
  "Construction": { primary: "#F59E0B", light: "rgba(245,158,11,0.15)" },
};

function getSectorColor(sector: string): { primary: string; light: string } {
  return SECTOR_COLORS[sector] || { primary: "#64748B", light: "rgba(100,116,139,0.15)" };
}

export default function Sectors() {
  const navigate = useNavigate();
  const marketStatus = useMarketStatus();
  const [sectorData, setSectorData] = useState<SectorPerformance[]>([]);
  const [trendData, setTrendData] = useState<SectorTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1d");

  const loadSectorData = () => {
    setLoading(true);
    setError(false);
    fetch("/api/market-universe")
      .then((r) => r.json())
      .then((p) => {
        if (p.ok && Array.isArray(p.quotes)) {
          // Group quotes by sector
          const sectorMap: Record<string, any[]> = {};
          p.quotes.forEach((q: any) => {
            const sector = q.sector || "General";
            if (!sectorMap[sector]) sectorMap[sector] = [];
            sectorMap[sector].push(q);
          });

          // Build sector performance data
          const perfData: SectorPerformance[] = Object.entries(sectorMap).map(
            ([sector, quotes]: [string, any[]]) => {
              const changes = quotes.map((q) => q.changePercent || 0);
              const avgChange = changes.reduce((a, b) => a + b, 0) / Math.max(changes.length, 1);
              const topStock = quotes.reduce((best, q) => {
                if (!best || (q.changePercent || 0) > (best.changePercent || 0)) return q;
                return best;
              });
              const totalVol = quotes.reduce((sum, q) => sum + (q.volume || 0), 0);
              const totalMarketCap = quotes.reduce((sum, q) => sum + (q.marketCap || 0), 0);

              return {
                sector,
                stockCount: quotes.length,
                avgChangePercent: avgChange,
                totalVolume: totalVol,
                topStock: topStock.symbol,
                topStockChange: topStock.changePercent || 0,
                marketCapBillion: totalMarketCap / 1_000_000_000,
              };
            }
          );

          setSectorData(
            perfData.sort((a, b) => Math.abs(b.avgChangePercent) - Math.abs(a.avgChangePercent))
          );

          // Generate mock trend data (in production, this would come from API)
          const trends: SectorTrendPoint[] = [];
          const now = new Date();
          for (let i = 20; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const point: SectorTrendPoint = {
              date: date.toISOString().slice(0, 10),
            };
            perfData.forEach((sector) => {
              const volatility = Math.sin(i * 0.5 + sector.sector.length) * 2;
              point[sector.sector] = Number((sector.avgChangePercent + volatility).toFixed(2));
            });
            trends.push(point);
          }
          setTrendData(trends);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSectorData();
  }, []);

  const heatmapData = useMemo(() => {
    const sorted = [...sectorData].sort((a, b) => (b.marketCapBillion || 0) - (a.marketCapBillion || 0));
    return sorted;
  }, [sectorData]);

  // Calculate max market cap for heatmap sizing
  const maxMarketCap = Math.max(...heatmapData.map((s) => s.marketCapBillion || 0), 1);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            PSE Sector Analysis
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
            {loading ? "Loading…" : error ? "Data unavailable" : `${sectorData.length} sectors · ${marketStatus.label}`}
          </p>
        </div>
        <button
          onClick={loadSectorData}
          title="Refresh"
          style={{
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-chip)",
            cursor: "pointer", color: "var(--text-secondary)", transition: "all 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent)";
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Sector Heatmap ── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "var(--bg-card)", overflow: "auto" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Sector Heatmap
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {heatmapData.map((sector) => {
              const colors = getSectorColor(sector.sector);
              const up = sector.avgChangePercent >= 0;
              const bgColor = up
                ? `rgba(16,185,129,${Math.min((Math.abs(sector.avgChangePercent) / 10) * 0.3, 0.3)})`
                : `rgba(239,68,68,${Math.min((Math.abs(sector.avgChangePercent) / 10) * 0.3, 0.3)})`;
              const size = Math.max((sector.marketCapBillion || 0) / maxMarketCap, 0.3);

              return (
                <motion.button
                  key={sector.sector}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => navigate(`/sectors/${nameToSlug(sector.sector)}`)}
                  style={{
                    padding: 12, borderRadius: 6, border: `1px solid ${colors.primary}`,
                    background: bgColor, cursor: "pointer", textAlign: "center",
                    minHeight: 100, display: "flex", flexDirection: "column", justifyContent: "center",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = "var(--accent)";
                    el.style.transform = "scale(1.04)";
                    el.style.boxShadow = "0 4px 12px rgba(181, 80, 46,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = colors.primary;
                    el.style.transform = "scale(1)";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
                    {sector.sector}
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: up ? "var(--market-green)" : "var(--market-red)",
                    fontFamily: "var(--font-mono)", marginBottom: 4,
                  }}>
                    {sector.avgChangePercent >= 0 ? "+" : ""}{sector.avgChangePercent.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {sector.stockCount} stocks
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Sector Table ── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg-card)" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 100px 110px 110px 120px 120px",
          padding: "10px 16px",
          background: "var(--bg-sheet)",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          userSelect: "none",
        }}>
          <span>Sector</span>
          <span style={{ textAlign: "right" }}>Stocks</span>
          <span style={{ textAlign: "right" }}>Avg Chg%</span>
          <span style={{ textAlign: "right" }}>Volume</span>
          <span style={{ textAlign: "right" }}>Top Stock</span>
          <span style={{ textAlign: "right" }}>Top Perf</span>
        </div>

        {loading && (
          <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              style={{ width: 18, height: 18, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }}
            />
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading sector data…</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>
            Couldn't fetch sector data.{" "}
            <button
              onClick={loadSectorData}
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <AnimatePresence mode="popLayout">
            {sectorData.map((sector, i) => {
              const colors = getSectorColor(sector.sector);
              const up = sector.avgChangePercent >= 0;
              const changeColor = up ? "var(--market-green)" : "var(--market-red)";

              return (
                <motion.button
                  key={sector.sector}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.01 }}
                  onClick={() => navigate(`/sectors/${nameToSlug(sector.sector)}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 100px 110px 110px 120px 120px",
                    padding: "12px 16px",
                    alignItems: "center",
                    border: "none",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "background 100ms ease",
                    minHeight: 0,
                    height: 40,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(181, 80, 46,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: colors.primary }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {sector.sector}
                    </span>
                  </span>

                  <span style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {sector.stockCount}
                  </span>

                  <span style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: changeColor, fontFamily: "var(--font-mono)" }}>
                    {up ? "+" : ""}{sector.avgChangePercent.toFixed(2)}%
                  </span>

                  <span style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {(sector.totalVolume / 1_000_000).toFixed(0)}M
                  </span>

                  <span style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    {sector.topStock}
                  </span>

                  <span style={{
                    textAlign: "right", fontSize: 12, fontWeight: 600, color: sector.topStockChange >= 0 ? "var(--market-green)" : "var(--market-red)",
                    fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3,
                  }}>
                    {sector.topStockChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {sector.topStockChange >= 0 ? "+" : ""}{sector.topStockChange.toFixed(2)}%
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}

        {!loading && !error && sectorData.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>
            No sector data available
          </div>
        )}

        {!loading && !error && sectorData.length > 0 && (
          <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--text-muted)", background: "var(--bg-sheet)", borderTop: "1px solid var(--border)" }}>
            {sectorData.length} sectors · Last updated at {marketStatus.phtTime} PHT
          </div>
        )}
      </div>

      {/* ── Sector Performance Chart ── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Sector Trends
          </h2>
          <div style={{ display: "flex", gap: 4 }}>
            {(["1d", "1w", "1m"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: "4px 10px", fontSize: 11, fontWeight: timeRange === range ? 600 : 400,
                  border: timeRange === range ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: timeRange === range ? "var(--accent-soft)" : "var(--bg-sheet)",
                  color: timeRange === range ? "var(--accent)" : "var(--text-secondary)",
                  borderRadius: 4, cursor: "pointer", transition: "all 100ms ease",
                }}
              >
                {range === "1d" ? "1 Day" : range === "1w" ? "1 Week" : "1 Month"}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          width: "100%", height: 240, background: "var(--bg-sheet)", borderRadius: 6,
          display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "16px 8px",
          gap: 4, border: "1px solid var(--border)",
        }}>
          {trendData.length === 0 ? (
            <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
              Generating performance history…
            </div>
          ) : (
            trendData.map((point, i) => (
              <div
                key={i}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.01 }}
                  style={{
                    width: "100%", background: "var(--accent)", opacity: 0.6, borderRadius: 2,
                    minHeight: 2, maxHeight: "100%", transformOrigin: "bottom",
                  }}
                />
              </div>
            ))
          )}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 8, textAlign: "center" }}>
          Sector strength indicator · Historical performance reference only
        </div>
      </div>

      {/* ── Info ── */}
      <div style={{
        padding: 12, background: "rgba(181, 80, 46,0.08)", borderRadius: 6, border: "1px solid var(--border)",
        display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-secondary)",
      }}>
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--accent)" }} />
        <div>
          <strong>Sector analysis</strong> based on live PSE universe data. Click a sector to view constituent stocks and detailed fundamentals.
        </div>
      </div>
    </div>
  );
}
