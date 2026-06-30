import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StaggerContainer } from "../ui/MicroInteractions";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, media, radius } from "../design/tokens";
import { TrendingUp, TrendingDown, Minus, PieChart, Activity, Target, Shield, Zap, BarChart3 } from "lucide-react";

// ── Mock portfolio data (replaced with real data when user connects broker) ──

interface PortfolioHolding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  ltp: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  weight: number;
}

const MOCK_HOLDINGS: PortfolioHolding[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", shares: 25, avgCost: 2450, ltp: 2620, dayChange: 18, dayChangePercent: 0.69, totalReturn: 4250, totalReturnPercent: 6.94, weight: 18 },
  { symbol: "TCS", name: "Tata Consultancy Services", shares: 40, avgCost: 3560, ltp: 3840, dayChange: -12, dayChangePercent: -0.31, totalReturn: 11200, totalReturnPercent: 7.87, weight: 15 },
  { symbol: "HDFCBANK", name: "HDFC Bank", shares: 60, avgCost: 1620, ltp: 1690, dayChange: 8, dayChangePercent: 0.48, totalReturn: 4200, totalReturnPercent: 4.32, weight: 14 },
  { symbol: "INFY", name: "Infosys", shares: 35, avgCost: 1480, ltp: 1580, dayChange: 22, dayChangePercent: 1.41, totalReturn: 3500, totalReturnPercent: 6.76, weight: 12 },
  { symbol: "ICICIBANK", name: "ICICI Bank", shares: 50, avgCost: 1080, ltp: 1160, dayChange: 5, dayChangePercent: 0.43, totalReturn: 4000, totalReturnPercent: 7.41, weight: 11 },
  { symbol: "SBIN", name: "State Bank of India", shares: 80, avgCost: 680, ltp: 745, dayChange: 15, dayChangePercent: 2.05, totalReturn: 5200, totalReturnPercent: 9.56, weight: 10 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", shares: 30, avgCost: 890, ltp: 935, dayChange: -3, dayChangePercent: -0.32, totalReturn: 1350, totalReturnPercent: 5.06, weight: 8 },
  { symbol: "ITC", name: "ITC Ltd", shares: 100, avgCost: 420, ltp: 445, dayChange: 2, dayChangePercent: 0.45, totalReturn: 2500, totalReturnPercent: 5.95, weight: 7 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", shares: 20, avgCost: 1850, ltp: 1790, dayChange: -8, dayChangePercent: -0.44, totalReturn: -1200, totalReturnPercent: -3.24, weight: 5 },
];

function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e7) return `₹${(val / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(val / 1e5).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function getReturnColor(val: number): string {
  if (val > 0) return colors.success;
  if (val < 0) return colors.marketRed;
  return colors.textSecondary;
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"holdings" | "allocations" | "performance">("holdings");
  const isMobile = useResponsiveValue(true, false);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const invested = MOCK_HOLDINGS.reduce((s, h) => s + h.avgCost * h.shares, 0);
    const current = MOCK_HOLDINGS.reduce((s, h) => s + h.ltp * h.shares, 0);
    const dayChange = MOCK_HOLDINGS.reduce((s, h) => s + h.dayChange * h.shares, 0);
    return { invested, current, pnl: current - invested, pnlPercent: ((current - invested) / invested) * 100, dayChange };
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: layout.pagePaddingDesktop }}>
      {/* Header */}
      <StaggerContainer>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <BarChart3 size={24} color={colors.primary} />
            <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, color: colors.ink, margin: 0 }}>
              Portfolio
            </h1>
          </div>
          <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: 0 }}>
            Track your holdings, allocations, and performance in real time
          </p>
        </div>
      </StaggerContainer>

      {/* Summary cards */}
      <StaggerContainer staggerMs={80}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 32,
        }}>
          {[
            { label: "Total Value", value: formatCurrency(metrics.current), icon: TrendingUp, color: colors.primary },
            { label: "Invested", value: formatCurrency(metrics.invested), icon: Activity, color: colors.body },
            { label: "P&L", value: `${metrics.pnl > 0 ? "+" : ""}${formatCurrency(metrics.pnl)}`, icon: Target, color: getReturnColor(metrics.pnl), sub: `${metrics.pnlPercent > 0 ? "+" : ""}${metrics.pnlPercent.toFixed(2)}%` },
            { label: "Day Change", value: `${metrics.dayChange > 0 ? "+" : ""}${formatCurrency(metrics.dayChange)}`, icon: Zap, color: getReturnColor(metrics.dayChange) },
          ].map((m) => (
            <Card key={m.label} variant="elevated" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <m.icon size={16} color={m.color} />
                <span style={{ fontSize: "12px", color: colors.body, fontWeight: 500 }}>{m.label}</span>
              </div>
              <div style={{ fontSize: typography.h3.desktop.size, fontWeight: 700, color: m.color }}>
                {m.value}
              </div>
              {m.sub && (
                <div style={{ fontSize: "12px", color: m.color, marginTop: 4 }}>{m.sub}</div>
              )}
            </Card>
          ))}
        </div>
      </StaggerContainer>

      {/* View toggle tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        background: colors.surfaceElevated,
        borderRadius: radius.md,
        padding: 4,
        width: "fit-content",
      }}>
        {(["holdings", "allocations", "performance"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "8px 20px",
              borderRadius: radius.sm,
              border: "none",
              background: view === v ? colors.ink : "transparent",
              color: view === v ? colors.canvas : colors.body,
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              textTransform: "capitalize",
            }}
          >
            {v === "holdings" ? "Holdings" : v === "allocations" ? "Allocation" : "Performance"}
          </button>
        ))}
      </div>

      {/* Holdings table */}
      {view === "holdings" && (
        <StaggerContainer staggerMs={50}>
          <Card variant="elevated" style={{ padding: 0 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: typography.body.desktop.size,
                minWidth: isMobile ? 600 : "auto",
              }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.hairline}` }}>
                    {["Stock", "Shares", "Avg Cost", "LTP", "Day Chg", "P&L", "Weight"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        color: colors.body,
                        fontWeight: 500,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        position: "sticky",
                        top: 0,
                        background: colors.canvas,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HOLDINGS.map((h, i) => (
                    <tr
                      key={h.symbol}
                      onClick={() => navigate(`/stock/${h.symbol}`)}
                      style={{
                        borderBottom: i < MOCK_HOLDINGS.length - 1 ? `1px solid ${colors.hairline}` : "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceElevated)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: colors.ink }}>{h.symbol}</div>
                        <div style={{ fontSize: "12px", color: colors.body }}>{h.name}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: colors.ink }}>{h.shares}</td>
                      <td style={{ padding: "12px 16px", color: colors.ink }}>{formatCurrency(h.avgCost)}</td>
                      <td style={{ padding: "12px 16px", color: colors.ink }}>{formatCurrency(h.ltp)}</td>
                      <td style={{ padding: "12px 16px", color: getReturnColor(h.dayChange) }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {h.dayChange > 0 ? <TrendingUp size={14} /> : h.dayChange < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                          {h.dayChangePercent > 0 ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: getReturnColor(h.totalReturn) }}>
                        <div style={{ fontWeight: 600 }}>{h.totalReturn > 0 ? "+" : ""}{h.totalReturnPercent.toFixed(2)}%</div>
                        <div style={{ fontSize: "12px" }}>{formatCurrency(h.totalReturn)}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{
                          width: 48,
                          height: 4,
                          background: colors.hairline,
                          borderRadius: 2,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${h.weight}%`,
                            height: "100%",
                            background: colors.primary,
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ fontSize: "12px", color: colors.body }}>{h.weight}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </StaggerContainer>
      )}

      {/* Allocation view */}
      {view === "allocations" && (
        <StaggerContainer staggerMs={50}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 16 }}>
            <Card variant="elevated" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Shield size={18} color={colors.primary} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: colors.ink }}>Sector Allocation</h3>
              </div>
              {[
                { sector: "Banking", weight: 40, color: "#3b82f6" },
                { sector: "IT", weight: 27, color: "#8b5cf6" },
                { sector: "Oil & Gas", weight: 18, color: "#f59e0b" },
                { sector: "FMCG", weight: 7, color: "#10b981" },
                { sector: "Telecom", weight: 8, color: "#ef4444" },
              ].map((s) => (
                <div key={s.sector} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 4 }}>
                    <span style={{ color: colors.ink }}>{s.sector}</span>
                    <span style={{ color: colors.body }}>{s.weight}%</span>
                  </div>
                  <div style={{ height: 6, background: colors.hairline, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${s.weight}%`, height: "100%", background: s.color, borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </Card>

            <Card variant="elevated" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Target size={18} color={colors.primary} />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: colors.ink }}>Portfolio Health</h3>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Diversification Score", value: "72 / 100", color: colors.warning },
                  { label: "Concentration Risk", value: "Moderate", color: colors.warning },
                  { label: "Quality Score", value: "85 / 100", color: colors.success },
                  { label: "Beta (1Y)", value: "0.89", color: colors.success },
                ].map((h) => (
                  <div key={h.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${colors.hairline}` }}>
                   <span style={{ fontSize: "13px", color: colors.body }}>{h.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: h.color }}>{h.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </StaggerContainer>
      )}

      {/* Performance view */}
      {view === "performance" && (
        <StaggerContainer staggerMs={50}>
          <Card variant="elevated" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Activity size={18} color={colors.primary} />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: colors.ink }}>Return Analysis</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "1D Return", value: `+${metrics.dayChange.toFixed(0)}`, color: colors.success },
                { label: "Total Return", value: `${metrics.pnl > 0 ? "+" : ""}${metrics.pnlPercent.toFixed(2)}%`, color: getReturnColor(metrics.pnl) },
                { label: "Annualized", value: "+12.4%", color: colors.success },
              ].map((r) => (
                <div key={r.label} style={{ textAlign: "center", padding: "16px", background: colors.surfaceElevated, borderRadius: radius.md }}>
                  <div style={{ fontSize: "12px", color: colors.body, marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontSize: typography.h3.desktop.size, fontWeight: 700, color: r.color }}>{r.value}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "13px", color: colors.body, fontStyle: "italic", margin: 0 }}>
              {metrics.pnl > 0
                ? `Your portfolio is up ${metrics.pnlPercent.toFixed(1)}% overall. Keep monitoring sector allocation to manage risk.`
                : `Your portfolio is down ${Math.abs(metrics.pnlPercent).toFixed(1)}%. Review underperformers and consider rebalancing.`
              }
            </p>
          </Card>
        </StaggerContainer>
      )}

      {!isMobile && (
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Button variant="secondary" size="sm" onClick={() => navigate("/compare")}>
            Compare with benchmarks →
          </Button>
        </div>
      )}
    </div>
  );
}
