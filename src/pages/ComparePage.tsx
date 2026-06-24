import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ArrowUpRight, GitCompare, Sparkles, Shield, TrendingUp, TrendingDown, Check, X, ChevronRight, AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { PremiumAppShell, PremiumTopNav, MarketTickerStrip, PremiumCard, ScoreRing, ScorePill, FactorChip, FactorBar, MiniSparkline, FactorBreakdownBars, ProductPageHeader, EmptyProductState, InvestmentReviewSheet, BrokerHandoffSheet, MobileProductNav } from "../premium/PremiumComponents";
import { productNavigate } from "../components/product/ProductUI";
import { runCompanyDataPipeline, type PipelineResult } from "../services/data/CompanyDataPipeline";
import { fPrice } from "../lib/format";
import { addTrackedCompany, isTracked, removeTrackedCompany } from "../lib/track/trackStore";
import { SebiDisclaimer } from "../components/compliance/SebiDisclaimer";

const S = {
  bg: "var(--ss-bg)",
  surface: "var(--ss-surface)",
  ink: "var(--ss-ink)",
  ink2: "var(--ss-ink-2)",
  ink3: "var(--ss-ink-3)",
  ink4: "var(--ss-ink-4)",
  border: "var(--ss-border)",
  borderSoft: "var(--ss-border-soft)",
  positive: "var(--ss-positive)",
  negative: "var(--ss-negative)",
  caution: "var(--ss-caution)",
  action: "var(--ss-action)",
  radiusXs: "var(--ss-radius-xs)",
  radiusSm: "var(--ss-radius-sm)",
  radiusMd: "var(--ss-radius-md)",
  radiusLg: "var(--ss-radius-lg)",
  container: "var(--ss-container)",
};

const FACTOR_GROUPS: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: "quality", label: "Quality", icon: <Shield size={14} /> },
  { key: "growth", label: "Growth", icon: <TrendingUp size={14} /> },
  { key: "valuation", label: "Valuation", icon: <BarChart3 size={14} /> },
  { key: "risk", label: "Risk", icon: <AlertTriangle size={14} /> },
  { key: "momentum", label: "Momentum", icon: <TrendingDown size={14} /> },
];

function getFactorScore(r: PipelineResult | null, group: string): number | null {
  const fs = r?.prediction?.factorScores?.find(f => f.group === group);
  if (fs?.value === null || fs?.value === undefined) return null;
  return group === "risk" ? Math.round(100 - fs.value) : Math.round(fs.value);
}

function scoreColor(v: number | null): string {
  if (v === null) return S.ink4;
  if (v >= 75) return S.positive;
  if (v >= 55) return S.ink;
  if (v >= 35) return S.caution;
  return S.negative;
}

function useMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

