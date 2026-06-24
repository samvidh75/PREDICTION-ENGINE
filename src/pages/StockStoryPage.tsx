import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft, ExternalLink, RefreshCw, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Star, BarChart3, Shield, Activity,
  Users, Info, ChevronDown, Building2,
} from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { productNavigate } from "../components/product/ProductUI";
import { formatINR, formatPercent } from "../hooks/useLiveQuotes";
import { fPrice, fChange, fRelativeTime } from "../lib/format";
import type { UnifiedFactorScore, UnifiedFactorGroup } from "../prediction-engine/types";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readSymbolFromUrl(): string {
  if (typeof window === "undefined") return "";
  const p = new URLSearchParams(window.location.search);
  return (p.get("id") ?? p.get("ticker") ?? "").toUpperCase().trim();
}

function readTabFromUrl(): TabKey {
  if (typeof window === "undefined") return "thesis";
  const t = new URLSearchParams(window.location.search).get("tab") as TabKey | null;
  return t && TABS.includes(t) ? t : "thesis";
}

function fmt(v: number | null | undefined, decimals = 1, suffix = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}${suffix}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const pct = Math.abs(v) <= 2 ? v * 100 : v;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function fmtRatio(v: number | null | undefined, suffix = "x"): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}${suffix}`;
}

function fmtScore(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v).toString();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  return `${Math.round(diff / 86400)} days ago`;
}

function scoreColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v >= 70) return "#16A34A";
  if (v >= 55) return "#22C55E";
  if (v >= 40) return "#F59E0B";
  if (v >= 25) return "#FB923C";
  return "#EF4444";
}

function classificationColor(cls: string): string {
  switch (cls) {
    case "EXCELLENT": return "#16A34A";
    case "HEALTHY": return "#22C55E";
    case "STABLE": return "#2962FF";
    case "WEAKENING": return "#F59E0B";
    case "AT_RISK": return "#EF4444";
    default: return "#94A3B8";
  }
}

function classificationLabel(cls: string): string {
  switch (cls) {
    case "EXCELLENT": return "Excellent";
    case "HEALTHY": return "Healthy";
    case "STABLE": return "Stable";
    case "WEAKENING": return "Weakening";
    case "AT_RISK": return "At Risk";
    case "INSUFFICIENT_DATA": return "Insufficient Data";
    default: return cls;
  }
}

function confidenceColor(level: string): string {
  switch (level) {
    case "HIGH": return "#16A34A";
    case "MEDIUM": return "#F59E0B";
    case "LOW": case "CRITICAL": return "#EF4444";
    default: return "#94A3B8";
  }
}

type TabKey = "thesis" | "fundamentals" | "risk" | "technicals" | "peers";
const TABS: TabKey[] = ["thesis", "fundamentals", "risk", "technicals", "peers"];
const TAB_LABELS: Record<TabKey, string> = {
  thesis: "Thesis",
  fundamentals: "Fundamentals",
  risk: "Risk",
  technicals: "Technicals",
  peers: "Peers",
};

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score !== null ? `Score: ${Math.round(score)}` : "Score unavailable"}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize={size < 56 ? 11 : 18} fontWeight="700" fill={color}>
        {score !== null ? Math.round(score) : "—"}
      </text>
    </svg>
  );
}

// ── Factor Bar ────────────────────────────────────────────────────────────────

function FactorBar({ label, score }: { label: string; score: number | null }) {
  const color = scoreColor(score);
  const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-[#64748B] truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums" style={{ color }}>{fmtScore(score)}</span>
    </div>
  );
}

// ── Metric Cell ───────────────────────────────────────────────────────────────

function MetricCell({
  label, value, source, note,
}: {
  label: string; value: string; source?: string; note?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-3 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#CBD5E1] transition-colors group">
      <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-semibold">{label}</span>
      <span className="text-lg font-bold text-[#1E293B] tabular-nums leading-snug">
        {value === "—" ? <span className="text-[#CBD5E1]">—</span> : value}
      </span>
      {note && <span className="text-[10px] text-[#94A3B8]">{note}</span>}
      {source && (
        <span className="text-[9px] text-[#CBD5E1] group-hover:text-[#94A3B8] transition-colors">Source: {source}</span>
      )}
    </div>
  );
}

// ── SEBI Disclaimer ───────────────────────────────────────────────────────────

function SebiDisclaimer() {
  return (
    <footer className="mt-8 px-4 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
      <p className="text-[11px] leading-5 text-[#94A3B8] max-w-5xl mx-auto">
        <strong className="font-semibold text-[#64748B]">Disclaimer:</strong>{" "}
        Research scores, factor analysis, and signals on this platform are for educational and research purposes only. They are not recommendations to buy, sell, or hold any securities. Past research scores are not indicative of future returns. StockStory India is not a SEBI-registered investment adviser. Always consult a SEBI-registered investment adviser before making investment decisions. All investments are subject to market risk; read all scheme-related documents carefully. SEBI registration is not an endorsement or guarantee of returns.
      </p>
    </footer>
  );
}

// ── Thesis Tab ────────────────────────────────────────────────────────────────

const FACTOR_META: Record<string, { icon: React.ReactNode; color: string; drivers: (p: PipelineResult) => string }> = {
  quality: {
    icon: <Star className="h-4 w-4" />,
    color: "#2962FF",
    drivers: (p) => `ROE ${fmtPct(p.fundamentals.roe)} · ROA ${fmtPct(p.fundamentals.roa)} · ROIC ${fmtPct(p.fundamentals.roic)}`,
  },
  valuation: {
    icon: <BarChart3 className="h-4 w-4" />,
    color: "#7C3AED",
    drivers: (p) => `PE ${fmt(p.fundamentals.peRatio, 1)} · PB ${fmt(p.fundamentals.pbRatio, 1)} · EV/EBITDA ${fmt(p.fundamentals.evEbitda, 1)}x`,
  },
  growth: {
    icon: <TrendingUp className="h-4 w-4" />,
    color: "#059669",
    drivers: (p) => `Revenue ${fmtPct(p.fundamentals.revenueGrowth)} · EPS ${fmtPct(p.fundamentals.epsGrowth)} · Profit ${fmtPct(p.fundamentals.profitGrowth)}`,
  },
  stability: {
    icon: <Shield className="h-4 w-4" />,
    color: "#0EA5E9",
    drivers: (p) => `D/E ${fmtRatio(p.fundamentals.debtToEquity)} · Current Ratio ${fmtRatio(p.fundamentals.currentRatio)} · Op. Margin ${fmtPct(p.fundamentals.operatingMargin)}`,
  },
  momentum: {
    icon: <Activity className="h-4 w-4" />,
    color: "#F59E0B",
    drivers: (p) => {
      const macdDir = p.technicals.macd !== null ? (p.technicals.macd > 0 ? "Bullish" : "Bearish") : "—";
      const maDist = p.technicals.movingAverageDistance50 !== null
        ? `${(p.technicals.movingAverageDistance50 * 100).toFixed(1)}% above SMA50`
        : "MA dist —";
      return `RSI ${fmt(p.technicals.rsi14, 1)} · MACD ${macdDir} · ${maDist}`;
    },
  },
  risk: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "#EF4444",
    drivers: (p) => `Beta ${fmt(p.fundamentals.beta, 2)} · D/E ${fmtRatio(p.fundamentals.debtToEquity)} · ATR ${fmt(p.technicals.atr14, 2)}`,
  },
};

function ThesisTab({ pipeline }: { pipeline: PipelineResult }) {
  const { prediction, fundamentals, technicals } = pipeline;
  const factorScores: UnifiedFactorScore[] = prediction?.factorScores ?? [];

  const primaryGroups: UnifiedFactorGroup[] = ["quality", "valuation", "growth", "stability", "momentum", "risk"];
  const displayedFactors = primaryGroups.map(g => factorScores.find(f => f.group === g)).filter(Boolean) as UnifiedFactorScore[];

  return (
    <div className="space-y-4">
      {displayedFactors.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Factor scores unavailable — prediction engine requires more data.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {primaryGroups.map((group) => {
          const fs = factorScores.find(f => f.group === group);
          const meta = FACTOR_META[group];
          const score = fs?.value ?? null;
          const color = meta?.color ?? "#64748B";
          const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;

          return (
            <div key={group} className="p-4 bg-white border border-[#E2E8F0] rounded-2xl flex flex-col gap-3 hover:border-[#CBD5E1] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color }}>
                  {meta?.icon}
                  <span className="text-sm font-semibold capitalize">{group}</span>
                </div>
                <span className="text-2xl font-bold tabular-nums" style={{ color: scoreColor(score) }}>
                  {fmtScore(score)}
                </span>
              </div>

              {/* Fill bar */}
              <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: scoreColor(score) }} />
              </div>

              {/* Reason text */}
              {fs?.reason && (
                <p className="text-xs text-[#64748B] leading-relaxed">{fs.reason}</p>
              )}

              {/* Driver values */}
              {meta && (
                <p className="text-[11px] text-[#94A3B8] font-mono leading-relaxed">
                  {meta.drivers(pipeline)}
                </p>
              )}

              {/* Missing features warning */}
              {fs && fs.missingFeatures.length > 0 && (
                <div className="flex items-start gap-1 text-[10px] text-[#F59E0B]">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Missing: {fs.missingFeatures.join(", ")}</span>
                </div>
              )}

              {!fs && (
                <div className="text-[11px] text-[#CBD5E1]">Insufficient data for this factor</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Fundamentals Tab ──────────────────────────────────────────────────────────

function FundamentalsTab({ pipeline }: { pipeline: PipelineResult }) {
  const f = pipeline.fundamentals;
  const freshDays = f.fundamentalFreshnessDays;
  const freshLabel = freshDays !== null ? `Updated ${freshDays === 0 ? "today" : `${freshDays}d ago`}` : undefined;
  const src = f.fundamentalSource === "screener" ? "Screener.in"
    : f.fundamentalSource === "indianapi" ? "IndianAPI"
    : f.fundamentalSource === "partial" ? "Multiple sources"
    : "—";

  return (
    <div className="space-y-6">
      {freshLabel && (
        <p className="text-xs text-[#94A3B8]">Last updated: {freshLabel} · Source: {src}</p>
      )}

      {/* Growth */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Growth</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCell label="Revenue Growth (3Y)" value={fmtPct(f.revenueGrowth)} source="Screener.in" />
          <MetricCell label="EPS Growth" value={fmtPct(f.epsGrowth)} source="Screener.in" />
          <MetricCell label="Profit Growth (3Y)" value={fmtPct(f.profitGrowth)} source="Screener.in" />
        </div>
      </div>

      {/* Profitability */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Profitability</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCell label="Gross Margin" value={fmtPct(f.grossMargin)} source="Screener.in" />
          <MetricCell label="Operating Margin" value={fmtPct(f.operatingMargin)} source="Screener.in" />
          <MetricCell label="Net Margin" value={fmtPct(f.netMargin)} source="Screener.in" />
        </div>
      </div>

      {/* Returns */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Returns</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCell label="ROE" value={fmtPct(f.roe)} source="Screener.in" />
          <MetricCell label="ROA" value={fmtPct(f.roa)} source="Screener.in" />
          <MetricCell label="ROIC" value={fmtPct(f.roic)} source="Screener.in" />
        </div>
      </div>

      {/* Leverage & Liquidity */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Leverage & Liquidity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCell label="D/E Ratio" value={fmtRatio(f.debtToEquity)} source="Screener.in" />
          <MetricCell label="Current Ratio" value={fmtRatio(f.currentRatio)} source="Screener.in" />
          <MetricCell label="Interest Coverage" value={fmtRatio(f.interestCoverage)} source="Screener.in" />
        </div>
      </div>

      {/* Valuation */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Valuation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCell label="P/E Ratio" value={fmt(f.peRatio, 1)} source="IndianAPI" />
          <MetricCell label="P/B Ratio" value={fmt(f.pbRatio, 1)} source="IndianAPI" />
          <MetricCell label="EV/EBITDA" value={fmt(f.evEbitda, 1, "x")} source="IndianAPI" />
        </div>
      </div>

      {/* Per Share */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Per Share</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCell label="EPS" value={fmt(f.eps, 2, " ₹")} source="IndianAPI" />
          <MetricCell label="Dividend Yield" value={fmtPct(f.dividendYield)} source="IndianAPI" />
          <MetricCell label="FCF Yield" value={fmtPct(f.fcfYield)} source="Screener.in" />
        </div>
      </div>
    </div>
  );
}

// ── Risk Tab ──────────────────────────────────────────────────────────────────

function RiskLevel({ level }: { level: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN" }) {
  const styles = {
    LOW: "bg-green-50 text-green-700 border-green-200",
    MODERATE: "bg-amber-50 text-amber-700 border-amber-200",
    HIGH: "bg-red-50 text-red-700 border-red-200",
    UNKNOWN: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[level]}`}>{level}</span>
  );
}

