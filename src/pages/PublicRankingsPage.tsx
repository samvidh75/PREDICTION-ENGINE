import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Lock, Search, Info, BookOpen, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import {
  ProductShell, ProductPage, ProductPanel, ProductAction, productNavigate,
} from "../components/product/ProductUI";
import { useAuth } from "../context/AuthContext";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { globalPipelineQueue } from "../services/data/PipelineQueue";
import { NIFTY50_SYMBOLS } from "../services/universe/StockUniverse";
import Input from "../components/ui/Input";

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v >= 70) return "#16A34A";
  if (v >= 55) return "#22C55E";
  if (v >= 40) return "#F59E0B";
  if (v >= 25) return "#FB923C";
  return "#EF4444";
}

function classLabel(cls: string): string {
  switch (cls) {
    case "EXCELLENT": return "Excellent";
    case "HEALTHY": return "Healthy";
    case "STABLE": return "Stable";
    case "WEAKENING": return "Weakening";
    case "AT_RISK": return "At Risk";
    default: return "—";
  }
}

function confidenceBadge(level: string): { label: string; cls: string } {
  switch (level) {
    case "HIGH": return { label: "High conf.", cls: "bg-green-50 text-green-700 border-green-200" };
    case "MEDIUM": return { label: "Med conf.", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    case "LOW": return { label: "Low conf.", cls: "bg-red-50 text-red-700 border-red-200" };
    case "CRITICAL": return { label: "Critical", cls: "bg-red-50 text-red-700 border-red-200" };
    default: return { label: "—", cls: "bg-gray-50 text-gray-500 border-gray-200" };
  }
}

// ── Mini Score Ring ───────────────────────────────────────────────────────────

function MiniRing({ score }: { score: number | null }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = score !== null ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = scoreColor(score);
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" role="img" aria-label={score !== null ? `Score ${Math.round(score)}` : "Score unavailable"}>
      <circle cx={20} cy={20} r={r} fill="none" stroke="#E2E8F0" strokeWidth={5} />
      <circle
        cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round" transform="rotate(-90 20 20)"
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize="10" fontWeight="700" fill={color}>
        {score !== null ? Math.round(score) : "—"}
      </text>
    </svg>
  );
}

// ── Mini Bar ──────────────────────────────────────────────────────────────────

function MiniBar({ label, score }: { label: string; score: number | null }) {
  const pct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
  const color = scoreColor(score);
  return (
    <div className="flex flex-col gap-0.5 w-16">
      <span className="text-[9px] text-[#94A3B8] uppercase tracking-wider truncate">{label}</span>
      <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden w-full">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
        {score !== null ? Math.round(score) : "—"}
      </span>
    </div>
  );
}

// ── Stock Row ─────────────────────────────────────────────────────────────────