export default function ComparePage() {
  const mobile = useMobile();
  const [leftSym, setLeftSym] = useState("");
  const [rightSym, setRightSym] = useState("");
  const [leftResult, setLeftResult] = useState<PipelineResult | null>(null);
  const [rightResult, setRightResult] = useState<PipelineResult | null>(null);
  const [leftLoading, setLeftLoading] = useState(false);
  const [rightLoading, setRightLoading] = useState(false);
  const [leftError, setLeftError] = useState("");
  const [rightError, setRightError] = useState("");
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [investSym, setInvestSym] = useState("");
  const [investName, setInvestName] = useState("");
  const [showInvest, setShowInvest] = useState(false);
  const [showBroker, setShowBroker] = useState(false);

  const loadCompany = useCallback(async (symbol: string, side: "left" | "right") => {
    const setLoad = side === "left" ? setLeftLoading : setRightLoading;
    const setResult = side === "left" ? setLeftResult : setRightResult;
    const setError = side === "left" ? setLeftError : setRightError;
    setLoad(true);
    setError("");
    try {
      const r = await runCompanyDataPipeline(symbol);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
      setResult(null);
    } finally {
      setLoad(false);
    }
  }, []);

  const handleLeftSubmit = useCallback(() => {
    const sym = leftInput.trim().toUpperCase();
    if (!sym) return;
    setLeftSym(sym);
    setLeftInput("");
    loadCompany(sym, "left");
  }, [leftInput, loadCompany]);

  const handleRightSubmit = useCallback(() => {
    const sym = rightInput.trim().toUpperCase();
    if (!sym) return;
    setRightSym(sym);
    setRightInput("");
    loadCompany(sym, "right");
  }, [rightInput, loadCompany]);

  const removeLeft = useCallback(() => {
    setLeftSym("");
    setLeftResult(null);
    setLeftError("");
  }, []);

  const removeRight = useCallback(() => {
    setRightSym("");
    setRightResult(null);
    setRightError("");
  }, []);

  const isLeftTracked = leftSym ? isTracked(leftSym) : false;
  const isRightTracked = rightSym ? isTracked(rightSym) : false;

  const handleTrack = useCallback((sym: string, name: string | null) => {
    if (isTracked(sym)) { removeTrackedCompany(sym); return; }
    addTrackedCompany({ symbol: sym, companyName: name ?? sym, addedAt: new Date().toISOString(), source: "compare" });
  }, []);

  const handleInvest = useCallback((sym: string, name: string | null) => {
    setInvestSym(sym);
    setInvestName(name ?? sym);
    setShowInvest(true);
  }, []);

  const bothLoaded = leftResult && rightResult;

  const summaryText = useMemo(() => {
    if (!bothLoaded) return null;
    const winners: string[] = [];
    const factorMap: Record<string, string> = {
      quality: "quality", growth: "growth", valuation: "valuation", risk: "risk", momentum: "momentum",
    };
    const labels: Record<string, string> = {
      quality: "quality", growth: "growth", valuation: "valuation", risk: "risk", momentum: "momentum",
    };
    for (const g of ["quality", "growth", "valuation", "risk", "momentum"]) {
      const l = getFactorScore(leftResult, g);
      const r = getFactorScore(rightResult, g);
      if (l === null || r === null || l === r) continue;
      const winner = l > r ? leftResult.companyName ?? leftSym : rightResult.companyName ?? rightSym;
      winners.push(`${winner} scores higher on ${g}`);
    }
    if (!winners.length) return `${leftResult.companyName ?? leftSym} and ${rightResult.companyName ?? rightSym} have broadly similar profiles.`;
    return winners.join(". ") + ".";
  }, [bothLoaded, leftResult, rightResult, leftSym, rightSym]);

  function CompanyCard({ result, symbol, loading, error, onRemove, side }: {
    result: PipelineResult | null; symbol: string; loading: boolean; error: string; onRemove: () => void; side: "left" | "right";
  }) {
    const tracked = symbol ? isTracked(symbol) : false;
    if (loading) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: S.ink4, fontSize: 13, gap: 8 }}>
          <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading {symbol}...
        </div>
      );
    }
    if (error) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 12 }}>
          <AlertTriangle size={24} color={S.caution} />
          <span style={{ fontSize: 13, color: S.caution }}>{error}</span>
          <button onClick={() => loadCompany(symbol, side)} style={{ fontSize: 12, color: S.action, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
        </div>
      );
    }
    if (!result) return null;
    const score = result.prediction?.rankingScore ?? null;
    return (
      <PremiumCard padding="20px" style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreRing score={score} size={52} showLabel />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: S.ink, letterSpacing: "-0.3px" }}>{result.companyName ?? symbol}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: S.ink2 }}>{symbol}</span>
                {result.sector && <span style={{ fontSize: 11, color: S.ink3 }}>{result.sector}</span>}
              </div>
            </div>
          </div>
          <button onClick={onRemove} style={{ border: "none", background: "none", cursor: "pointer", color: S.ink4, padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {result.prediction?.keyStrengths?.slice(0, 2).map((s, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: S.radiusXs, background: "var(--ss-positive-soft)", color: S.positive, fontWeight: 600 }}>{s}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => handleInvest(symbol, result.companyName)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, color: "white", border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer" }}>
            Invest
          </button>
          <button onClick={() => handleTrack(symbol, result.companyName)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 600, color: S.ink2, border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer" }}>
            {tracked ? "Tracked" : "Track"}
          </button>
          <button onClick={() => productNavigate("stock", symbol)} style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: S.ink2, border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            Research <ArrowUpRight size={14} />
          </button>
        </div>
      </PremiumCard>
    );
  }

  function FactorRow({ label, leftScore, rightScore }: { label: string; leftScore: number | null; rightScore: number | null }) {
    const winner = leftScore !== null && rightScore !== null && leftScore !== rightScore
      ? (leftScore > rightScore ? "left" : "right")
      : null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${S.borderSoft}` }}>
        <div style={{ width: mobile ? 60 : 80, fontSize: 12, fontWeight: 600, color: S.ink, flexShrink: 0 }}>{label}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <FactorBar label="" score={leftScore} />
          </div>
          {winner === "left" && <Check size={14} color={S.positive} style={{ flexShrink: 0 }} />}
          {!winner && <span style={{ width: 14, flexShrink: 0 }} />}
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <FactorBar label="" score={rightScore} />
          </div>
          {winner === "right" && <Check size={14} color={S.positive} style={{ flexShrink: 0 }} />}
          {!winner && <span style={{ width: 14, flexShrink: 0 }} />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PremiumTopNav activePage="compare" />
      <div style={{ paddingTop: 16, paddingBottom: 40 }}>
        <MarketTickerStrip />
        <div style={{ maxWidth: S.container, margin: "0 auto", padding: mobile ? "0 16px" : "0 52px", paddingTop: 28 }}>
          <ProductPageHeader
            title="Compare companies"
            description="See which business deserves deeper research."
            badge="Research tool"
            actions={
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { removeLeft(); removeRight(); }} style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: S.ink3, border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={14} /> Reset
                </button>
              </div>
            }
          />

          {/* Company selectors */}
          <div style={{ display: "flex", gap: mobile ? 12 : 24, marginBottom: 24 }}>
            {/* Left slot */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!leftSym ? (
                <div style={{ background: S.surface, borderRadius: S.radiusMd, border: `1px solid ${S.borderSoft}`, padding: "0 14px", height: 48, display: "flex", alignItems: "center", gap: 10 }}>
                  <Search size={14} color={S.ink4} />
                  <input
                    type="text"
                    value={leftInput}
                    onChange={e => setLeftInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleLeftSubmit()}
                    placeholder="Search symbol (e.g. TCS)"
                    style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 13, color: S.ink, fontFamily: "Inter, sans-serif" }}
                  />
                  {leftInput && (
                    <button onClick={handleLeftSubmit} style={{ border: "none", background: "none", cursor: "pointer", color: S.action, padding: 4 }}>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <CompanyCard result={leftResult} symbol={leftSym} loading={leftLoading} error={leftError} onRemove={removeLeft} side="left" />
              )}
            </div>

            {/* Right slot */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!rightSym ? (
                <div style={{ background: S.surface, borderRadius: S.radiusMd, border: `1px solid ${S.borderSoft}`, padding: "0 14px", height: 48, display: "flex", alignItems: "center", gap: 10 }}>
                  <Search size={14} color={S.ink4} />
                  <input
                    type="text"
                    value={rightInput}
                    onChange={e => setRightInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === "Enter" && handleRightSubmit()}
                    placeholder="Search symbol (e.g. RELIANCE)"
                    style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: 13, color: S.ink, fontFamily: "Inter, sans-serif" }}
                  />
                  {rightInput && (
                    <button onClick={handleRightSubmit} style={{ border: "none", background: "none", cursor: "pointer", color: S.action, padding: 4 }}>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <CompanyCard result={rightResult} symbol={rightSym} loading={rightLoading} error={rightError} onRemove={removeRight} side="right" />
              )}
            </div>
          </div>

          {/* Empty state */}
          {!bothLoaded && (
            <EmptyProductState
              icon={<GitCompare size={32} />}
              title="Select two companies to compare"
              body="Choose two companies above to compare their thesis, valuation, quality, and risk side by side."
            />
          )}

          {/* Loaded state — decision page */}
          {bothLoaded && (
            <>
              {/* Decision summary card */}
              <PremiumCard style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Sparkles size={16} color={S.caution} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, letterSpacing: "-0.2px" }}>Comparison summary</span>
                </div>
                <p style={{ fontSize: 13, color: S.ink2, lineHeight: 1.6, margin: 0 }}>{summaryText}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {FACTOR_GROUPS.map(g => {
                    const l = getFactorScore(leftResult, g.key);
                    const r = getFactorScore(rightResult, g.key);
                    if (l === null && r === null) return null;
                    const winner = l !== null && r !== null && l !== r
                      ? (l > r ? (leftResult.companyName ?? leftSym) : (rightResult.companyName ?? rightSym))
                      : null;
                    return (
                      <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: S.radiusXs, background: "var(--ss-bg-soft)", fontSize: 11, fontWeight: 500, color: S.ink2 }}>
                        {g.icon}
                        <span>{g.label}</span>
                        {winner && <span style={{ color: S.positive, fontWeight: 600, marginLeft: 2 }}>→ {winner}</span>}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>

              {/* Factor matrix */}
              <PremiumCard style={{ marginBottom: 24 }} padding="20px">
                <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, display: "block", marginBottom: 16, letterSpacing: "-0.2px" }}>Factor comparison</span>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8, borderBottom: `1px solid ${S.border}` }}>
                  <div style={{ width: mobile ? 60 : 80, fontSize: 10, fontWeight: 600, color: S.ink4, textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>Factor</div>
                  <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: S.ink }}>{leftResult.companyName ?? leftSym}</div>
                  <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: S.ink }}>{rightResult.companyName ?? rightSym}</div>
                </div>
                {FACTOR_GROUPS.map(g => (
                  <FactorRow key={g.key} label={g.label} leftScore={getFactorScore(leftResult, g.key)} rightScore={getFactorScore(rightResult, g.key)} />
                ))}
              </PremiumCard>

              {/* Thesis comparison */}
              <div style={{ display: "flex", gap: mobile ? 12 : 24, marginBottom: 24 }}>
                {[leftResult, rightResult].map((r, i) => (
                  <PremiumCard key={i} style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, display: "block", marginBottom: 12, letterSpacing: "-0.2px" }}>
                      Thesis — {r.companyName ?? (i === 0 ? leftSym : rightSym)}
                    </span>
                    <p style={{ fontSize: 12, color: S.ink2, lineHeight: 1.7, margin: 0 }}>
                      {r.prediction?.explanation || "Analysis in progress."}
                    </p>
                  </PremiumCard>
                ))}
              </div>

              {/* Risk comparison */}
              <PremiumCard style={{ marginBottom: 24 }} padding="20px">
                <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, display: "block", marginBottom: 16, letterSpacing: "-0.2px" }}>
                  <Shield size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />Risk comparison
                </span>
                <div style={{ display: "flex", gap: mobile ? 12 : 24 }}>
                  {[leftResult, rightResult].map((r, i) => {
                    const risks = r.prediction?.keyRisks ?? [];
                    return (
                      <div key={i} style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: S.ink3, display: "block", marginBottom: 8 }}>
                          {r.companyName ?? (i === 0 ? leftSym : rightSym)}
                        </span>
                        {risks.length > 0 ? risks.slice(0, 4).map((risk, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: j < risks.slice(0, 4).length - 1 ? `1px solid ${S.borderSoft}` : "none" }}>
                            <span style={{ fontSize: 8, color: S.negative, marginTop: 3 }}>●</span>
                            <span style={{ fontSize: 12, color: S.ink2, lineHeight: 1.4 }}>{risk}</span>
                          </div>
                        )) : (
                          <span style={{ fontSize: 12, color: S.ink4 }}>No risk factors identified</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PremiumCard>

              {/* Decision helper */}
              <PremiumCard padding="20px">
                <span style={{ fontSize: 14, fontWeight: 700, color: S.ink, display: "block", marginBottom: 12, letterSpacing: "-0.2px" }}>Next steps</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => productNavigate("stock", leftSym)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: S.ink2, border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowUpRight size={14} /> Research {leftResult.companyName ?? leftSym}
                  </button>
                  <button onClick={() => productNavigate("stock", rightSym)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: S.ink2, border: `1px solid ${S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowUpRight size={14} /> Research {rightResult.companyName ?? rightSym}
                  </button>
                  {[leftSym, rightSym].map((sym, i) => {
                    const tracked = isTracked(sym);
                    return (
                      <button key={sym} onClick={() => handleTrack(sym, i === 0 ? leftResult.companyName : rightResult.companyName)} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: tracked ? S.positive : S.ink2, border: `1px solid ${tracked ? "var(--ss-positive)" : S.border}`, borderRadius: S.radiusSm, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        {tracked ? <Check size={14} /> : <Sparkles size={14} />} {tracked ? "Tracked" : "Track"} {sym}
                      </button>
                    );
                  })}
                  <button onClick={() => { setInvestSym(leftSym); setInvestName(leftResult.companyName ?? leftSym); setShowInvest(true); }} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "white", border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer" }}>
                    Invest in {leftResult.companyName ?? leftSym}
                  </button>
                  <button onClick={() => { setInvestSym(rightSym); setInvestName(rightResult.companyName ?? rightSym); setShowInvest(true); }} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "white", border: "none", borderRadius: S.radiusSm, background: S.action, cursor: "pointer" }}>
                    Invest in {rightResult.companyName ?? rightSym}
                  </button>
                </div>
              </PremiumCard>

              <div style={{ marginTop: 32 }}>
                <SebiDisclaimer variant="footer" />
              </div>
            </>
          )}

          <InvestmentReviewSheet open={showInvest} onClose={() => setShowInvest(false)} symbol={investSym} companyName={investName} />
          <BrokerHandoffSheet open={showBroker} onClose={() => setShowBroker(false)} symbol={investSym} />
        </div>
      </div>
      <MobileProductNav activePage="compare" />
    </div>
  );
}
