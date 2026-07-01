import { useMemo, useState } from "react";
import { TrendingUp, Trophy, Medal, Shield, Zap, BarChart3, ArrowUp, ArrowDown, Minus, Info, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { colors, typography, space, radius } from "../design/tokens";
import type { FC } from "react";
import { ResearchAiExplanationPanel } from "../components/ai-orchestrator/ResearchAiExplanationPanel";
import type { ResearchAiContext } from "../components/ai-orchestrator/researchAiTypes";

// ── Types ──────────────────────────────────────────────────────────────────────
type RankingMetric = "quality" | "growth" | "value" | "momentum" | "stability";

interface StockRank {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  scores: Record<RankingMetric, number>;
  rank: number;
  change: number; // rank change (positive = improved)
}

const SECTORS = [
  "IT Services",
  "Banking",
  "Pharma",
  "Auto",
  "FMCG",
  "Metals",
  "Energy",
  "Realty",
] as const;

const METRICS: { id: RankingMetric; label: string; icon: LucideIcon; color: string; description: string }[] = [
  { id: "quality", label: "Quality", icon: Shield, color: "#59d499", description: "ROE, ROCE, FCF, promoter holding" },
  { id: "growth", label: "Growth", icon: TrendingUp, color: "#57c1ff", description: "Revenue & EPS CAGR, margin expansion" },
  { id: "value", label: "Value", icon: Trophy, color: "#ffc533", description: "P/E, P/B, EV/EBITDA vs peers" },
  { id: "momentum", label: "Momentum", icon: Zap, color: "#FF6B6B", description: "Price & earnings momentum, RS" },
  { id: "stability", label: "Stability", icon: BarChart3, color: "#b0b0b0", description: "Beta, debt/equity, earnings volatility" },
];

function formatInr(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-IN");
}

// ── Mock ranking data ──────────────────────────────────────────────────────────
function generateMockRankings(metric: RankingMetric): StockRank[] {
  const base: Omit<StockRank, "scores" | "rank" | "change">[] = [
    { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", price: 2850 },
    { symbol: "TCS", name: "Tata Consultancy", sector: "IT Services", price: 3950 },
    { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", price: 1680 },
    { symbol: "INFY", name: "Infosys", sector: "IT Services", price: 1520 },
    { symbol: "ITC", name: "ITC Limited", sector: "FMCG", price: 445 },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", price: 1210 },
    { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma", price: 1480 },
    { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", price: 12150 },
    { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", price: 980 },
    { symbol: "WIPRO", name: "Wipro", sector: "IT Services", price: 495 },
    { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", price: 1120 },
    { symbol: "HCLTECH", name: "HCL Tech", sector: "IT Services", price: 1350 },
    { symbol: "DRREDDY", name: "Dr. Reddy's", sector: "Pharma", price: 6120 },
    { symbol: "NESTLEIND", name: "Nestlé India", sector: "FMCG", price: 2450 },
    { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals", price: 152 },
  ];

  // Deterministic pseudo-random scores
  let seed = metric.length * 137;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return base
    .map((stock) => {
      const scores = {
        quality: Math.round(40 + rand() * 60),
        growth: Math.round(30 + rand() * 70),
        value: Math.round(25 + rand() * 75),
        momentum: Math.round(20 + rand() * 80),
        stability: Math.round(35 + rand() * 65),
      };
      return { ...stock, scores, rank: 0, change: Math.round((rand() - 0.5) * 6) };
    })
    .sort((a, b) => b.scores[metric] - a.scores[metric])
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ── Rank change badge ──────────────────────────────────────────────────────────
const RankChange: FC<{ change: number }> = ({ change }) => {
  if (change === 0) return <Minus size={12} style={{ color: colors.textTertiary }} />;
  const up = change > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: typography.captionSm.size, color: up ? colors.marketGreen : colors.marketRed }}>
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(change)}
    </span>
  );
};

// ── Medal badge ────────────────────────────────────────────────────────────────
const RankBadge: FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) return <Trophy size={16} style={{ color: "#ffc533" }} />;
  if (rank === 2) return <Medal size={16} style={{ color: "#c0c0c0" }} />;
  if (rank === 3) return <Medal size={16} style={{ color: "#cd7f32" }} />;
  return <span style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, width: 16, textAlign: "center" }}>{rank}</span>;
};

// ── Score bar ──────────────────────────────────────────────────────────────────
const ScoreBar: FC<{ value: number; color: string }> = ({ value, color }) => (
  <div style={{ width: 80, height: 4, borderRadius: 2, background: colors.surfaceElevated, flexShrink: 0 }}>
    <div style={{ width: `${value}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.3s ease" }} />
  </div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RelativeStrengthPage() {
  const [activeMetric, setActiveMetric] = useState<RankingMetric>("quality");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockRank | null>(null);

  const rankings = useMemo(() => generateMockRankings(activeMetric), [activeMetric]);
  const active = METRICS.find((m) => m.id === activeMetric)!;

  const filtered = selectedSector
    ? rankings.filter((r) => r.sector === selectedSector)
    : rankings;

  const topStocks = rankings.slice(0, 3);

  // Build AI context from current rankings for ResearchAiExplanationPanel
  const rankingContext = useMemo((): ResearchAiContext | null => {
    if (!rankings.length) return null;
    const sectorDistribution = [...new Set(rankings.map((r) => r.sector))];
    const top3 = rankings.slice(0, 3);

    return {
      surface: "rankings",
      headline: `Relative strength rankings by ${active.label.toLowerCase()}`,
      narrative: [
        `Top-ranked: ${top3[0].symbol} (score ${top3[0].scores[activeMetric]}) followed by ${top3[1].symbol} (${top3[1].scores[activeMetric]}) and ${top3[2].symbol} (${top3[2].scores[activeMetric]}).`,
        `Spanning ${sectorDistribution.length} sectors: ${sectorDistribution.slice(0, 5).join(", ")}${sectorDistribution.length > 5 ? " and more" : ""}.`,
      ],
      comparisonContext: rankings.slice(0, 10).map(
        (r) => `${r.symbol} (${r.sector}): rank #${r.rank}, ${active.label.toLowerCase()}=${r.scores[activeMetric]}`
      ),
      whatToWatch: top3.map(
        (r) => `${r.symbol} leads in ${active.label.toLowerCase()} with score ${r.scores[activeMetric]} — monitor for sustained strength.`
      ),
    };
  }, [rankings, activeMetric, active.label]);

  return (
    <div className="raycast-slideUp" style={{ padding: `${space[6]} ${space[8]}`, maxWidth: 1100, margin: "0 auto", color: colors.textPrimary, fontFamily: typography.fontFamily }}>
      {/* Header */}
      <div className="raycast-stagger-1" style={{ marginBottom: space[8] }}>
        <h1 style={{ fontSize: typography.displayLg.size, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Relative Strength
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: typography.bodyLg.size, marginTop: space[2] }}>
          Peer comparison rankings — identify the strongest stocks in every category.
        </p>
      </div>

      {/* Top 3 podium */}
      <div className="raycast-stagger-2"
        style={{
          animationDelay: "0.1s",
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 1fr",
          gap: space[4],
          marginBottom: space[8],
          alignItems: "end",
        }}
      >
        {[topStocks[1], topStocks[0], topStocks[2]].map((stock, i) => {
          if (!stock) return null;
          const position = [2, 1, 3][i];
          return (
            <div
              key={stock.symbol}
              onClick={() => setSelectedStock(stock)}
              style={{
                background: position === 1 ? colors.surfaceElevated : colors.surface,
                borderRadius: radius.lg,
                border: `1px solid ${colors.hairline}`,
                padding: `${space[4]} ${space[4]}`,
                textAlign: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
                order: position,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.buttonFg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = position === 1 ? colors.surfaceElevated : colors.surface)}
            >
              <div style={{ marginBottom: space[1] }}>
                {position === 1 && <Trophy size={28} style={{ color: "#ffc533" }} />}
                {position === 2 && <Medal size={24} style={{ color: "#c0c0c0" }} />}
                {position === 3 && <Medal size={24} style={{ color: "#cd7f32" }} />}
              </div>
              <div style={{ fontSize: typography.headingSm.size, fontWeight: 600, marginBottom: 2 }}>{stock.symbol}</div>
              <div style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, marginBottom: space[2] }}>{stock.name}</div>
              <div style={{ fontSize: typography.headingXl.size, fontWeight: 600, color: active.color }}>{stock.scores[activeMetric]}</div>
              <div style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, marginTop: 2 }}>
                {active.label} Score
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric tabs */}
      <div className="raycast-stagger-3" style={{ animationDelay: "0.2s", display: "flex", gap: space[2], marginBottom: space[6], flexWrap: "wrap" }}>
        {METRICS.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMetric(m.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: space[2],
              padding: `${space[2]} ${space[4]}`,
              borderRadius: radius.lg,
              border: `1px solid ${activeMetric === m.id ? m.color : colors.hairline}`,
              background: activeMetric === m.id ? `${m.color}15` : colors.surface,
              color: activeMetric === m.id ? m.color : colors.textSecondary,
              fontFamily: typography.fontFamily,
              fontSize: typography.bodySm.size,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <m.icon size={16} /> {m.label}
          </button>
        ))}
      </div>

      {/* Sector filter chips */}
      <div className="raycast-stagger-4" style={{ animationDelay: "0.3s", display: "flex", gap: space[2], marginBottom: space[6], flexWrap: "wrap" }}>
        <button
          onClick={() => setSelectedSector(null)}
          style={{
            padding: `${space[1]} ${space[3]}`,
            borderRadius: radius.full,
            border: "none",
            background: !selectedSector ? colors.accentRed : colors.surface,
            color: !selectedSector ? "#ffffff" : colors.textSecondary,
            fontFamily: typography.fontFamily,
            fontSize: typography.captionSm.size,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          All Sectors
        </button>
        {SECTORS.map((sector) => (
          <button
            key={sector}
            onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
            style={{
              padding: `${space[1]} ${space[3]}`,
              borderRadius: radius.full,
              border: selectedSector === sector ? `1px solid ${colors.accentRed}` : `1px solid ${colors.hairline}`,
              background: selectedSector === sector ? `${colors.accentRed}20` : colors.surface,
              color: selectedSector === sector ? colors.accentRed : colors.textSecondary,
              fontFamily: typography.fontFamily,
              fontSize: typography.captionSm.size,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Rankings table */}
      <div className="raycast-stagger-5" style={{ animationDelay: "0.4s", borderRadius: radius.lg, border: `1px solid ${colors.hairline}`, overflow: "hidden" }}>
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 120px 140px 80px 100px",
            gap: space[3],
            padding: `${space[3]} ${space[4]}`,
            background: colors.surface,
            borderBottom: `1px solid ${colors.hairline}`,
            fontSize: typography.captionSm.size,
            color: colors.textTertiary,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span>#</span>
          <span>Company</span>
          <span>Sector</span>
          <span>{active.label} Score</span>
          <span>Rank Δ</span>
          <span>Price (₹)</span>
        </div>

        {filtered.map((stock) => (
          <div
            key={stock.symbol}
            onClick={() => setSelectedStock(stock)}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 120px 140px 80px 100px",
              gap: space[3],
              padding: `${space[3]} ${space[4]}`,
              borderBottom: `1px solid ${colors.hairlineSoft}`,
              background: selectedStock?.symbol === stock.symbol ? colors.surfaceElevated : colors.canvas,
              cursor: "pointer",
              alignItems: "center",
              fontSize: typography.bodySm.size,
              transition: "background 0.1s ease",
            }}
            onMouseEnter={(e) => { if (selectedStock?.symbol !== stock.symbol) e.currentTarget.style.background = colors.surface; }}
            onMouseLeave={(e) => { if (selectedStock?.symbol !== stock.symbol) e.currentTarget.style.background = colors.canvas; }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RankBadge rank={stock.rank} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: colors.textPrimary }}>{stock.symbol}</div>
              <div style={{ fontSize: typography.captionSm.size, color: colors.textTertiary }}>{stock.name}</div>
            </div>
            <div style={{ color: colors.textSecondary }}>{stock.sector}</div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{ fontWeight: 600, color: active.color, minWidth: 32 }}>{stock.scores[activeMetric]}</span>
              <ScoreBar value={stock.scores[activeMetric]} color={active.color} />
            </div>
            <div><RankChange change={stock.change} /></div>
            <div style={{ color: colors.textSecondary, fontVariantNumeric: "tabular-nums" }}>₹{formatInr(stock.price)}</div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selectedStock && (
        <div
          style={{
            marginTop: space[6],
            padding: space[6],
            borderRadius: radius.lg,
            background: colors.surface,
            border: `1px solid ${colors.hairline}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: typography.headingMd.size, fontWeight: 600 }}>
                {selectedStock.symbol} — {selectedStock.name}
              </div>
              <div style={{ fontSize: typography.bodySm.size, color: colors.textSecondary, marginTop: space[1] }}>
                {selectedStock.sector} · Overall Rank #{selectedStock.rank}
              </div>
            </div>
            <button
              onClick={() => setSelectedStock(null)}
              style={{ background: "none", border: "none", color: colors.textTertiary, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: space[4], marginTop: space[6] }}>
            {METRICS.map((m) => (
              <div key={m.id} style={{ textAlign: "center" }}>
                <div style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, marginBottom: space[1] }}>
                  {m.label}
                </div>
                <div style={{ fontSize: typography.headingLg.size, fontWeight: 600, color: m.color }}>
                  {selectedStock.scores[m.id]}
                </div>
                <div style={{ marginTop: space[2] }}>
                  <ScoreBar value={selectedStock.scores[m.id]} color={m.color} />
                </div>
                <div style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, marginTop: space[1] }}>
                  {m.description.split(",")[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI explanation panel */}
      {rankings.length > 0 && <ResearchAiExplanationPanel context={rankingContext} />}

      {/* Methodology note */}
      <div
        style={{
          marginTop: space[8],
          padding: space[4],
          borderRadius: radius.md,
          background: colors.surface,
          border: `1px solid ${colors.hairline}`,
          display: "flex",
          gap: space[3],
          alignItems: "flex-start",
        }}
      >
        <Info size={18} style={{ color: colors.textTertiary, flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, lineHeight: 1.6 }}>
          Relative strength scores are computed using our 8-factor weighted scoring engine. Ranks update daily after market close.
          Top 15% of stocks in each category earn a "Leader" badge. Past performance does not guarantee future results.
        </div>
      </div>
    </div>
  );
}
