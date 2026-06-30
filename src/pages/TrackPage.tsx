import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  PieChart,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { PriceFlash } from "../ui/PriceFlash";
import { colors, typography, space, radius, media } from "../design/tokens";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Holding {
  symbol: string;
  name: string;
  sector: string;
  weight: number; // decimal, e.g. 0.08 = 8%
  conviction: number; // 0-100
  convictionTrend: "up" | "down" | "stable";
  thesisScore: number; // 0-100
  healthScore: number; // 0-100
  alerts: number; // active alert count
  lastPrice: number;
  dayChange: number; // percent
  avgCost: number; // average buy price
  pnlPct: number;
}

interface CatalystEvent {
  id: string;
  symbol: string;
  name: string;
  type: "earnings" | "dividend" | "split" | "agm" | "rights" | "bonus";
  date: string; // ISO date
  estimated: boolean;
  importance: "high" | "medium" | "low";
}

interface AlertRule {
  id: string;
  symbol: string;
  metric: string;
  operator: "above" | "below" | "crosses";
  threshold: number;
  enabled: boolean;
  lastTriggered: string | null;
}

interface Insight {
  id: string;
  text: string;
  type: "warning" | "opportunity" | "info";
  timestamp: string;
  symbol?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_HOLDINGS: Holding[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", weight: 0.14, conviction: 85, convictionTrend: "up", thesisScore: 82, healthScore: 78, alerts: 1, lastPrice: 2914.50, dayChange: 1.2, avgCost: 2450.00, pnlPct: 18.96 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", weight: 0.12, conviction: 78, convictionTrend: "stable", thesisScore: 74, healthScore: 85, alerts: 0, lastPrice: 3890.25, dayChange: -0.4, avgCost: 3500.00, pnlPct: 11.15 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financials", weight: 0.10, conviction: 90, convictionTrend: "up", thesisScore: 88, healthScore: 82, alerts: 2, lastPrice: 1680.30, dayChange: 0.8, avgCost: 1520.00, pnlPct: 10.55 },
  { symbol: "INFY", name: "Infosys", sector: "IT", weight: 0.08, conviction: 72, convictionTrend: "down", thesisScore: 68, healthScore: 76, alerts: 1, lastPrice: 1545.60, dayChange: -1.2, avgCost: 1420.00, pnlPct: 8.85 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", weight: 0.07, conviction: 80, convictionTrend: "up", thesisScore: 76, healthScore: 72, alerts: 0, lastPrice: 1245.80, dayChange: 2.1, avgCost: 980.00, pnlPct: 27.12 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", weight: 0.06, conviction: 74, convictionTrend: "stable", thesisScore: 71, healthScore: 74, alerts: 0, lastPrice: 3480.10, dayChange: 0.3, avgCost: 2900.00, pnlPct: 20.00 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financials", weight: 0.05, conviction: 68, convictionTrend: "down", thesisScore: 63, healthScore: 65, alerts: 2, lastPrice: 745.20, dayChange: -0.6, avgCost: 620.00, pnlPct: 20.19 },
  { symbol: "ITC", name: "ITC Limited", sector: "FMCG", weight: 0.05, conviction: 76, convictionTrend: "stable", thesisScore: 72, healthScore: 80, alerts: 0, lastPrice: 435.90, dayChange: 0.5, avgCost: 360.00, pnlPct: 21.08 },
];

const MOCK_CATALYST_EVENTS: CatalystEvent[] = [
  { id: "e1", symbol: "TCS", name: "TCS Q4 FY25 Results", type: "earnings", date: "2025-04-10", estimated: false, importance: "high" },
  { id: "e2", symbol: "INFY", name: "Infosys Q4 FY25 Results", type: "earnings", date: "2025-04-14", estimated: false, importance: "high" },
  { id: "e3", symbol: "ITC", name: "ITC Interim Dividend", type: "dividend", date: "2025-03-28", estimated: false, importance: "medium" },
  { id: "e4", symbol: "RELIANCE", name: "RIL AGM 2025", type: "agm", date: "2025-06-15", estimated: true, importance: "high" },
  { id: "e5", symbol: "HDFCBANK", name: "HDFC Bank Q4 Results", type: "earnings", date: "2025-04-18", estimated: false, importance: "high" },
  { id: "e6", symbol: "BHARTIARTL", name: "Airtel Rights Issue Record Date", type: "rights", date: "2025-04-05", estimated: false, importance: "medium" },
  { id: "e7", symbol: "LT", name: "L&T Bonus Share Allotment", type: "bonus", date: "2025-05-20", estimated: true, importance: "low" },
  { id: "e8", symbol: "SBIN", name: "SBI Q4 Results", type: "earnings", date: "2025-05-05", estimated: true, importance: "high" },
];

const MOCK_ALERT_RULES: AlertRule[] = [
  { id: "a1", symbol: "HDFCBANK", metric: "Price", operator: "below", threshold: 1550, enabled: true, lastTriggered: null },
  { id: "a2", symbol: "HDFCBANK", metric: "Health Score", operator: "below", threshold: 75, enabled: true, lastTriggered: "2025-03-10" },
  { id: "a3", symbol: "SBIN", metric: "Conviction Score", operator: "below", threshold: 60, enabled: true, lastTriggered: "2025-03-15" },
  { id: "a4", symbol: "SBIN", metric: "P/E Ratio", operator: "above", threshold: 20, enabled: false, lastTriggered: null },
  { id: "a5", symbol: "INFY", metric: "Price", operator: "crosses", threshold: 1600, enabled: true, lastTriggered: null },
  { id: "a6", symbol: "RELIANCE", metric: "Health Score", operator: "below", threshold: 70, enabled: true, lastTriggered: "2025-02-28" },
];

const MOCK_INSIGHTS: Insight[] = [
  { id: "i1", text: "HDFC Bank conviction score has risen 5 points this week. Earnings momentum is strong.", type: "opportunity", timestamp: "2025-03-24T10:30:00", symbol: "HDFCBANK" },
  { id: "i2", text: "SBIN risk score elevated. Monitor for potential loan quality issues in Q4 results.", type: "warning", timestamp: "2025-03-24T09:15:00", symbol: "SBIN" },
  { id: "i3", text: "ITC thesis score improved due to stable taxation outlook and volume growth in FMCG.", type: "info", timestamp: "2025-03-23T16:00:00", symbol: "ITC" },
  { id: "i4", text: "Infosys conviction trending down. AI disruption fears may create buying opportunity.", type: "opportunity", timestamp: "2025-03-23T14:45:00", symbol: "INFY" },
  { id: "i5", text: "Portfolio concentration in Financials (15%) approaching 20% warning threshold.", type: "warning", timestamp: "2025-03-23T11:00:00" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONVICTION_COLORS: Record<string, string> = {
  up: colors.success,
  down: colors.marketRed,
  stable: colors.warning,
};

const INSIGHT_COLORS: Record<string, string> = {
  warning: colors.marketOrange,
  opportunity: colors.success,
  info: colors.primary,
};

const INSIGHT_ICONS: Record<string, typeof AlertTriangle> = {
  warning: AlertTriangle,
  opportunity: TrendingUp,
  info: Sparkles,
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  earnings: "Earnings",
  dividend: "Dividend",
  split: "Stock Split",
  agm: "AGM",
  rights: "Rights Issue",
  bonus: "Bonus Issue",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  earnings: colors.primary,
  dividend: colors.success,
  split: colors.marketOrange,
  agm: colors.warning,
  rights: colors.marketRed,
  bonus: colors.marketGreen,
};

function portfolioConvictionScore(holdings: Holding[]): number {
  if (holdings.length === 0) return 0;
  const totalWeight = holdings.reduce((sum, h) => sum + h.weight, 0);
  const weightedConviction = holdings.reduce((sum, h) => sum + h.conviction * h.weight, 0);
  return Math.round(weightedConviction / Math.max(totalWeight, 0.01));
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConvictionGauge({ score }: { score: number }) {
  const radius = 48;
  const stroke = 5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? colors.success : score >= 60 ? colors.primary : score >= 40 ? colors.warning : colors.marketRed;

  return (
    <div style={{ position: "relative", width: radius * 2, height: radius * 2, flexShrink: 0 }}>
      <svg width={radius * 2} height={radius * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle
          stroke={colors.border}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "20px", fontWeight: 700, color: colors.textPrimary, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: "9px", fontWeight: 500, color: colors.textTertiary, textTransform: "uppercase" }}>
          Score
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrackPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"holdings" | "catalysts" | "alerts" | "insights">("holdings");
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null);
  const [showAddAlert, setShowAddAlert] = useState(false);

  const convictionScore = useMemo(() => portfolioConvictionScore(MOCK_HOLDINGS), []);
  const upcomingEvents = useMemo(
    () => MOCK_CATALYST_EVENTS.filter((e) => daysUntil(e.date) <= 30).sort((a, b) => daysUntil(a.date) - daysUntil(b.date)),
    [],
  );
  const activeAlerts = useMemo(() => MOCK_ALERT_RULES.filter((a) => a.enabled), []);
  const sortedInsights = useMemo(
    () => [...MOCK_INSIGHTS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [],
  );

  const sectorConcentration = useMemo(() => {
    const sectors: Record<string, number> = {};
    MOCK_HOLDINGS.forEach((h) => {
      sectors[h.sector] = (sectors[h.sector] || 0) + h.weight;
    });
    return sectors;
  }, []);

  const TAB_LABELS = [
    { id: "holdings", label: "Holdings", icon: PieChart },
    { id: "catalysts", label: "Catalysts", icon: Calendar },
    { id: "alerts", label: "Alerts", icon: BellRing },
    { id: "insights", label: "AI Insights", icon: Sparkles },
  ] as const;

  return (
    <div className="raycast-slideUp" style={{ display: "grid", gap: "24px" }}>

      {/* ── Header ── */}
      <div className="raycast-stagger-1" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Track Pro
          </h1>
          <p style={{ fontSize: "13px", color: colors.textSecondary, margin: "4px 0 0 0" }}>
            Portfolio monitoring, conviction tracking, and catalyst alerts
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setShowAddAlert(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={14} />
            Add Alert
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {}}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Conviction Score Card ── */}
      <div className="raycast-stagger-2" style={{ animationDelay: "0.1s", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <Card style={{ display: "flex", alignItems: "center", gap: "20px", padding: "20px 24px" }}>
          <ConvictionGauge score={convictionScore} />
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
              Portfolio Conviction
            </p>
            <p style={{ fontSize: "14px", color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              {convictionScore >= 80
                ? "Strong conviction across holdings"
                : convictionScore >= 60
                  ? "Moderate conviction — monitor closely"
                  : "Low conviction — review thesis"}
            </p>
          </div>
        </Card>

        <Card style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>
            Holdings
          </p>
          <p style={{ fontSize: "22px", fontWeight: 700, color: colors.textPrimary, margin: 0, lineHeight: 1 }}>
            {MOCK_HOLDINGS.length}
          </p>
          <p style={{ fontSize: "12px", color: colors.textSecondary, margin: "4px 0 0 0" }}>
            Across {Object.keys(sectorConcentration).length} sectors
          </p>
        </Card>

        <Card style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>
            Active Alerts
          </p>
          <p style={{ fontSize: "22px", fontWeight: 700, color: colors.primary, margin: 0, lineHeight: 1 }}>
            {activeAlerts.length}
          </p>
          <p style={{ fontSize: "12px", color: colors.textSecondary, margin: "4px 0 0 0" }}>
            {activeAlerts.filter((a) => a.lastTriggered).length} triggered recently
          </p>
        </Card>

        <Card style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>
            Upcoming Events
          </p>
          <p style={{ fontSize: "22px", fontWeight: 700, color: colors.warning, margin: 0, lineHeight: 1 }}>
            {upcomingEvents.length}
          </p>
          <p style={{ fontSize: "12px", color: colors.textSecondary, margin: "4px 0 0 0" }}>
            Next 30 days
          </p>
        </Card>
      </div>

      {/* ── Sector Concentration ── */}
      <Card className="raycast-stagger-3" style={{ animationDelay: "0.2s", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <PieChart size={14} color={colors.textSecondary} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Sector Concentration
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {Object.entries(sectorConcentration)
            .sort(([, a], [, b]) => b - a)
            .map(([sector, weight]) => {
              const pct = Math.round(weight * 100);
              const isHigh = pct > 15;
              return (
                <div
                  key={sector}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    borderRadius: radius.md,
                    background: isHigh ? `${colors.marketOrange}14` : colors.fill,
                    border: `1px solid ${isHigh ? colors.marketOrange : colors.border}`,
                    fontSize: "12px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>{sector}</span>
                  <span style={{ color: isHigh ? colors.marketOrange : colors.textSecondary }}>{pct}%</span>
                  {isHigh && <AlertTriangle size={12} color={colors.marketOrange} />}
                </div>
              );
            })}
        </div>
      </Card>

      {/* ── Tab Bar ── */}
      <div className="raycast-stagger-4" style={{ animationDelay: "0.3s", display: "flex", gap: "4px", padding: "4px", background: colors.fill, borderRadius: radius.lg }}>
        {TAB_LABELS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                all: "unset",
                cursor: "pointer",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: radius.md,
                fontSize: "13px",
                fontWeight: 500,
                color: isActive ? colors.textPrimary : colors.textSecondary,
                background: isActive ? colors.bgSecondary : "transparent",
                transition: "all 150ms ease",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Holdings ── */}
      {activeTab === "holdings" && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 80px 80px 90px 80px 30px", gap: "0", alignItems: "center", padding: "8px 16px", borderBottom: `1px solid ${colors.border}` }}>
            {["Company", "Sector", "Weight", "Conviction", "Thesis", "Health", "P&L", ""].map((label, i) => (
              <span key={i} style={{ fontSize: "10px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i >= 2 ? "right" : "left" }}>
                {label}
              </span>
            ))}
          </div>
          {MOCK_HOLDINGS.map((h) => (
            <div key={h.symbol}>
              <button
                onClick={() => setExpandedHolding(expandedHolding === h.symbol ? null : h.symbol)}
                style={{
                  all: "unset",
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 80px 80px 80px 90px 80px 30px",
                  gap: "0",
                  alignItems: "center",
                  padding: "10px 16px",
                  cursor: "pointer",
                  width: "100%",
                  boxSizing: "border-box",
                  background: expandedHolding === h.symbol ? colors.fill : "transparent",
                  borderBottom: `1px solid ${colors.border}`,
                  transition: "background 120ms ease",
                }}
              >
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>{h.symbol}</span>
                  <span style={{ fontSize: "11px", color: colors.textTertiary, marginLeft: "8px" }}>{h.name}</span>
                </div>
                <span style={{ fontSize: "12px", color: colors.textSecondary, textAlign: "left" }}>{h.sector}</span>
                <span style={{ fontSize: "12px", color: colors.textPrimary, textAlign: "right" }}>{(h.weight * 100).toFixed(1)}%</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: h.conviction >= 80 ? colors.success : h.conviction >= 60 ? colors.primary : colors.warning, textAlign: "right", display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                  {h.conviction}
                  {h.convictionTrend !== "stable" && (
                    h.convictionTrend === "up" ? <TrendingUp size={10} color={colors.success} /> : <TrendingDown size={10} color={colors.marketRed} />
                  )}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: h.thesisScore >= 70 ? colors.success : h.thesisScore >= 50 ? colors.primary : colors.warning, textAlign: "right" }}>
                  {h.thesisScore}%
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: h.healthScore >= 70 ? colors.success : h.healthScore >= 50 ? colors.primary : colors.warning, textAlign: "right" }}>
                  {h.healthScore}%
                </span>
                <div style={{ textAlign: "right" }}>
                  <PriceFlash value={h.pnlPct}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: h.pnlPct >= 0 ? colors.success : colors.marketRed }}>
                      {formatPercent(h.pnlPct)}
                    </span>
                  </PriceFlash>
                  {h.alerts > 0 && (
                    <Badge value={h.alerts} variant="warning" />
                  )}
                </div>
                <span style={{ textAlign: "right" }}>
                  {expandedHolding === h.symbol ? <ChevronDown size={14} color={colors.textTertiary} /> : <ChevronRight size={14} color={colors.textTertiary} />}
                </span>
              </button>

              {/* Expanded row detail */}
              {expandedHolding === h.symbol && (
                <div style={{ padding: "14px 16px", background: colors.fill, borderBottom: `1px solid ${colors.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Price</span>
                    <p style={{ fontSize: "13px", color: colors.textPrimary, margin: "4px 0 0 0" }}>
                      <PriceFlash value={h.lastPrice}>{formatCurrency(h.lastPrice)}</PriceFlash>{" "}
                      <PriceFlash value={h.dayChange}>
                        <span style={{ color: h.dayChange >= 0 ? colors.success : colors.marketRed, fontSize: "12px" }}>
                          {formatPercent(h.dayChange)}
                        </span>
                      </PriceFlash>
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Avg Cost</span>
                    <p style={{ fontSize: "13px", color: colors.textPrimary, margin: "4px 0 0 0" }}>{formatCurrency(h.avgCost)}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <Button variant="tertiary" size="sm" onClick={() => navigate(`/stock/${h.symbol}`)} style={{ fontSize: "11px" }}>
                      View Detail
                    </Button>
                    <Button variant="tertiary" size="sm" onClick={() => navigate(`/compare?symbols=${h.symbol}`)} style={{ fontSize: "11px" }}>
                      Compare
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* ── Tab: Catalysts ── */}
      {activeTab === "catalysts" && (
        <Card style={{ overflow: "hidden" }}>
          {upcomingEvents.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: colors.textTertiary, fontSize: "13px" }}>
              No upcoming catalyst events in the next 30 days.
            </div>
          ) : (
            upcomingEvents.map((event) => {
              const days = daysUntil(event.date);
              const Icon = event.type === "earnings" ? DollarSign : event.type === "dividend" ? TrendingUp : Calendar;
              return (
                <div
                  key={event.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr auto 80px",
                    gap: "12px",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  <Icon size={16} color={EVENT_TYPE_COLORS[event.type] || colors.textSecondary} />
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: colors.textPrimary }}>{event.name}</span>
                    <span style={{ fontSize: "11px", color: colors.textTertiary, marginLeft: "8px" }}>
                      {EVENT_TYPE_LABELS[event.type]}
                      {event.estimated && " (Est.)"}
                    </span>
                    <span style={{ fontSize: "11px", color: colors.textTertiary, marginLeft: "8px" }}>
                      {event.symbol}
                    </span>
                  </div>
                  <Badge
                    value={event.importance}
                    variant={event.importance === "high" ? "warning" : event.importance === "medium" ? "neutral" : "neutral"}
                  />
                  <span style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: days <= 7 ? colors.marketRed : days <= 14 ? colors.warning : colors.textSecondary,
                    textAlign: "right",
                  }}>
                    {days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      )}

      {/* ── Tab: Alerts ── */}
      {activeTab === "alerts" && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 60px 40px", gap: "12px", alignItems: "center", padding: "8px 16px", borderBottom: `1px solid ${colors.border}` }}>
            {["Rule", "Metric", "Condition", "Status", ""].map((label, i) => (
              <span key={i} style={{ fontSize: "10px", fontWeight: 600, color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </span>
            ))}
          </div>
          {MOCK_ALERT_RULES.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 100px 100px 60px 40px",
                gap: "12px",
                alignItems: "center",
                padding: "10px 16px",
                borderBottom: `1px solid ${colors.border}`,
                opacity: rule.enabled ? 1 : 0.4,
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: colors.textPrimary }}>{rule.symbol}</span>
                <span style={{ fontSize: "11px", color: colors.textTertiary, marginLeft: "8px" }}>{rule.metric}</span>
              </div>
              <span style={{ fontSize: "12px", color: colors.textSecondary }}>
                {rule.operator} {rule.threshold}
              </span>
              <span style={{ fontSize: "12px", color: colors.textSecondary }}>
                {rule.metric === "Price" ? formatCurrency(rule.threshold) : rule.threshold}
              </span>
              <Badge value={rule.enabled ? "Active" : "Paused"} variant={rule.enabled ? "success" : "neutral"} />
              <button
                onClick={() => {}}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.textTertiary,
                }}
              >
                {rule.enabled ? <Bell size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          ))}
          {showAddAlert && (
            <div style={{ padding: "16px", background: colors.fill, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>New Alert Rule</span>
                <button onClick={() => setShowAddAlert(false)} style={{ all: "unset", cursor: "pointer", color: colors.textTertiary }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <select style={{ padding: "6px 10px", borderRadius: radius.md, border: `1px solid ${colors.border}`, background: colors.bgSecondary, color: colors.textPrimary, fontSize: "12px" }}>
                  {MOCK_HOLDINGS.map((h) => <option key={h.symbol} value={h.symbol}>{h.symbol}</option>)}
                </select>
                <select style={{ padding: "6px 10px", borderRadius: radius.md, border: `1px solid ${colors.border}`, background: colors.bgSecondary, color: colors.textPrimary, fontSize: "12px" }}>
                  {["Price", "Health Score", "Conviction Score", "P/E Ratio", "Volume"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select style={{ padding: "6px 10px", borderRadius: radius.md, border: `1px solid ${colors.border}`, background: colors.bgSecondary, color: colors.textPrimary, fontSize: "12px" }}>
                  {["above", "below", "crosses"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Threshold"
                  style={{
                    padding: "6px 10px",
                    borderRadius: radius.md,
                    border: `1px solid ${colors.border}`,
                    background: colors.bgSecondary,
                    color: colors.textPrimary,
                    fontSize: "12px",
                    width: "100px",
                  }}
                />
                <Button variant="primary" size="sm" onClick={() => setShowAddAlert(false)}>
                  Create
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: AI Insights ── */}
      {activeTab === "insights" && (
        <div style={{ display: "grid", gap: "12px" }}>
          {sortedInsights.map((insight) => {
            const Icon = INSIGHT_ICONS[insight.type];
            return (
              <Card key={insight.id} style={{ padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: radius.full,
                    background: `${INSIGHT_COLORS[insight.type]}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  <Icon size={14} color={INSIGHT_COLORS[insight.type]} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", color: colors.textPrimary, margin: 0, lineHeight: 1.5 }}>
                    {insight.symbol && (
                      <span
                        style={{ fontWeight: 600, color: colors.primary, cursor: "pointer" }}
                        onClick={() => navigate(`/stock/${insight.symbol}`)}
                      >
                        {insight.symbol}
                      </span>
                    )}
                    {insight.symbol && " — "}
                    {insight.text}
                  </p>
                  <span style={{ fontSize: "11px", color: colors.textTertiary, marginTop: "4px", display: "inline-block" }}>
                    {new Date(insight.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <Badge
                  value={insight.type}
                  variant={insight.type === "warning" ? "warning" : insight.type === "opportunity" ? "success" : "neutral"}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