function StockRow({
  symbol,
  rank,
  result,
  isAuthenticated,
  onNavigate,
}: {
  symbol: string;
  rank: number;
  result: PipelineResult | null;
  isAuthenticated: boolean;
  onNavigate: () => void;
}) {
  const pred = result?.prediction ?? null;
  const score = pred?.rankingScore ?? null;
  const cls = pred?.classification ?? "INSUFFICIENT_DATA";
  const confLevel = pred?.confidenceLevel ?? "LOW";
  const exchange = result?.price.exchange;
  const companyName = result?.companyName;
  const sector = result?.sector;

  const priceDisplay = result?.price.current !== null && result?.price.current !== undefined
    ? `₹${result.price.current.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : null;
  const changeDisplay = result?.price.change !== null && result?.price.change !== undefined
    ? result.price.change
    : null;

  const qualityScore = pred?.factorScores.find(f => f.group === "quality")?.value ?? null;
  const growthScore = pred?.factorScores.find(f => f.group === "growth")?.value ?? null;
  const momentumScore = pred?.factorScores.find(f => f.group === "momentum")?.value ?? null;

  const conf = confidenceBadge(confLevel);
  const clsColor = scoreColor(score);

  return (
    <ProductPanel
      className="border border-white/[0.08] hover:border-white/[0.18] transition-all cursor-pointer"
      as="article"
    >
      <div
        className="p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap"
        onClick={isAuthenticated ? onNavigate : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && isAuthenticated) { e.preventDefault(); onNavigate(); } }}
        aria-label={`View research for ${symbol}`}
      >
        {/* Rank + Ring */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-6 text-right text-xs text-[#64748B] font-semibold tabular-nums">{rank}</div>
          {result === null ? (
            <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center">
              <RefreshCw className="h-3 w-3 text-[#94A3B8] animate-spin" />
            </div>
          ) : (
            isAuthenticated ? <MiniRing score={score} /> : (
              <div className="w-10 h-10 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-center">
                <Lock className="h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
            )
          )}
        </div>

        {/* Symbol + Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">{symbol}</span>
            {companyName && (
              <span className="text-xs text-[#64748B] truncate max-w-[180px]">{companyName}</span>
            )}
            {exchange && (
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[#94A3B8]">{exchange}</span>
            )}
            {sector && (
              <span className="text-[9px] text-[#64748B] uppercase tracking-wider hidden md:inline">{sector}</span>
            )}
          </div>
          {isAuthenticated && pred && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: clsColor, background: `${clsColor}15` }}
              >
                {classLabel(cls)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${conf.cls}`}>{conf.label}</span>
            </div>
          )}
        </div>

        {/* Price */}
        {isAuthenticated && priceDisplay && (
          <div className="text-right hidden sm:block shrink-0">
            <div className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{priceDisplay}</div>
            {changeDisplay !== null && (
              <div className={`text-[11px] tabular-nums font-semibold ${changeDisplay >= 0 ? "text-green-500" : "text-red-500"}`}>
                {changeDisplay >= 0 ? "+" : ""}{changeDisplay.toFixed(2)}%
              </div>
            )}
          </div>
        )}

        {/* Mini bars */}
        {isAuthenticated && pred && (
          <div className="flex items-end gap-3 hidden lg:flex shrink-0">
            <MiniBar label="Quality" score={qualityScore} />
            <MiniBar label="Growth" score={growthScore} />
            <MiniBar label="Momentum" score={momentumScore} />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNavigate(); }}
              className="px-2.5 py-1 text-[10px] font-semibold text-[#2962FF] hover:underline"
            >
              Research →
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#F59E0B] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded">
              <Lock className="h-3 w-3" /> Gated
            </span>
          )}
        </div>
      </div>

      {/* Price-null warning */}
      {result !== null && result.price.current === null && isAuthenticated && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-[10px] text-[#F59E0B]">
          <AlertCircle className="h-3 w-3" />
          <span>Price data unavailable — score based on fundamentals only</span>
        </div>
      )}
    </ProductPanel>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const INITIAL_BATCH = 10;
const BATCH_SIZE = 3;

