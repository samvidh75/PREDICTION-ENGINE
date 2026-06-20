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
} from "lucide-react";
import { ProductPanel, productNavigate } from "../product/ProductUI";
import { api } from "../../services/api/client";
import type { InvestContextResponse } from "../../services/api/client";
import ThesisHealthMeter from "../research/ThesisHealthMeter";
import { computeResearchSignal, type ResearchSignalView } from "../../lib/research/researchSignalModel";
import ResearchContextLink from "../research/ResearchContextLink";

interface InvestHandoffSheetProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  companyName?: string;
  thesisSummary?: string;
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
}: InvestHandoffSheetProps) {
  const [stage, setStage] = useState<Stage>(1);
  const [loadingContext, setLoadingContext] = useState(false);
  const [context, setContext] = useState<InvestContextResponse["data"] | null>(null);

  useEffect(() => {
    if (open) {
      setStage(1);
      setLoadingContext(true);
      setContext(null);
      api.getInvestContext(symbol)
        .then((res) => setContext(res.data))
        .catch(() => {})
        .finally(() => setLoadingContext(false));
    }
  }, [open, symbol]);

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

  if (!open) return null;

  const hasRealContext = context !== null;
  const displayName = companyName || context?.companyName || symbol.toUpperCase();
  const thesis = context?.thesis || propThesis || null;
  const risks = context?.keyRisks?.length ? context.keyRisks : null;
  const conviction = context?.conviction || null;

  const investSignal = useMemo(() => {
    if (!context) return null;
    const factorScores = {
      symbol,
      qualityScore: null,
      growthScore: null,
      stabilityScore: null,
      momentumScore: null,
      valuationScore: null,
      riskScore: null,
      convictionScore: context.score ?? null,
      qualityExplanation: null,
      valuationExplanation: null,
      growthExplanation: null,
      riskExplanation: null,
      momentumExplanation: null,
      stabilityExplanation: null,
    };
    return computeResearchSignal(factorScores, null);
  }, [context, symbol]);

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
              {!hasRealContext && (
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white/[0.015] p-6 text-center">
                      <Info className="h-6 w-6 text-[var(--color-accent)]" />
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Review the research first.</h3>
                      <p className="max-w-xs text-xs leading-5 text-[var(--color-text-secondary)]">
                        Track or compare this company before continuing to your own broker.
                      </p>
                    </div>
                  </div>
                  <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--color-surface-raised)] px-5 py-4 flex flex-col gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <button
                      type="button"
                      onClick={() => { onClose(); productNavigate("watchlist"); }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Track instead
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); productNavigate("compare", symbol); }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Compare first
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to research
                    </button>
                  </div>
                </div>
              )}
              {hasRealContext && stage === 1 && (
                <StageOne
                  symbol={symbol}
                  displayName={displayName}
                  thesisSummary={thesis}
                  conviction={conviction}
                  risks={risks}
                  strengths={context?.keyStrengths ?? []}
                  watchItems={context?.whatToWatch ?? []}
                  signal={investSignal}
                  onContinue={() => setStage(2)}
                  onTrack={() => { onClose(); }}
                  onCompare={() => { onClose(); }}
                  onBack={onClose}
                />
              )}
              {hasRealContext && stage === 2 && (
                <StageTwo
                  onBack={() => setStage(1)}
                  onContinue={() => setStage(3)}
                />
              )}
              {hasRealContext && stage === 3 && (
                <StageThree
                  symbol={symbol}
                  displayName={displayName}
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
  signal,
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
  signal: ResearchSignalView | null;
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
          {signal && (
            <div className="mt-3">
              <ThesisHealthMeter signal={signal} size="sm" showDetails={true} />
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
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <ProductPanel className="flex flex-col items-center p-8 text-center bg-[var(--color-surface)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
            <ExternalLink className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">
            Review your research before deciding
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-5 text-[var(--color-text-secondary)]">
            Research review is complete. Any execution decision happens outside StockStory after your own review. Track or compare first while you evaluate.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2.5">
              <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
              <span className="text-xs text-[var(--color-text-muted)]">
                No broker credentials are stored in StockStory.
              </span>
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
          Continue to summary
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-full h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-4 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to review
        </button>
      </div>
    </div>
  );
}

function StageThree({
  symbol,
  displayName,
  onBack,
  onClose,
}: {
  symbol: string;
  displayName: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        <ProductPanel className="p-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <FileText className="h-3 w-3" />
            Review summary
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
              <span className="text-[var(--color-text-muted)]">Mode</span>
              <span className="font-medium text-[var(--color-active)]">Research review</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Next step</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                Decide outside StockStory
              </span>
            </div>
          </div>
        </ProductPanel>

        <ProductPanel className="border border-[var(--color-active-border)] bg-[var(--color-active-bg)] p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-active)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No order has been placed.
              </p>
              <p className="mt-1 text-sm leading-5 text-[var(--color-text-secondary)]">
                StockStory India does not execute orders or send instructions on your behalf. This is not a confirmation of any external action.
              </p>
            </div>
          </div>
        </ProductPanel>
      </div>

      <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--color-surface-raised)] px-5 py-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Done
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