function RiskTab({ pipeline }: { pipeline: PipelineResult }) {
  const { fundamentals: f, technicals: t, prediction } = pipeline;

  const safetyScore = prediction?.factorScores.find(s => s.group === "risk")?.value ?? null;

  const betaLevel = f.beta === null ? "UNKNOWN" : f.beta > 1.5 ? "HIGH" : f.beta > 1.0 ? "MODERATE" : "LOW";
  const debtLevel = f.debtToEquity === null ? "UNKNOWN" : f.debtToEquity > 1.5 ? "HIGH" : f.debtToEquity > 0.75 ? "MODERATE" : "LOW";
  const liquidityLevel = f.currentRatio === null ? "UNKNOWN" : f.currentRatio < 1 ? "HIGH" : f.currentRatio < 1.5 ? "MODERATE" : "LOW";
  const fcfVsNet = f.netMargin !== null && f.fcfYield !== null
    ? (f.fcfYield > f.netMargin ? "LOW" : "MODERATE") as "LOW" | "MODERATE" | "HIGH" | "UNKNOWN"
    : "UNKNOWN";

  return (
    <div className="space-y-5">
      {/* Safety score summary */}
      <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-4">
        <ScoreRing score={safetyScore} size={56} />
        <div>
          <div className="text-sm font-semibold text-[#1E293B]">Engine Safety Score</div>
          <div className="text-xs text-[#64748B] mt-0.5">
            {safetyScore !== null
              ? safetyScore >= 70 ? "Low risk profile"
                : safetyScore >= 45 ? "Moderate risk"
                : "Elevated risk — review before investing"
              : "Score unavailable — insufficient data"}
          </div>
        </div>
      </div>

      {/* Beta unavailable banner */}
      {f.beta === null && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Beta unavailable — market risk cannot be assessed from available data.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Market Risk */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#1E293B]">Market Risk</div>
            <RiskLevel level={betaLevel} />
          </div>
          <div className="text-2xl font-bold tabular-nums text-[#1E293B]">{fmt(f.beta, 2)}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Beta · Sensitivity to Nifty 50 moves</div>
          <div className="text-[10px] text-[#CBD5E1] mt-1">Source: Yahoo Finance 2Y price history</div>
        </div>

        {/* Leverage Risk */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#1E293B]">Leverage Risk</div>
            <RiskLevel level={debtLevel} />
          </div>
          <div className="text-2xl font-bold tabular-nums text-[#1E293B]">{fmtRatio(f.debtToEquity)}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Debt/Equity Ratio</div>
          <div className="text-[10px] text-[#CBD5E1] mt-1">Source: Screener.in</div>
        </div>

        {/* Liquidity Risk */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#1E293B]">Liquidity Risk</div>
            <RiskLevel level={liquidityLevel} />
          </div>
          <div className="text-2xl font-bold tabular-nums text-[#1E293B]">{fmtRatio(f.currentRatio)}</div>
          <div className="text-xs text-[#94A3B8] mt-1">Current Ratio · {f.currentRatio !== null && f.currentRatio < 1 ? "Below 1 — potential short-term stress" : f.currentRatio !== null && f.currentRatio >= 2 ? "Comfortable coverage" : f.currentRatio !== null ? "Adequate" : "Data not available"}</div>
          <div className="text-[10px] text-[#CBD5E1] mt-1">Source: Screener.in</div>
        </div>

        {/* Earnings Quality */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#1E293B]">Earnings Quality</div>
            <RiskLevel level={fcfVsNet} />
          </div>
          <div className="text-sm tabular-nums text-[#1E293B] mt-1">
            FCF Yield {fmtPct(f.fcfYield)} vs Net Margin {fmtPct(f.netMargin)}
          </div>
          <div className="text-xs text-[#94A3B8] mt-1">
            {f.fcfYield !== null && f.netMargin !== null
              ? f.fcfYield > f.netMargin
                ? "FCF exceeds net margin — quality earnings"
                : "FCF below net margin — earnings quality review needed"
              : "Insufficient data for earnings quality assessment"}
          </div>
          <div className="text-[10px] text-[#CBD5E1] mt-1">Source: Screener.in</div>
        </div>
      </div>
    </div>
  );
}

// ── Technicals Tab ────────────────────────────────────────────────────────────

function TechnicalsTab({ pipeline }: { pipeline: PipelineResult }) {
  const { technicals: t, price } = pipeline;
  const dataLen = t.closePrices.length;

  if (dataLen < 15) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        Insufficient historical data for technical analysis (need 15+ days, have {dataLen}).
      </div>
    );
  }

  // Overall technical signal
  const rsi = t.rsi14;
  const macdH = t.macdHistogram;
  const maDist = t.movingAverageDistance50;

  const isBullish = rsi !== null && rsi > 55 && macdH !== null && macdH > 0 && maDist !== null && maDist > 0;
  const isBearish = rsi !== null && rsi < 45 && macdH !== null && macdH < 0 && maDist !== null && maDist < 0;
  const signal = isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NEUTRAL";
  const signalStyle = isBullish
    ? "bg-green-50 text-green-700 border-green-200"
    : isBearish
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-blue-50 text-blue-700 border-blue-200";

  const rsiZone = rsi === null ? "—" : rsi > 70 ? "Overbought" : rsi < 40 ? "Oversold" : "Normal";
  const adxStrength = t.adx14 === null ? "—"
    : t.adx14 < 20 ? "No trend"
    : t.adx14 < 25 ? "Weak trend"
    : t.adx14 < 40 ? "Trending"
    : "Strong trend";
  const bwLabel = t.bollingerWidth === null ? "—"
    : t.bollingerWidth < 0.08 ? "Tight (low volatility)"
    : t.bollingerWidth > 0.2 ? "Wide (high volatility)"
    : "Normal";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#64748B]">
          Computed from {dataLen} trading days of Yahoo Finance data
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${signalStyle}`}>{signal}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* RSI */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">RSI (14)</div>
          <div className="text-3xl font-bold tabular-nums text-[#1E293B]">{fmt(t.rsi14, 1)}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              rsiZone === "Overbought" ? "bg-red-50 text-red-700 border-red-200"
              : rsiZone === "Oversold" ? "bg-green-50 text-green-700 border-green-200"
              : "bg-blue-50 text-blue-600 border-blue-200"
            }`}>{rsiZone}</span>
          </div>
          <div className="text-[10px] text-[#CBD5E1] mt-2">Overbought &gt;70 · Normal 40–70 · Oversold &lt;40</div>
        </div>

        {/* MACD */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">MACD</div>
          <div className="text-3xl font-bold tabular-nums text-[#1E293B]">{fmt(t.macd, 2)}</div>
          <div className="text-xs text-[#64748B] mt-1.5 space-y-0.5">
            <div>Signal: {fmt(t.macdSignal, 2)}</div>
            <div>Histogram: <span className={t.macdHistogram !== null && t.macdHistogram > 0 ? "text-green-600" : "text-red-500"}>{fmt(t.macdHistogram, 2)}</span></div>
          </div>
          <div className="text-[10px] text-[#CBD5E1] mt-1">
            {t.macdHistogram !== null ? (t.macdHistogram > 0 ? "Bullish momentum" : "Bearish momentum") : "—"}
          </div>
        </div>

        {/* ADX */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">ADX (14)</div>
          <div className="text-3xl font-bold tabular-nums text-[#1E293B]">{fmt(t.adx14, 1)}</div>
          <div className="mt-1.5">
            <span className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-[10px] text-[#64748B]">{adxStrength}</span>
          </div>
          <div className="text-[10px] text-[#CBD5E1] mt-2">No trend &lt;20 · Weak 20–25 · Trending 25–40 · Strong &gt;40</div>
        </div>

        {/* Bollinger Width */}
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">Bollinger Width</div>
          <div className="text-3xl font-bold tabular-nums text-[#1E293B]">{fmt(t.bollingerWidth, 3)}</div>
          <div className="mt-1.5">
            <span className="px-2 py-0.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-[10px] text-[#64748B]">{bwLabel}</span>
          </div>
          <div className="text-[10px] text-[#CBD5E1] mt-2">SMA50 distance: {t.movingAverageDistance50 !== null ? `${(t.movingAverageDistance50 * 100).toFixed(1)}% ${t.movingAverageDistance50 >= 0 ? "above" : "below"}` : "—"}</div>
        </div>
      </div>
    </div>
  );
}

// ── Peers Tab ─────────────────────────────────────────────────────────────────

function PeersTab({ pipeline }: { pipeline: PipelineResult }) {
  const { sector, prediction: pred, fundamentals: f, price: p } = pipeline;

  // Derive peer symbols from same sector (using NIFTY50 as universe)
  // Since we don't have sector-level filtering, show top 5 NIFTY50 stocks excluding current
  const peerSymbols = useMemo(() => {
    return NIFTY50_SYMBOLS.filter(s => s !== pipeline.symbol).slice(0, 5);
  }, [pipeline.symbol]);

  if (!pred) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        Peer comparison requires a prediction engine output. Ensure price and fundamental data are available and retry.
      </div>
    );
  }

  const myScore = pred?.rankingScore ?? null;
  const myPE = f.peRatio;
  const myROE = f.roe;
  const myRevGrowth = f.revenueGrowth;

  return (
    <div className="space-y-4">
      <div className="text-sm text-[#64748B]">
        Comparing against Nifty 50 universe
        {sector ? ` · Sector: ${sector}` : ""}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="text-left py-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Symbol</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Score</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Class</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">PE</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden sm:table-cell">ROE</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">Rev Growth</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {/* Current stock */}
            <tr className="border-b border-[#F1F5F9] bg-blue-50/50">
              <td className="py-2.5 px-3 font-bold text-[#2962FF]">{pipeline.symbol} <span className="text-[10px] text-[#94A3B8] font-normal">(this)</span></td>
              <td className="py-2.5 px-3 text-right font-bold tabular-nums" style={{ color: scoreColor(myScore) }}>{fmtScore(myScore)}</td>
              <td className="py-2.5 px-3 text-right">
                {pred && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: classificationColor(pred.classification), background: `${classificationColor(pred.classification)}15` }}>
                    {classificationLabel(pred.classification)}
                  </span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-[#1E293B] hidden sm:table-cell">{fmt(myPE, 1)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-[#1E293B] hidden sm:table-cell">{fmtPct(myROE)}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-[#1E293B] hidden md:table-cell">{fmtPct(myRevGrowth)}</td>
              <td className="py-2.5 px-3"></td>
            </tr>
            {/* Peer rows — navigate on click */}
            {peerSymbols.map((sym) => (
              <tr
                key={sym}
                className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                onClick={() => productNavigate("stock", sym)}
              >
                <td className="py-2.5 px-3 font-semibold text-[#1E293B]">{sym}</td>
                <td className="py-2.5 px-3 text-right text-[#94A3B8] text-xs">—</td>
                <td className="py-2.5 px-3 text-right text-[#94A3B8] text-xs">—</td>
                <td className="py-2.5 px-3 text-right text-[#94A3B8] text-xs hidden sm:table-cell">—</td>
                <td className="py-2.5 px-3 text-right text-[#94A3B8] text-xs hidden sm:table-cell">—</td>
                <td className="py-2.5 px-3 text-right text-[#94A3B8] text-xs hidden md:table-cell">—</td>
                <td className="py-2.5 px-3">
                  <button
                    type="button"
                    className="text-[10px] text-[#2962FF] hover:underline font-semibold"
                    onClick={(e) => { e.stopPropagation(); productNavigate("stock", sym); }}
                  >
                    Research →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[#CBD5E1]">
        Click any peer row to load their full research report. Scores load on-demand to avoid rate limits.
      </p>
    </div>
  );
}

// ── Pipeline Health Panel ─────────────────────────────────────────────────────

function PipelineHealth({ pipeline }: { pipeline: PipelineResult }) {
  const { price, fundamentals, technicals, pipelineErrors } = pipeline;

  const providers = [
    { name: "IndianAPI (price)", ok: price.current !== null && price.source === "indianapi" },
    { name: "Yahoo (historical)", ok: technicals.closePrices.length > 0 },
    { name: "Screener (fundamentals)", ok: fundamentals.fundamentalSource !== null },
    { name: "Upstox (supplemental)", ok: false, unavailable: true },
  ];

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wider">Pipeline Health</div>
      {providers.map(({ name, ok, unavailable }) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          {unavailable ? (
            <Minus className="h-3 w-3 text-[#CBD5E1]" />
          ) : ok ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-400" />
          )}
          <span className={unavailable ? "text-[#CBD5E1]" : ok ? "text-[#64748B]" : "text-red-500"}>{name}</span>
          <span className={`ml-auto text-[10px] ${unavailable ? "text-[#CBD5E1]" : ok ? "text-green-500" : "text-red-400"}`}>
            {unavailable ? "Not configured" : ok ? "Live" : "Failed"}
          </span>
        </div>
      ))}
      {pipelineErrors.map((err, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1 mt-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="break-words">{err.slice(0, 120)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const StockStoryPage: React.FC = () => {
  const [symbol, setSymbol] = useState<string>(() => readSymbolFromUrl());
  const [activeTab, setActiveTab] = useState<TabKey>(() => readTabFromUrl());
  const { pipeline, loading, error, refetch } = useStockData(symbol || null);
  useDocumentTitle(symbol ? `${symbol} Research — ${pipeline?.companyName ?? ""} | StockStory India` : "Stock Detail | StockStory India");
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Sync symbol from URL changes (browser nav)
  useEffect(() => {
    const onUrl = () => {
      const sym = readSymbolFromUrl();
      if (sym && sym !== symbol) {
        setSymbol(sym);
        setActiveTab(readTabFromUrl());
      }
    };
    window.addEventListener("urlchange", onUrl);
    window.addEventListener("popstate", onUrl);
    return () => {
      window.removeEventListener("urlchange", onUrl);
      window.removeEventListener("popstate", onUrl);
    };
  }, [symbol]);

  useEffect(() => {
    if (loading && !pipeline) {
      retryTimeoutRef.current = setTimeout(() => setTimedOut(true), 10000);
    } else {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [loading, pipeline]);

  const pred = pipeline?.prediction ?? null;
  const pricePos = pipeline ? (pipeline.price.change ?? 0) >= 0 : true;

  if (!symbol) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-[#94A3B8]">
        No stock selected. Go back and search for a symbol.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Sticky Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E2E8F0] shadow-sm">
        <div className="mx-auto max-w-[1180px] px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          {/* Line 1: Back + Symbol + CompanyName + Exchange */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => productNavigate("search")}
              className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#1E293B] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <span className="text-[#E2E8F0]">·</span>
            <span className="font-mono text-lg font-bold text-[#1E293B]">{symbol}</span>
            {pipeline?.companyName && (
              <span className="text-sm text-[#94A3B8] truncate max-w-[200px]">{pipeline.companyName}</span>
            )}
            {pipeline?.price.exchange && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                {pipeline.price.exchange}
              </span>
            )}
          </div>

          {/* Line 2: Price + Change% + ChangeAbs */}
          <div className="flex items-center gap-2 md:ml-auto">
            {pipeline?.price.current !== null && pipeline?.price.current !== undefined ? (
              <>
                <span className="text-xl font-bold tabular-nums text-[#1E293B]">
                  {fPrice(pipeline.price.current)}
                </span>
                {pipeline.price.change !== null && (
                  <span className={`text-sm font-semibold tabular-nums ${pricePos ? "text-green-600" : "text-red-500"}`}>
                    {pricePos ? "+" : ""}{pipeline.price.change.toFixed(2)}%
                  </span>
                )}
                {pipeline.price.changeAbs !== null && (
                  <span className={`text-sm tabular-nums ${pricePos ? "text-green-600" : "text-red-500"}`}>
                    ({fChange(pipeline.price.changeAbs)})
                  </span>
                )}
                {pipeline.price.lastTradeTime && (
                  <span className="text-[10px] text-[#94A3B8] hidden md:inline">
                    {fRelativeTime(pipeline.price.lastTradeTime)}
                  </span>
                )}
              </>
            ) : loading ? (
              <span className="text-sm text-[#94A3B8]">Loading…</span>
            ) : (
              <span className="text-sm text-[#CBD5E1]">Price unavailable</span>
            )}
          </div>

          {/* Line 3: Action buttons - full width on mobile */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-40 transition-colors flex-1 md:flex-none"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => productNavigate("compare", symbol)}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors flex-1 md:flex-none"
            >
              Compare
            </button>
            <button
              type="button"
              onClick={() => productNavigate("broker", symbol)}
              className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] transition-colors flex-1 md:flex-none"
            >
              Continue to broker →
            </button>
            {/* SEBI Disclaimer tooltip */}
            <div className="relative group">
              <button type="button" className="flex items-center text-[#94A3B8] hover:text-[#64748B]" aria-label="SEBI disclaimer">
                <Info className="h-4 w-4" />
              </button>
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-3 text-[10px] text-[#64748B] leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Research scores are for educational purposes only. Not a SEBI-registered investment adviser. Not a buy/sell recommendation.
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 space-y-5">
        {/* ── Error / Loading ───────────────────────────────────────────── */}
        {error && !pipeline && !loading && (
          error.toLowerCase().includes("not found") || error.toLowerCase().includes("no data") ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="font-medium">Stock not found: {symbol}. Search for a valid NSE/BSE symbol.</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search symbol..."
                  defaultValue={symbol}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 outline-none focus:border-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                      productNavigate("search", (e.target as HTMLInputElement).value.trim());
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => productNavigate("search")}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )
        )}

        {loading && !pipeline && !timedOut && (
          <div className="p-8 bg-white border border-[#E2E8F0] rounded-2xl text-center text-[#94A3B8] text-sm">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading {symbol} research data…
          </div>
        )}

        {timedOut && !pipeline && (
          <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <span>Could not load stock data. Check your connection and try again.</span>
            <button
              type="button"
              onClick={() => { setTimedOut(false); refetch(); }}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {pipeline && (
          <>
            {/* ── Engine Score Card ──────────────────────────────────── */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left — Score ring */}
                <div className="flex flex-col items-center gap-3 md:border-r md:border-[#E2E8F0] md:pr-6">
                  <ScoreRing score={pred?.rankingScore ?? null} size={96} />
                  {pred && (
                    <>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                          style={{ color: classificationColor(pred.classification), background: `${classificationColor(pred.classification)}15`, borderColor: `${classificationColor(pred.classification)}30` }}
                        >
                          {classificationLabel(pred.classification)}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                          style={{ color: confidenceColor(pred.confidenceLevel), background: `${confidenceColor(pred.confidenceLevel)}15`, borderColor: `${confidenceColor(pred.confidenceLevel)}30` }}
                        >
                          {pred.confidenceLevel} confidence
                        </span>
                      </div>
                      <div className="text-[10px] text-[#CBD5E1] text-center">Unified Engine v2.0.0</div>
                    </>
                  )}

                  {/* Completeness bar */}
                  <div className="w-full mt-1">
                    <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                      <span>Data completeness</span>
                      <span>{pipeline.dataCompleteness} / 100</span>
                    </div>
                    <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full bg-[#2962FF] rounded-full" style={{ width: `${pipeline.dataCompleteness}%` }} />
                    </div>
                  </div>
                </div>

                {/* Middle — Factor bars */}
                <div className="flex flex-col gap-3 md:border-r md:border-[#E2E8F0] md:pr-6">
                  <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Factor Scores</div>
                  {pred ? (
                    (["quality", "valuation", "growth", "stability", "momentum", "risk"] as const).map(group => {
                      const fs = pred.factorScores.find(f => f.group === group);
                      return <FactorBar key={group} label={group.charAt(0).toUpperCase() + group.slice(1)} score={fs?.value ?? null} />;
                    })
                  ) : (
                    <span className="text-sm text-[#CBD5E1]">Awaiting engine output</span>
                  )}
                </div>

                {/* Right — Pipeline health */}
                <div>
                  <PipelineHealth pipeline={pipeline} />
                </div>
              </div>
            </div>

            {pred ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-[#E2E8F0] overflow-x-auto scrollbar-none">
                  {TABS.map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                        activeTab === tab
                          ? "border-[#2962FF] text-[#2962FF]"
                          : "border-transparent text-[#64748B] hover:text-[#1E293B] hover:border-[#E2E8F0]"
                      }`}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-5">
                  {activeTab === "thesis" && <ThesisTab pipeline={pipeline} />}
                  {activeTab === "fundamentals" && <FundamentalsTab pipeline={pipeline} />}
                  {activeTab === "risk" && <RiskTab pipeline={pipeline} />}
                  {activeTab === "technicals" && <TechnicalsTab pipeline={pipeline} />}
                  {activeTab === "peers" && <PeersTab pipeline={pipeline} />}
                </div>
              </div>
            ) : pipeline.price.current !== null && pipeline.price.current !== undefined ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="text-sm text-amber-800 font-medium">
                  Research scoring not yet available for this stock. Check back soon.
                </p>
              </div>
            ) : null}
          </>
        )}
      </main>

      <SebiDisclaimer />
    </div>
  );
};

export default StockStoryPage;
