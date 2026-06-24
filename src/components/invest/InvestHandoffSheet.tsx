import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  BarChart3,
  BookOpen,
  ExternalLink,
  Shield,
  Info,
  Loader2,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import { ProductPanel, productNavigate } from "../product/ProductUI";
import { api } from "../../services/api/client";
import type { InvestContextResponse } from "../../services/api/client";
import type { UnifiedPredictionOutput } from "../../prediction-engine/types";

import ResearchContextLink from "../research/ResearchContextLink";
import { PortfolioEngine } from "../../services/portfolio/PortfolioEngine";

interface InvestHandoffSheetProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  companyName?: string;
  thesisSummary?: string;
  marketPrice?: number | null;
  prediction?: UnifiedPredictionOutput | null;
}

type BrokerChoice = { id: string; name: string; short: string; url: string; color: string; soft: string };
type HandoffDraft = { broker: BrokerChoice; quantity: number; price: number | null };

const BROKERS: BrokerChoice[] = [
  { id: "zerodha", name: "Zerodha Kite", short: "Z", url: "https://kite.zerodha.com/", color: "#387ED1", soft: "#EDF5FC" },
  { id: "groww", name: "Groww", short: "G", url: "https://groww.in/stocks", color: "#00A67E", soft: "#E9FAF5" },
  { id: "angel", name: "Angel One", short: "A", url: "https://trade.angelone.in/", color: "#5B36D9", soft: "#F1EEFF" },
  { id: "upstox", name: "Upstox", short: "U", url: "https://login.upstox.com/", color: "#6C2BD9", soft: "#F4EDFF" },
  { id: "dhan", name: "Dhan", short: "ध", url: "https://web.dhan.co/", color: "#16A34A", soft: "#EAF8EF" },
  { id: "icici", name: "ICICI Direct", short: "i", url: "https://secure.icicidirect.com/", color: "#B02A30", soft: "#FFF1E8" },
  { id: "kotak", name: "Kotak Neo", short: "K", url: "https://neo.kotaksecurities.com/", color: "#E31837", soft: "#FFF0F2" },
  { id: "other", name: "Other broker", short: "+", url: "", color: "#475569", soft: "#F1F5F9" },
];

