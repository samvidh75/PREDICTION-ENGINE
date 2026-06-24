import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Star, BarChart3, Shield, Activity, Bookmark } from "lucide-react";
import { useStockData } from "../hooks/useStockData";
import { productNavigate } from "../components/product/ProductUI";
import { fPrice, fChange, fScore } from "../lib/format";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import type { PipelineResult } from "../services/data/CompanyDataPipeline";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

const FACTOR_GROUPS = ["quality", "valuation", "growth", "stability", "momentum", "risk"] as const;
const FACTOR_LABELS: Record<string, string> = { quality: "Quality", valuation: "Valuation", growth: "Growth", stability: "Stability", momentum: "Momentum", risk: "Safety" };
const FACTOR_ICONS: Record<string, React.ReactNode> = { quality: <Star className="h-4 w-4" />, valuation: <BarChart3 className="h-4 w-4" />, growth: <TrendingUp className="h-4 w-4" />, stability: <Shield className="h-4 w-4" />, momentum: <Activity className="h-4 w-4" />, risk: <AlertCircle className="h-4 w-4" /> };

function scoreColor(v: number | null): string {
  if (v === null) return "#9CA3AF";
  if (v >= 75) return "#057A55";
  if (v >= 55) return "#1A56DB";
  if (v >= 35) return "#92400E";
  return "#C81E1E";
}

function classificationLabel(cls: string): string {
  const map: Record<string, string> = { EXCELLENT: "Excellent", HEALTHY: "Healthy", STABLE: "Stable", WEAKENING: "Weakening", AT_RISK: "At Risk", INSUFFICIENT_DATA: "Insufficient Data" };
  return map[cls] ?? cls;
}

function classificationColor(cls: string): string {
  const map: Record<string, string> = { EXCELLENT: "#057A55", HEALTHY: "#057A55", STABLE: "#1A56DB", WEAKENING: "#92400E", AT_RISK: "#C81E1E" };
  return map[cls] ?? "#9CA3AF";
}

function getFactorSummary(group: string, score: number | null, missingFeatures: string[]): string {
  if (score === null) return "Insufficient data to score this factor.";
  if (missingFeatures.length > 0) return `Partial data: ${missingFeatures.join(", ")} unavailable.`;
  const level = score >= 75 ? "strong" : score >= 55 ? "moderate" : score >= 35 ? "weak" : "very weak";
  const map: Record<string, string> = {
    quality: `Business quality is ${level}. Higher ROE, ROA, and ROIC indicate more efficient capital use.`,
    valuation: `Valuation appears ${level} relative to earnings and assets. Lower PE and PB are more attractive.`,
    growth: `Revenue and earnings growth is ${level}. Consistent growth above 15% YoY is the target benchmark.`,
    stability: `Financial stability is ${level}. Low debt, strong liquidity, and healthy margins contribute positively.`,
    momentum: `Technical momentum is ${level}. RSI, MACD, and price trend relative to moving averages drive this score.`,
    risk: `Safety profile is ${level} (higher = safer). Low beta and conservative leverage reduce risk.`,
  };
  return map[group] ?? `Score: ${score}/100`;
}

function driverValues(group: string, p: PipelineResult): { label: string; value: string }[] {
  const f = p.fundamentals;
  const t = p.technicals;
  const drivers: Record<string, { label: string; value: string }[]> = {
    quality: [{ label: "ROE", value: f.roe !== null ? `${(f.roe * 100).toFixed(1)}%` : "—" }, { label: "ROA", value: f.roa !== null ? `${(f.roa * 100).toFixed(1)}%` : "—" }, { label: "ROIC", value: f.roic !== null ? `${(f.roic * 100).toFixed(1)}%` : "—" }],
    valuation: [{ label: "P/E", value: f.peRatio !== null ? f.peRatio.toFixed(1) : "—" }, { label: "P/B", value: f.pbRatio !== null ? f.pbRatio.toFixed(1) : "—" }, { label: "EV/EBITDA", value: f.evEbitda !== null ? `${f.evEbitda.toFixed(1)}x` : "—" }],
    growth: [{ label: "Rev Growth", value: f.revenueGrowth !== null ? `${(f.revenueGrowth * 100).toFixed(1)}%` : "—" }, { label: "EPS Growth", value: f.epsGrowth !== null ? `${(f.epsGrowth * 100).toFixed(1)}%` : "—" }, { label: "Profit Growth", value: f.profitGrowth !== null ? `${(f.profitGrowth * 100).toFixed(1)}%` : "—" }],
    stability: [{ label: "D/E", value: f.debtToEquity !== null ? f.debtToEquity.toFixed(2) : "—" }, { label: "Current Ratio", value: f.currentRatio !== null ? f.currentRatio.toFixed(2) : "—" }, { label: "Op. Margin", value: f.operatingMargin !== null ? `${(f.operatingMargin * 100).toFixed(1)}%` : "—" }],
    momentum: [{ label: "RSI (14)", value: t.rsi14 !== null ? t.rsi14.toFixed(1) : "—" }, { label: "MACD", value: t.macd !== null ? t.macd.toFixed(2) : "—" }, { label: "SMA50", value: t.movingAverageDistance50 !== null ? `${(t.movingAverageDistance50 * 100).toFixed(1)}%` : "—" }],
    risk: [{ label: "Beta", value: f.beta !== null ? f.beta.toFixed(2) : "—" }, { label: "D/E", value: f.debtToEquity !== null ? f.debtToEquity.toFixed(2) : "—" }, { label: "ATR", value: t.atr14 !== null ? t.atr14.toFixed(2) : "—" }],
  };
  return drivers[group] ?? [];
}

