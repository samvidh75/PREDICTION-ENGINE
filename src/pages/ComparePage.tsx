import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, Plus, ArrowLeftRight } from "lucide-react";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate } from "../components/product/ProductUI";
import { runCompanyDataPipeline, type PipelineResult } from "../services/data/CompanyDataPipeline";
import { fPrice, fPercent, fScore, fMarketCap, fRatio } from "../lib/format";
import { ScoreRing } from "../components/ui/ScoreRing";
import { ClassificationBadge } from "../components/ui/ClassificationBadge";

const MAX_SYMBOLS = 4;
const FACTOR_GROUPS = ["quality", "valuation", "growth", "stability", "momentum", "risk"] as const;
const FACTOR_LABEL: Record<string, string> = { quality: "Quality", valuation: "Valuation", growth: "Growth", stability: "Stability", momentum: "Momentum", risk: "Safety" };

function parseSymbolsFromUrl(): string[] {
  const p = new URLSearchParams(window.location.search);
  return (p.get("symbols") ?? p.get("ids") ?? p.get("id") ?? "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
}

function updateUrlSymbols(symbols: string[]) {
  const p = new URLSearchParams(window.location.search);
  symbols.length ? p.set("symbols", symbols.join(",")) : p.delete("symbols");
  window.history.replaceState({}, "", `?${p.toString()}`);
}

function factorScore(r: PipelineResult | null, group: string): number | null {
  const fs = r?.prediction?.factorScores?.find(f => f.group === group);
  if (fs?.value === null || fs?.value === undefined) return null;
  return group === "risk" ? Math.round(100 - fs.value) : Math.round(fs.value);
}

function fSMA50(r: PipelineResult | null): string {
  const d = r?.technicals?.movingAverageDistance50;
  if (d === null || d === undefined) return "—";
  return d > 0.005 ? "Above SMA50" : d < -0.005 ? "Below SMA50" : "At SMA50";
}

function isAboveSMA50(r: PipelineResult | null): boolean | null {
  const d = r?.technicals?.movingAverageDistance50;
  return d === null || d === undefined ? null : d > 0.005;
}



// ── Row definition helpers ────────────────────────────────────────────────────

interface RowConf {
  label: string;
  lowerIsBetter: boolean;
  raw: (r: PipelineResult) => number | null;
  display: (r: PipelineResult) => string;
}

function makeRows(): RowConf[] {
  return [
    { label: "Current price",  lowerIsBetter: false, raw: r => r.price.current, display: r => fPrice(r.price.current) },
    { label: "% Change",       lowerIsBetter: false, raw: r => r.price.change, display: r => fPercent(r.price.change, true) },
    { label: "52-week range",  lowerIsBetter: false, raw: r => r.price.weekHigh52 && r.price.weekLow52 ? (r.price.weekHigh52 - r.price.weekLow52) : null, display: r => r.price.weekLow52 && r.price.weekHigh52 ? `${fPrice(r.price.weekLow52)} – ${fPrice(r.price.weekHigh52)}` : "—" },
    { label: "Market cap",     lowerIsBetter: false, raw: r => r.price.marketCap, display: r => fMarketCap(r.price.marketCap) },
    { label: "P/E ratio",      lowerIsBetter: true,  raw: r => r.fundamentals.peRatio, display: r => fRatio(r.fundamentals.peRatio, "x") },
    { label: "P/B ratio",      lowerIsBetter: false, raw: r => r.fundamentals.pbRatio, display: r => fRatio(r.fundamentals.pbRatio, "x") },
    { label: "EV/EBITDA",      lowerIsBetter: false, raw: r => r.fundamentals.evEbitda, display: r => fRatio(r.fundamentals.evEbitda, "x") },
    { label: "ROE",            lowerIsBetter: false, raw: r => r.fundamentals.roe, display: r => fPercent(r.fundamentals.roe) },
    { label: "ROA",            lowerIsBetter: false, raw: r => r.fundamentals.roa, display: r => fPercent(r.fundamentals.roa) },
    { label: "D/E ratio",      lowerIsBetter: true,  raw: r => r.fundamentals.debtToEquity, display: r => fRatio(r.fundamentals.debtToEquity, "x") },
    { label: "Revenue growth", lowerIsBetter: false, raw: r => r.fundamentals.revenueGrowth, display: r => fPercent(r.fundamentals.revenueGrowth) },
    { label: "EPS growth",     lowerIsBetter: false, raw: r => r.fundamentals.epsGrowth, display: r => fPercent(r.fundamentals.epsGrowth) },
    { label: "Operating margin", lowerIsBetter: false, raw: r => r.fundamentals.operatingMargin, display: r => fPercent(r.fundamentals.operatingMargin) },
    { label: "FCF yield",     lowerIsBetter: false, raw: r => r.fundamentals.fcfYield, display: r => fPercent(r.fundamentals.fcfYield) },
    { label: "RSI (14)",       lowerIsBetter: false, raw: r => r.technicals.rsi14, display: r => fScore(r.technicals.rsi14) },
    { label: "MACD signal",    lowerIsBetter: false, raw: r => r.technicals.macdSignal, display: r => r.technicals.macdSignal !== null ? r.technicals.macdSignal.toFixed(2) : "—" },
    { label: "ADX (14)",       lowerIsBetter: false, raw: r => r.technicals.adx14, display: r => fScore(r.technicals.adx14) },
    { label: "SMA50 position", lowerIsBetter: false, raw: r => isAboveSMA50(r) !== null ? (isAboveSMA50(r) ? 1 : 0) : null, display: r => fSMA50(r) },
  ];
}

function textColor(score: number | null): string {
  if (score === null) return "";
  if (score >= 70) return "#16A34A";
  if (score >= 55) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function barColor(score: number): string {
  if (score >= 70) return "#16A34A";
  if (score >= 55) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function bestWorstIndex(values: (number | null)[], lowerIsBetter: boolean): [best: number | null, worst: number | null] {
  const valid = values.map((v, i) => [v, i] as const).filter(([v]) => v !== null && Number.isFinite(v)) as [number, number][];
  if (valid.length < 2) return [null, null];
  if (lowerIsBetter) {
    valid.sort((a, b) => a[0] - b[0]);
  } else {
    valid.sort((a, b) => b[0] - a[0]);
  }
  return [valid[0][1], valid[valid.length - 1][1]];
}

// ── Main Component ────────────────────────────────────────────────────────────

export const ComparePage: React.FC = () => {
  useDocumentTitle("Compare Stocks | StockStory India");
  const [symbols, setSymbols] = useState<string[]>(() => parseSymbolsFromUrl());
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addInput, setAddInput] = useState("");

  const fetchAll = useCallback(async (syms: string[]) => {
    if (syms.length === 0) return;
    const loadMap: Record<string, boolean> = {};
    const errMap: Record<string, string> = {};
    syms.forEach(s => { loadMap[s] = true; errMap[s] = ""; });
    setLoading(prev => ({ ...prev, ...loadMap }));
    setErrors(prev => ({ ...prev, ...errMap }));

    const settled = await Promise.allSettled(syms.map(s => runCompanyDataPipeline(s)));
    const newResults: Record<string, PipelineResult | null> = {};
    const newErrors: Record<string, string> = {};
    const newLoading: Record<string, boolean> = {};

    syms.forEach((s, i) => {
      newLoading[s] = false;
      if (settled[i].status === "fulfilled") {
        newResults[s] = settled[i].value;
        newErrors[s] = "";
      } else {
        newResults[s] = null;
        newErrors[s] = (settled[i] as PromiseRejectedResult).reason?.message ?? "Failed";
      }
    });

    setResults(prev => ({ ...prev, ...newResults }));
    setErrors(prev => ({ ...prev, ...newErrors }));
    setLoading(prev => ({ ...prev, ...newLoading }));
  }, []);

  useEffect(() => { fetchAll(symbols); }, [symbols, fetchAll]);

  const addSymbol = useCallback((sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean || symbols.includes(clean) || symbols.length >= MAX_SYMBOLS) return;
    const next = [...symbols, clean];
    setSymbols(next);
    updateUrlSymbols(next);
    setAddInput("");
  }, [symbols]);

  const removeSymbol = useCallback((sym: string) => {
    const next = symbols.filter(s => s !== sym);
    setSymbols(next);
    updateUrlSymbols(next);
  }, [symbols]);

  const handleAddKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addSymbol(addInput);
  }, [addInput, addSymbol]);

  const rows = useMemo(() => makeRows(), []);

  const summaryText = useMemo(() => {
    const parts: string[] = [];
    const leaders: Record<string, string[]> = {};
    for (const g of FACTOR_GROUPS) {
      const scored = symbols.map(s => ({ sym: s, score: factorScore(results[s] ?? null, g) })).filter(x => x.score !== null);
      if (scored.length < 2) continue;
      const best = scored.reduce((a, b) => (a.score ?? 0) >= (b.score ?? 0) ? a : b);
      const label = FACTOR_LABEL[g] ?? g;
      if (!leaders[best.sym]) leaders[best.sym] = [];
      leaders[best.sym].push(label);
    }
    for (const [sym, factors] of Object.entries(leaders)) {
      const sc = fScore(results[sym]?.prediction?.rankingScore ?? null);
      parts.push(`${sym} (${sc}) leads on ${factors.join(" and ")}`);
    }
    if (parts.length === 0) return null;
    return `Based on engine scores: ${parts.join(". ")}.`;
  }, [symbols, results]);

  return (
    <ProductShell>
      <ProductPage>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-[#2962FF]" />
              <h1 className="text-xl font-bold text-[#E6EDF3]">Compare stocks</h1>
            </div>
            <p className="mt-1 text-xs text-[#9AA7B5]">Compare 2–4 stocks side by side using real pipeline data</p>
          </div>
        </div>

        {symbols.length < MAX_SYMBOLS && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0D1117] px-4 py-2.5">
            <Plus className="h-4 w-4 shrink-0 text-[#9AA7B5]" />
            <input
              type="text"
              value={addInput}
              onChange={e => setAddInput(e.target.value.toUpperCase())}
              onKeyDown={handleAddKeyDown}
              placeholder="Add stock (e.g. TCS) and press Enter..."
              className="w-full bg-transparent text-xs text-[#E6EDF3] outline-none placeholder:text-[#9AA7B5]"
            />
          </div>
        )}

        {symbols.length === 0 && (
          <ProductPanel className="flex flex-col items-center gap-4 py-14 text-center border-white/[0.08]">
            <ArrowLeftRight className="h-10 w-10 text-[#2D333B]" />
            <div>
              <h2 className="text-sm font-semibold text-[#E6EDF3]">Add stocks to compare</h2>
              <p className="mt-1 text-xs text-[#9AA7B5]">Type a symbol above or use ?symbols=TCS,RELIANCE in the URL</p>
            </div>
            <ProductAction variant="secondary" onClick={() => productNavigate("scanner")}>Open AI Scanner</ProductAction>
          </ProductPanel>
        )}

        {symbols.length > 0 && (
          <>
            <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: `180px repeat(${symbols.length}, 1fr)` }}>
              {symbols.map(sym => (
                <div key={sym} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0D1117] px-3 py-2.5">
                  <button type="button" onClick={() => productNavigate("stock", sym)} className="min-w-0 text-left">
                    <span className="block truncate font-mono text-sm font-semibold text-[#E6EDF3] hover:underline">{sym}</span>
                    <span className="block truncate text-[10px] text-[#9AA7B5]">{results[sym]?.companyName ?? ""}</span>
                  </button>
                  <button type="button" onClick={() => removeSymbol(sym)} className="rounded p-1 text-[#9AA7B5] hover:text-[#E6EDF3]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0D1117]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#9AA7B5]">Metric</th>
                    {symbols.map(sym => (
                      <th key={sym} className="px-3 py-2.5 text-left font-mono text-xs font-bold text-[#E6EDF3]">{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* ── PRICE section ── */}
                  {[
                    { label: "Current price", render: r => fPrice(r?.price.current ?? null) },
                    { label: "% Change", render: r => <span className={r?.price.change && r.price.change > 0 ? "text-[#16A34A]" : r?.price.change && r.price.change < 0 ? "text-[#EF4444]" : ""}>{fPercent(r?.price.change ?? null, true)}</span> },
                    { label: "52-week range", render: r => r?.price.weekLow52 && r?.price.weekHigh52 ? `${fPrice(r.price.weekLow52)} – ${fPrice(r.price.weekHigh52)}` : "—" },
                    { label: "Market cap", render: r => fMarketCap(r?.price.marketCap ?? null) },
                    { label: "Exchange", render: r => r?.price.exchange ?? "—" },
                  ].map(({ label, render }) => (
                    <tr key={label} className="border-b border-white/[0.04]">
                      <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">{label}</td>
                      {symbols.map(sym => (
                        <td key={sym} className="px-3 py-2 font-mono text-xs text-[#E6EDF3]">{render(results[sym] ?? null)}</td>
                      ))}
                    </tr>
                  ))}

                  {/* ── ENGINE SCORE section ── */}
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <td colSpan={1 + symbols.length} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#2962FF]">Engine score</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">Overall score</td>
                    {symbols.map(sym => {
                      const sc = results[sym]?.prediction?.rankingScore ?? null;
                      return (
                        <td key={sym} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <ScoreRing score={sc} size="sm" showGrade />
                            <span className="font-mono text-sm font-bold" style={{ color: textColor(sc) }}>{fScore(sc)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">Classification</td>
                    {symbols.map(sym => (
                      <td key={sym} className="px-3 py-2">
                        <ClassificationBadge classification={(results[sym]?.prediction?.classification ?? "INSUFFICIENT_DATA") as any} size="sm" />
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">Confidence</td>
                    {symbols.map(sym => (
                      <td key={sym} className="px-3 py-2 font-mono text-xs" style={{ color: textColor(results[sym]?.prediction?.confidenceScore ?? null) }}>{fScore(results[sym]?.prediction?.confidenceScore ?? null)}%</td>
                    ))}
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">Data completeness</td>
                    {symbols.map(sym => (
                      <td key={sym} className="px-3 py-2 font-mono text-xs text-[#E6EDF3]">{fScore(results[sym]?.dataCompleteness ?? null)}%</td>
                    ))}
                  </tr>

                  {/* ── FACTOR SCORES section ── */}
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <td colSpan={1 + symbols.length} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#2962FF]">Factor scores</td>
                  </tr>
                  {FACTOR_GROUPS.map(g => (
                    <tr key={g} className="border-b border-white/[0.04]">
                      <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">{FACTOR_LABEL[g]}</td>
                      {(() => {
                        const vals = symbols.map(sym => factorScore(results[sym] ?? null, g));
                        const [best, worst] = bestWorstIndex(vals, false);
                        return symbols.map((sym, ci) => {
                          const v = vals[ci];
                          return (
                            <td key={sym} className={`px-3 py-2.5 ${ci === best ? "bg-[rgba(22,163,74,0.08)]" : ci === worst ? "bg-[rgba(239,68,68,0.08)]" : ""}`}>
                              {v !== null ? (
                                <div className="flex items-center gap-2">
                                  <span className="w-6 text-right font-mono text-xs font-bold" style={{ color: barColor(v) }}>{v}</span>
                                  <div className="h-1.5 w-full max-w-[60px] overflow-hidden rounded-full bg-[#1E242C]">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, v)}%`, backgroundColor: barColor(v) }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#9AA7B5]">—</span>
                              )}
                            </td>
                          );
                        });
                      })()}
                    </tr>
                  ))}

                  {/* ── FUNDAMENTALS section ── */}
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <td colSpan={1 + symbols.length} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#2962FF]">Fundamentals</td>
                  </tr>
                  {rows.slice(4, 14).map(row => (
                    <tr key={row.label} className="border-b border-white/[0.04]">
                      <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">{row.label}</td>
                      {(() => {
                        const vals = symbols.map(sym => results[sym] ? row.raw(results[sym] as PipelineResult) : null);
                        const [best, worst] = bestWorstIndex(vals, row.lowerIsBetter);
                        return symbols.map((sym, ci) => (
                          <td key={sym} className={`px-3 py-2 font-mono text-xs transition-colors ${ci === best ? "bg-[rgba(22,163,74,0.08)] text-[#16A34A]" : ci === worst ? "bg-[rgba(239,68,68,0.08)] text-[#EF4444]" : "text-[#E6EDF3]"}`}>
                            {results[sym] ? row.display(results[sym] as PipelineResult) : <span className="text-[#9AA7B5]">—</span>}
                          </td>
                        ));
                      })()}
                    </tr>
                  ))}

                  {/* ── TECHNICALS section ── */}
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <td colSpan={1 + symbols.length} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#2962FF]">Technicals</td>
                  </tr>
                  {rows.slice(14).map(row => (
                    <tr key={row.label} className="border-b border-white/[0.04]">
                      <td className="sticky left-0 z-10 bg-[#0D1117] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9AA7B5]">{row.label}</td>
                      {(() => {
                        const vals = symbols.map(sym => results[sym] ? row.raw(results[sym] as PipelineResult) : null);
                        const [best, worst] = bestWorstIndex(vals, row.lowerIsBetter);
                        return symbols.map((sym, ci) => (
                          <td key={sym} className={`px-3 py-2 font-mono text-xs transition-colors ${ci === best ? "bg-[rgba(22,163,74,0.08)] text-[#16A34A]" : ci === worst ? "bg-[rgba(239,68,68,0.08)] text-[#EF4444]" : "text-[#E6EDF3]"}`}>
                            {results[sym] ? row.display(results[sym] as PipelineResult) : <span className="text-[#9AA7B5]">—</span>}
                          </td>
                        ));
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summaryText && symbols.length >= 2 && (
              <ProductPanel className="mt-5 border border-[rgba(41,98,255,0.2)] bg-[rgba(41,98,255,0.04)] p-4">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#2962FF]">Summary verdict</div>
                <p className="text-xs leading-relaxed text-[#E6EDF3]">{summaryText}</p>
              </ProductPanel>
            )}
          </>
        )}
      </ProductPage>
    </ProductShell>
  );
};

export default ComparePage;