function BrokerBrandMark({ broker }: { broker: BrokerChoice }): JSX.Element {
  return (
    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[13px] font-sans text-sm font-extrabold shadow-[inset_0_0_0_1px_rgba(255,255,255,.8),0_5px_14px_rgba(15,23,42,.08)]" style={{ color: broker.color, backgroundColor: broker.soft }} aria-hidden="true">
      {broker.id === "groww" && <span className="absolute inset-x-0 bottom-0 h-2 bg-[#5367FF]/25" />}
      {broker.id === "icici" && <span className="absolute -left-1 top-1 h-7 w-3 rotate-[24deg] rounded-full bg-[#F58220]/85" />}
      {broker.id === "kotak" && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-current opacity-35" />}
      <span className="relative">{broker.short}</span>
    </span>
  );
}

type Stage = 1 | 2 | 3;

const STAGE_1_CHECKLIST = [
  "Verify the current price and available liquidity before making any external decision.",
  "Confirm position size aligns with your portfolio allocation strategy.",
  "Review any recent company announcements or earnings reports.",
  "Confirm account details directly in your external brokerage platform.",
];

export function InvestHandoffSheet({
  open,
  onClose,
  symbol,
  companyName,
  thesisSummary: propThesis,
  marketPrice = null,
  prediction = null,
}: InvestHandoffSheetProps) {
  const [stage, setStage] = useState<Stage>(1);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [context, setContext] = useState<InvestContextResponse["data"] | null>(null);
  const [handoff, setHandoff] = useState<HandoffDraft | null>(null);

  const loadContext = useCallback(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 2_000);
    setLoadingContext(true);
    setContextError(null);

    const cachedSnapshot = (() => {
      try {
        const raw = sessionStorage.getItem(`stock_snapshot_${symbol}`);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })();

    if (cachedSnapshot) {
      setContext(cachedSnapshot);
      setLoadingContext(false);
    }

    api.getInvestContext(symbol, { signal: controller.signal })
      .then((res) => {
        if (!disposed) {
          setContext(res.data);
          try { sessionStorage.setItem(`stock_snapshot_${symbol}`, JSON.stringify(res.data)); } catch {}
        }
      })
      .catch(() => {
        if (!disposed && !cachedSnapshot) {
          setContextError("Research context loading took too long. Compare or track instead.");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!disposed) setLoadingContext(false);
      });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [symbol]);

  useEffect(() => {
    if (!open) return;
    setStage(1);
    setContext(null);
    setHandoff(null);
    setContextError(null);
    return loadContext();
  }, [open, loadContext]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const displayName = companyName || context?.companyName || symbol.toUpperCase();
  const thesis = context?.thesis || propThesis || null;
  const risks = context?.keyRisks?.length ? context.keyRisks : null;
  const conviction = context?.conviction || null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-[#05070C]/80 backdrop-blur-md" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invest-review-title"
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[var(--border-subtle)] bg-[var(--color-surface)] shadow-2xl transition-all duration-300
                   h-[calc(100dvh-env(safe-area-inset-top)-12px)] max-h-[calc(100dvh-env(safe-area-inset-top)-12px)]
                   sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:w-[560px] sm:rounded-2xl sm:border-b
                   lg:max-h-[min(760px,calc(100dvh-64px))] lg:w-[600px]"
      >
        <div className="flex-none flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--color-surface)] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-accent-light)]">
              <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            </div>
            <h2 id="invest-review-title" className="text-xs font-semibold text-[var(--color-text-primary)]">Invest review</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-surface)]">
          {loadingContext ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-12 text-xs text-[var(--color-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />
              Loading research context...
            </div>
          ) : (
            <>
              {contextError && (
                <div role="alert" className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 text-[11px] leading-5 text-amber-900">
                  <span>{contextError}</span>
                  <button type="button" onClick={() => { loadContext(); }} className="shrink-0 rounded-md border border-amber-300 px-2.5 py-1 font-semibold">Retry</button>
                </div>
              )}
              {stage === 1 && (
                <StageOne
                  symbol={symbol}
                  displayName={displayName}
                  thesisSummary={thesis}
                  conviction={conviction}
                  risks={risks}
                  strengths={context?.keyStrengths ?? []}
                  watchItems={context?.whatToWatch ?? []}
                  prediction={prediction}
                  onContinue={() => setStage(2)}
                  onTrack={() => { onClose(); productNavigate("track"); }}
                  onCompare={() => { onClose(); productNavigate("compare", symbol); }}
                  onBack={onClose}
                />
              )}
              {stage === 2 && (
                <StageTwo
                  symbol={symbol}
                  displayName={displayName}
                  marketPrice={marketPrice}
                  onBack={() => setStage(1)}
                  onContinue={(draft) => { setHandoff(draft); setStage(3); }}
                />
              )}
              {stage === 3 && handoff && (
                <StageThree
                  symbol={symbol}
                  displayName={displayName}
                  handoff={handoff}
                  onBack={() => setStage(2)}
                  onClose={onClose}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StageOne({
  symbol,
  displayName,
  thesisSummary,
  conviction,
  risks,
  strengths,
  watchItems,
  prediction,
  onContinue,
  onTrack,
  onCompare,
  onBack,
}: {
  symbol: string;
  displayName: string;
  thesisSummary: string | null;
  conviction: string | null;
  risks: string[] | null;
  strengths: string[];
  watchItems: string[];
  prediction: UnifiedPredictionOutput | null;
  onContinue: () => void;
  onTrack: () => void;
  onCompare: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <ProductPanel className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <BookOpen className="h-3 w-3" />
              Thesis review
            </div>
            <ResearchContextLink label="How scores work" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">
            {displayName}
            <span className="ml-1.5 text-[var(--color-text-muted)]">({symbol.toUpperCase()})</span>
          </h3>
          {conviction && (
            <span className="mt-1 inline-block rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              {conviction}
            </span>
          )}
          {prediction && (
            <div style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: 10, padding: '16px 20px', marginTop: 12
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Research summary
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32, fontWeight: 600,
                  color: (prediction.rankingScore ?? 0) >= 75 ? '#057A55' :
                         (prediction.rankingScore ?? 0) >= 55 ? '#1A56DB' :
                         (prediction.rankingScore ?? 0) >= 35 ? '#D97706' : '#C81E1E' }}>
                  {prediction.rankingScore ?? '—'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {prediction.classification?.replace('_', ' ') ?? 'Unknown'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {prediction.confidenceLevel ?? '—'} confidence ·{' '}
                    {Math.round((prediction.dataCompleteness ?? 0))}% data available
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8 }}>
                {(prediction.factorScores ?? [])
                  .filter((f: any) => f.group !== 'sector' && f.group !== 'dataQuality')
                  .map((f: any) => (
                    <div key={f.group} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF',
                        textTransform: 'capitalize', marginBottom: 2 }}>
                        {f.group}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600,
                        color: (f.value ?? 0) >= 65 ? '#057A55' :
                               (f.value ?? 0) >= 45 ? '#D97706' : '#C81E1E' }}>
                        {f.value ?? '—'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {!prediction && (
            <div style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: 10, padding: '16px 20px', marginTop: 12
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Research summary
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                Research data not yet available for this stock.
              </div>
            </div>
          )}
          {thesisSummary && (
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{thesisSummary}</p>
          )}
        </ProductPanel>

        {strengths.length > 0 && (
          <ProductPanel className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-active)]">
              <CheckCircle2 className="h-3 w-3" />
              Key strengths
            </div>
            <ul className="mt-3 space-y-2">
              {strengths.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[var(--color-text-secondary)]">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-active)]/60" />
                  {item}
                </li>
              ))}
            </ul>
          </ProductPanel>
        )}

        {risks && risks.length > 0 && (
          <ProductPanel className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-warning)]">
              <AlertTriangle className="h-3 w-3" />
              Key risks
            </div>
            <ul className="mt-3 space-y-2">
              {risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[var(--color-text-secondary)]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-warning)]/60" />
                  {risk}
                </li>
              ))}
            </ul>
          </ProductPanel>
        )}

        {watchItems.length > 0 && (
          <ProductPanel className="p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              <Info className="h-3 w-3" />
              What to watch
            </div>
            <ul className="mt-3 space-y-2">
              {watchItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[var(--color-text-secondary)]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]/60" />
                  {item}
                </li>
              ))}
            </ul>
          </ProductPanel>
        )}

        <ProductPanel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-active)]">
            <CheckCircle2 className="h-3 w-3" />
            Investment checklist
          </div>
          <ul className="mt-3 space-y-2">
            {STAGE_1_CHECKLIST.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[var(--color-text-secondary)]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-active)]/60" />
                {item}
              </li>
            ))}
          </ul>
        </ProductPanel>

        <ProductPanel className="border-[var(--color-accent-border)] bg-[var(--color-accent-light)] p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <div>
              <p className="text-sm leading-5 text-[var(--color-text-primary)]">
                Final order placement happens with your broker.
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">
                No broker credentials are stored in StockStory. No order has been placed.
              </p>
            </div>
          </div>
        </ProductPanel>
      </div>

      <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--color-surface-raised)] px-5 py-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Continue review
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onTrack}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Track instead
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Compare first
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function StageTwo({
  symbol,
  displayName,
  marketPrice,
  onBack,
  onContinue,
}: {
  symbol: string;
  displayName: string;
  marketPrice: number | null;
  onBack: () => void;
  onContinue: (draft: HandoffDraft) => void;
}) {
  const [selectedId, setSelectedId] = useState("zerodha");
  const [quantity, setQuantity] = useState("1");
  const [otherName, setOtherName] = useState("");
  const parsedQuantity = Number(quantity);
  const validQuantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0;
  const selected = BROKERS.find((broker) => broker.id === selectedId) ?? BROKERS[0];
  const effectiveBroker = selected.id === "other" ? { ...selected, name: otherName.trim() || "Other broker" } : selected;
  const canContinue = validQuantity && (selected.id !== "other" || otherName.trim().length > 1);
  const estimate = marketPrice && validQuantity ? marketPrice * parsedQuantity : null;

  const continueToBroker = () => {
    if (!canContinue) return;
    if (effectiveBroker.url) window.open(effectiveBroker.url, "_blank", "noopener,noreferrer");
    onContinue({ broker: effectiveBroker, quantity: parsedQuantity, price: marketPrice });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3"><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[var(--color-accent)]">Broker handoff</div><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><ArrowLeft className="h-3 w-3" /> Review</button></div>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">Choose where to continue</h3>
          <p className="mt-2 text-sm leading-5 text-[var(--color-text-secondary)]">We will open the official broker portal. Sign in and approve the order there.</p>
        </div>

        <ProductPanel className="overflow-hidden p-0">
          <div className="border-b border-[var(--color-border)] p-4">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-accent-light)] text-[var(--color-accent)]"><ShoppingBag className="h-4 w-4" /></span><div><div className="text-sm font-semibold text-[var(--color-text-primary)]">{displayName}</div><div className="font-mono text-[11px] text-[var(--color-text-muted)]">{symbol.toUpperCase()} · NSE equity</div></div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {BROKERS.map((broker) => <button key={broker.id} type="button" onClick={() => setSelectedId(broker.id)} style={selectedId === broker.id ? { borderColor: broker.color, boxShadow: `0 10px 24px ${broker.color}20` } : undefined} className={`flex min-h-[82px] flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center text-[11px] font-semibold transition duration-200 hover:-translate-y-0.5 ${selectedId === broker.id ? "bg-white text-[var(--color-text-primary)]" : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}><BrokerBrandMark broker={broker} /><span className="mt-2">{broker.name}</span></button>)}
          </div>
        </ProductPanel>

        {selectedId === "other" && <input aria-label="Broker name" value={otherName} onChange={(event) => setOtherName(event.target.value)} placeholder="Type your broker's name" className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]" />}

        <ProductPanel className="p-4">
          <label className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--color-text-muted)]" htmlFor="broker-quantity">Quantity</label>
          <div className="mt-2 flex items-center gap-3"><button type="button" onClick={() => setQuantity(String(Math.max(1, (validQuantity ? parsedQuantity : 1) - 1)))} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--color-border)] text-lg text-[var(--color-text-primary)]">−</button><input id="broker-quantity" inputMode="numeric" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center font-mono text-base font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" /><button type="button" onClick={() => setQuantity(String((validQuantity ? parsedQuantity : 0) + 1))} className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--color-border)] text-lg text-[var(--color-text-primary)]">+</button></div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--color-surface-raised)] px-3 py-2.5 text-xs"><span className="text-[var(--color-text-muted)]">Estimated value</span><span className="font-mono font-semibold text-[var(--color-text-primary)]">{estimate ? `₹${estimate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Confirmed by broker"}</span></div>
          {!validQuantity && <p className="mt-2 text-xs text-red-500">Enter a whole-number quantity of at least 1.</p>}
        </ProductPanel>

        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p className="text-xs leading-5 text-emerald-900"><strong>Secure handoff:</strong> StockStory records this intent, but never asks for or stores your broker password, PIN or OTP.</p></div>
      </div>

      <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--color-surface-raised)] px-5 py-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={continueToBroker}
          disabled={!canContinue}
          className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {effectiveBroker.url ? `Open ${effectiveBroker.name}` : "I opened my broker"}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StageThree({
  symbol,
  displayName,
  handoff,
  onBack,
  onClose,
}: {
  symbol: string;
  displayName: string;
  handoff: HandoffDraft;
  onBack: () => void;
  onClose: () => void;
}) {
  const [fillPrice, setFillPrice] = useState(handoff.price ? String(handoff.price) : "");
  const [saved, setSaved] = useState(false);
  const validPrice = Number.isFinite(Number(fillPrice)) && Number(fillPrice) > 0;
  const recordPurchase = () => {
    if (!validPrice) return;
    const ok = PortfolioEngine.addHolding({ symbol, shares: handoff.quantity, avgBuyPrice: Number(fillPrice), sector: "Sector unavailable" });
    if (ok) setSaved(true);
  };
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <ProductPanel className="p-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <FileText className="h-3 w-3" />
            Handoff summary
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Instrument</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {displayName}
                <span className="ml-1 text-[var(--color-text-muted)]">
                  ({symbol.toUpperCase()})
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Broker</span>
              <span className="font-medium text-[var(--color-text-primary)]">{handoff.broker.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Quantity</span>
              <span className="font-mono font-semibold text-[var(--color-text-primary)]">{handoff.quantity}</span>
            </div>
          </div>
        </ProductPanel>

        {!saved ? <ProductPanel className="p-4">
          <div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-[var(--color-accent)]" /><h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Did the purchase complete?</h3></div>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">Only record a position after your broker shows a successful or filled order.</p>
          <label htmlFor="fill-price" className="mt-4 block text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--color-text-muted)]">Average fill price</label>
          <div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">₹</span><input id="fill-price" type="number" min="0.01" step="0.01" value={fillPrice} onChange={(event) => setFillPrice(event.target.value)} placeholder="Price shown by broker" className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-3 font-mono text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" /></div>
          <button type="button" disabled={!validPrice} onClick={recordPurchase} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"><ShoppingBag className="h-4 w-4" />Confirm filled &amp; add to portfolio</button>
        </ProductPanel> : <ProductPanel className="border border-emerald-200 bg-emerald-50/70 p-5 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" /><h3 className="mt-3 text-base font-semibold text-emerald-950">Position recorded</h3><p className="mt-1 text-xs leading-5 text-emerald-800">{handoff.quantity} {symbol.toUpperCase()} added to your StockStory portfolio for thesis tracking.</p></ProductPanel>}

        <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" /><p className="text-xs leading-5 text-[var(--color-text-secondary)]">StockStory cannot verify the broker fill automatically until that broker is connected with read-only portfolio permission.</p></div>
      </div>

      <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--color-surface-raised)] px-5 py-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => { if (saved) { onClose(); productNavigate("portfolio"); } else onClose(); }}
          className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {saved ? "View portfolio" : "Done without recording"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-4 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to handoff review
        </button>
      </div>
    </div>
  );
}