export const PublicRankingsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [results, setResults] = useState<Record<string, PipelineResult | null>>({});
  const [loaded, setLoaded] = useState<number>(INITIAL_BATCH);
  const [searchText, setSearchText] = useState("");
  const loadingRef = useRef(false);

  // Load initial batch on mount
  useEffect(() => {
    const symbols = NIFTY50_SYMBOLS.slice(0, INITIAL_BATCH);
    loadBatch(symbols);
  }, []);

  const loadBatch = useCallback(async (symbols: string[]) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    // Process in sub-batches of 3, enqueuing via globalPipelineQueue to respect rate limits
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(sym =>
          globalPipelineQueue.enqueue(() => runCompanyDataPipeline(sym)).then(
            (r) => setResults(prev => ({ ...prev, [sym]: r })),
            () => setResults(prev => ({ ...prev, [sym]: null })),
          )
        ),
      );
    }
    loadingRef.current = false;
  }, []);

  // Infinite scroll: load more when scrolled near bottom
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loaded >= NIFTY50_SYMBOLS.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          const nextBatch = NIFTY50_SYMBOLS.slice(loaded, loaded + BATCH_SIZE * 3);
          if (nextBatch.length > 0) {
            setLoaded(prev => prev + nextBatch.length);
            loadBatch(nextBatch);
          }
        }
      },
      { threshold: 0.5 },
    );

    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loaded, loadBatch]);

  const displayedSymbols = useMemo(() => {
    const universe = isAuthenticated ? NIFTY50_SYMBOLS.slice(0, loaded) : NIFTY50_SYMBOLS.slice(0, 3);
    if (!searchText.trim()) return universe;
    const q = searchText.toLowerCase();
    return universe.filter(sym => {
      const r = results[sym];
      return (
        sym.toLowerCase().includes(q) ||
        r?.companyName?.toLowerCase().includes(q) ||
        r?.sector?.toLowerCase().includes(q)
      );
    });
  }, [isAuthenticated, loaded, results, searchText]);

  const allLoading = displayedSymbols.every(s => results[s] === undefined);

  return (
    <ProductShell>
      <ProductPage>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">Research Shortlist</h1>
              <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
                {isAuthenticated
                  ? `Nifty 50 universe · ${Object.keys(results).length} stocks scored in this session`
                  : "Institutional-grade multi-factor research applied to Indian equities."}
              </p>
            </div>
            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#F59E0B]" />
                <span className="text-xs text-[var(--color-text-secondary)]">Teaser — 3 stocks shown</span>
              </div>
            )}
          </div>

          {/* Controls */}
          {isAuthenticated && (
            <ProductPanel className="flex items-center gap-3 p-3 border border-white/[0.08]">
              <Search className="h-4 w-4 text-[#64748B] shrink-0 ml-1" />
              <Input
                className="flex-1 bg-transparent border-0 text-sm placeholder:text-[#94A3B8] focus:ring-0"
                placeholder="Search symbol, company, or sector…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                aria-label="Search stocks"
              />
            </ProductPanel>
          )}

          {/* How to use */}
          {isAuthenticated && (
            <details className="group rounded-lg border border-white/[0.08] bg-[rgba(255,255,255,0.015)]">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                <BookOpen className="h-3.5 w-3.5" />
                How to use this shortlist
                <ArrowRight className="ml-auto h-3 w-3 transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t border-white/[0.06] px-4 py-3 text-xs leading-relaxed text-[var(--color-text-secondary)] space-y-2">
                <p><strong className="text-[var(--color-text-primary)]">Research Score (0–100)</strong> — Multi-factor engine combining quality, valuation, growth, momentum, stability, and risk. Higher is stronger fundamentals.</p>
                <p><strong className="text-[var(--color-text-primary)]">Scores are live</strong> — Each session computes real-time scores from live providers. No cached or fabricated scores.</p>
                <p><strong className="text-[var(--color-text-primary)]">No buy/sell calls</strong> — StockStory does not issue trading recommendations. Use scores to prioritize your own research.</p>
              </div>
            </details>
          )}

          {/* Loading state */}
          {allLoading && (
            <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]" role="status" aria-live="polite">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#94A3B8]" />
              Computing research scores…
            </div>
          )}

          {/* Stock list */}
          <div className="space-y-2">
            {displayedSymbols.map((sym, idx) => (
              <StockRow
                key={sym}
                symbol={sym}
                rank={idx + 1}
                result={results[sym] ?? null}
                isAuthenticated={isAuthenticated}
                onNavigate={() => productNavigate("stock", sym)}
              />
            ))}

            {/* Infinite scroll sentinel */}
            {isAuthenticated && loaded < NIFTY50_SYMBOLS.length && (
              <div ref={sentinelRef} className="py-4 text-center text-xs text-[#94A3B8]">
                Loading more stocks…
              </div>
            )}
          </div>

          {/* Unauthenticated lock panel */}
          {!isAuthenticated && (
            <ProductPanel className="p-6 md:p-8 border border-[rgba(245,158,11,0.2)] bg-gradient-to-br from-[#0D1117] via-[#0F141F] to-[#0D1117] rounded-xl flex flex-col items-center text-center space-y-4 shadow-xl">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(245,158,11,0.1)]">
                <Lock className="h-6 w-6 text-[#F59E0B]" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">Unlock full research shortlist</h2>
                <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
                  Create a free account to unlock live-computed scores for 50+ Nifty stocks, multi-factor parameters, and direct broker handoffs.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row pt-2">
                <ProductAction onClick={() => productNavigate("signup")} className="font-semibold text-xs">
                  Create free account
                </ProductAction>
                <ProductAction variant="secondary" onClick={() => productNavigate("methodology")} className="font-semibold text-xs">
                  Read research standards
                </ProductAction>
              </div>
            </ProductPanel>
          )}

          {/* SEBI disclaimer */}
          <p className="text-[10px] text-[#94A3B8] leading-relaxed">
            Research scores are for educational purposes only and are not buy/sell recommendations. StockStory India is not a SEBI-registered investment adviser. All investments are subject to market risk.
          </p>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default PublicRankingsPage;