function ScoreRing({ score, size = 80 }: { score: number | null; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  const grade = score !== null ? (score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F") : "—";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score !== null ? `Score: ${Math.round(score)}` : "Score unavailable"}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="48%" textAnchor="middle" dy="0" fontSize={size < 56 ? 14 : 24} fontWeight="600" fill="#111827" fontFamily="system-ui">
        {score !== null ? Math.round(score) : "—"}
      </text>
      <text x="50%" y={size / 2 + (size < 56 ? 10 : 16)} textAnchor="middle" fontSize={size < 56 ? 8 : 12} fontWeight="500" fill="#9CA3AF" fontFamily="system-ui">
        {grade}
      </text>
    </svg>
  );
}

export default function StockStoryPageF0(): JSX.Element {
  const [ticker, setTicker] = useState<string>(() => {
    const p = new URLSearchParams(window.location.search);
    return (p.get("id") ?? p.get("ticker") ?? "").toUpperCase().trim();
  });
  const { pipeline, loading, error, refetch } = useStockData(ticker || null);
  const [tracked, setTracked] = useState(() => isTracked(ticker));

  useEffect(() => {
    const onUrl = () => {
      const p = new URLSearchParams(window.location.search);
      const sym = (p.get("id") ?? p.get("ticker") ?? "").toUpperCase().trim();
      if (sym && sym !== ticker) setTicker(sym);
    };
    window.addEventListener("urlchange", onUrl);
    window.addEventListener("popstate", onUrl);
    return () => { window.removeEventListener("urlchange", onUrl); window.removeEventListener("popstate", onUrl); };
  }, [ticker]);

  const pred = pipeline?.prediction ?? null;
  const factorScores = pred?.factorScores ?? [];
  const pricePos = pipeline ? (pipeline.price.change ?? 0) >= 0 : true;
  const classification = pred?.classification ?? "INSUFFICIENT_DATA";

  const weightedScore = useMemo(() => {
    if (!pred?.factorScores?.length) return pred?.rankingScore ?? null;
    const weights: Record<string, number> = { quality: 0.22, valuation: 0.18, growth: 0.20, stability: 0.12, momentum: 0.13, risk: 0.15 };
    let total = 0;
    for (const fs of pred.factorScores) {
      if (fs.value !== null) total += fs.value * (weights[fs.group] ?? 0);
    }
    return Math.round(total);
  }, [pred]);

  if (!ticker) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF]">
        No stock selected. Go back and search for a symbol.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E5E7EB] shadow-sm">
        <div className="mx-auto max-w-[1180px] px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button type="button" onClick={() => productNavigate("search")} className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-xs">Back</span>
              </button>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EFF6FF] text-[#1D4ED8]">{pipeline?.price?.exchange ?? "NSE"}</span>
              <span className="font-semibold text-[20px] text-[#111827] tracking-tight">{ticker}</span>
            </div>
            {pipeline?.companyName && <span className="text-[13px] text-[#6B7280] -mt-1 md:mt-0">{pipeline.companyName}</span>}
            <div className="flex items-center gap-3 ml-auto">
              <div className="text-right">
                {pipeline?.price.current !== null && pipeline?.price.current !== undefined ? (
                  <>
                    <span className="text-[28px] font-semibold tabular-nums text-[#111827] leading-none">{fPrice(pipeline.price.current)}</span>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium ml-2 ${pricePos ? "bg-[#DEF7EC] text-[#057A55]" : "bg-[#FDE8E8] text-[#C81E1E]"}`}>
                      <span>{pricePos ? "+" : ""}{pipeline.price.change?.toFixed(2) ?? "—"}%</span>
                      {pipeline.price.changeAbs !== null && <span>({fChange(pipeline.price.changeAbs)})</span>}
                    </div>
                  </>
                ) : loading ? (
                  <span className="text-sm text-[#9CA3AF]">Loading...</span>
                ) : (
                  <span className="text-sm text-[#9CA3AF]">Price unavailable</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { isTracked(ticker) ? removeTrackedCompany(ticker) : addTrackedCompany({ symbol: ticker, companyName: pipeline?.companyName ?? "", addedAt: new Date().toISOString(), source: "stock_page" }); setTracked(!tracked); }} className="h-8 px-3 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB] transition-colors">
                  <Bookmark className="inline h-3 w-3 mr-1" />{tracked ? "Tracked" : "Track"}
                </button>
                <button type="button" onClick={() => productNavigate("compare", ticker)} className="h-8 px-3 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB] transition-colors">
                  Compare
                </button>
                <button type="button" onClick={refetch} disabled={loading} className="h-8 px-3 text-xs font-medium rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-40 transition-colors">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-6 space-y-5">
        {error && !pipeline && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{error}</div>
        )}

        {loading && !pipeline && (
          <div className="p-8 bg-white border border-[#E5E7EB] rounded-2xl text-center text-[#9CA3AF]"><RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />Loading {ticker}...</div>
        )}

        {pipeline && (
          <>
            {/* Engine Score Card */}
            <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-3/5 space-y-4">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={pred?.rankingScore ?? weightedScore} size={80} />
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ color: classificationColor(classification), borderColor: `${classificationColor(classification)}30`, background: `${classificationColor(classification)}15` }}>{classificationLabel(classification)}</span>
                      <div className="mt-1 text-[13px] text-[#4B5563]">Confidence: <strong>{pred?.confidenceLevel ?? "—"}</strong></div>
                    </div>
                  </div>
                  <div className="space-y-[10px]">
                    {FACTOR_GROUPS.map((group) => {
                      const fs = factorScores.find(f => f.group === group);
                      const score = fs?.value ?? null;
                      const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
                      return (
                        <div key={group} className="flex items-center gap-3">
                          <span className="w-20 text-xs font-medium text-[#6B7280] capitalize">{FACTOR_LABELS[group] ?? group}</span>
                          <div className="flex-1 h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: scoreColor(score) }} />
                          </div>
                          <span className="w-8 text-right text-xs font-semibold tabular-nums" style={{ color: scoreColor(score) }}>{fScore(score)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF]">
                    <span className="rounded bg-[#F3F4F6] px-2 py-1 font-mono">Unified Engine v2.0.0</span>
                    <span><strong className="text-[#6B7280]">{pipeline.dataCompleteness}%</strong> data available</span>
                    <span>· <strong className="text-[#6B7280]">{pred?.confidenceLevel ?? "—"}</strong> confidence</span>
                  </div>
                </div>
                <div className="lg:w-2/5 lg:pl-6 lg:border-l lg:border-[#E5E7EB]">
                  <div className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider mb-3">Pipeline Health</div>
                  <div className="space-y-2">
                    {[
                      { name: "IndianAPI", ok: pipeline.price.current !== null && pipeline.price.source === "indianapi", status: "Live price" },
                      { name: "Yahoo", ok: pipeline.technicals.closePrices.length > 0, status: "Historical" },
                      { name: "Screener", ok: pipeline.fundamentals.fundamentalSource !== null, status: pipeline.fundamentals.fundamentalSource ?? "Pending" },
                      { name: "Upstox", ok: false, status: "Not configured" },
                    ].map(({ name, ok, status }) => (
                      <div key={name} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 rounded-full ${ok ? "bg-[#057A55]" : status === "Pending" ? "bg-[#92400E]" : "bg-[#D1D5DB]"}`} />
                        <span className="text-[#4B5563]">{name}</span>
                        <span className="ml-auto text-[#9CA3AF]">{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Factor Cards (Thesis) */}
            <section className="grid gap-3 md:grid-cols-2">
              {FACTOR_GROUPS.map((group) => {
                const fs = factorScores.find(f => f.group === group);
                const score = fs?.value ?? null;
                const drivers = driverValues(group, pipeline);
                return (
                  <article key={group} className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                        <span style={{ color: "#1A56DB" }}>{FACTOR_ICONS[group]}</span>
                        {FACTOR_LABELS[group]}
                      </span>
                      <span className="text-[32px] font-semibold tabular-nums leading-none" style={{ color: scoreColor(score) }}>{fScore(score)}</span>
                    </div>
                    <div className="h-[6px] bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${score !== null ? Math.max(0, Math.min(100, score)) : 0}%`, backgroundColor: scoreColor(score) }} />
                    </div>
                    <p className="text-[13px] text-[#4B5563] leading-relaxed">{getFactorSummary(group, score, fs?.missingFeatures ?? [])}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#9CA3AF] font-mono">
                      {drivers.map((d, i) => (
                        <span key={i}>{d.label}: <strong className="text-[#6B7280]">{d.value}</strong>{i < drivers.length - 1 ? " ·" : ""}</span>
                      ))}
                    </div>
                    {score === null && (
                      <div className="rounded-lg bg-[#FEF3C7] p-2 text-xs text-[#92400E]">Missing inputs — awaiting data</div>
                    )}
                  </article>
                );
              })}
            </section>

            {/* Pipeline Errors */}
            {pipeline.pipelineErrors.length > 0 && (
              <div className="space-y-1">
                {pipeline.pipelineErrors.slice(0, 3).map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-[#92400E] bg-[#FEF3C7] rounded-lg px-3 py-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{err.slice(0, 120)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <SebiDisclaimer variant="footer" />
    </div>
  );
}
