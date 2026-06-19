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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl border border-b-0 border-[rgba(148,163,184,0.12)] bg-[#0D1117] shadow-2xl sm:max-h-[85vh] sm:w-[480px] sm:rounded-2xl sm:border-b">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[rgba(148,163,184,0.08)] bg-[#0D1117] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2962FF]/10">
              <FileText className="h-3.5 w-3.5 text-[#2962FF]" />
            </div>
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Invest review</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#64748B] hover:text-[#E6EDF3] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loadingContext ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#9AA7B5]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2962FF]" />
              Loading research context...
            </div>
          ) : (
            <>
              {!hasRealContext && (
                <div className="space-y-5 py-4">
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-6 text-center">
                    <Info className="h-6 w-6 text-[#2962FF]" />
                    <h3 className="text-sm font-semibold text-[#E6EDF3]">Broker handoff is being prepared.</h3>
                    <p className="max-w-xs text-xs leading-5 text-[#9AA7B5]">
                      Broker integration is not yet available for this company. Track or compare first while you evaluate.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { onClose(); productNavigate("watchlist"); }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-3 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Track instead
                    </button>
                    <button
                      type="button"
                      onClick={() => { onClose(); productNavigate("compare", symbol); }}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-3 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Compare first
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
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
    <div className="space-y-5">
      <ProductPanel className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">
            <BookOpen className="h-3 w-3" />
            Thesis review
          </div>
          <ResearchContextLink label="How scores work" />
        </div>
        <h3 className="mt-3 text-base font-semibold text-[#E6EDF3]">
          {displayName}
          <span className="ml-1.5 text-[#9AA7B5]">({symbol.toUpperCase()})</span>
        </h3>
        {conviction && (
          <span className="mt-1 inline-block rounded-full bg-[#2962FF]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#2962FF]">
            {conviction}
          </span>
        )}
        {signal && (
          <div className="mt-3">
            <ThesisHealthMeter signal={signal} size="sm" showDetails={true} />
          </div>
        )}
        {thesisSummary && (
          <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">{thesisSummary}</p>
        )}
      </ProductPanel>

      {strengths.length > 0 && (
        <ProductPanel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16A34A]">
            <CheckCircle2 className="h-3 w-3" />
            Key strengths
          </div>
          <ul className="mt-3 space-y-2">
            {strengths.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[#9AA7B5]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]/60" />
                {item}
              </li>
            ))}
          </ul>
        </ProductPanel>
      )}

      {risks && risks.length > 0 && (
        <ProductPanel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F59E0B]">
            <AlertTriangle className="h-3 w-3" />
            Key risks
          </div>
          <ul className="mt-3 space-y-2">
            {risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[#9AA7B5]">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#F59E0B]/60" />
                {risk}
              </li>
            ))}
          </ul>
        </ProductPanel>
      )}

      {watchItems.length > 0 && (
        <ProductPanel className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2962FF]">
            <Info className="h-3 w-3" />
            What to watch
          </div>
          <ul className="mt-3 space-y-2">
            {watchItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[#9AA7B5]">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#2962FF]/60" />
                {item}
              </li>
            ))}
          </ul>
        </ProductPanel>
      )}

      <ProductPanel className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#16A34A]">
          <CheckCircle2 className="h-3 w-3" />
          Investment checklist
        </div>
        <ul className="mt-3 space-y-2">
          {STAGE_1_CHECKLIST.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[#9AA7B5]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]/60" />
              {item}
            </li>
          ))}
        </ul>
      </ProductPanel>

      <ProductPanel className="border-[#2962FF]/20 bg-[#2962FF]/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2962FF]" />
          <div>
            <p className="text-sm leading-5 text-[#E6EDF3]">
              Final order placement happens with your broker.
            </p>
            <p className="mt-1 text-sm leading-5 text-[#9AA7B5]">
              No broker credentials are stored in StockStory. No order has been placed.
            </p>
          </div>
        </div>
      </ProductPanel>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors"
        >
          Continue review
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onTrack}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-3 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Track instead
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-3 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Compare first
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-3 text-xs font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to research
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
    <div className="space-y-5">
      <ProductPanel className="flex flex-col items-center p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2962FF]/10">
          <ExternalLink className="h-5 w-5 text-[#2962FF]" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[#E6EDF3]">
          Review your research before deciding
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-5 text-[#9AA7B5]">
          Research review is complete. Any execution decision happens outside StockStory after your own review. Track or compare first while you evaluate.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5">
            <Shield className="h-4 w-4 text-[#64748B]" />
            <span className="text-xs text-[#64748B]">
              No broker credentials are stored in StockStory.
            </span>
          </div>
        </div>
      </ProductPanel>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors"
        >
          Continue to summary
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-4 text-xs font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
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
    <div className="space-y-5">
      <ProductPanel className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">
          <FileText className="h-3 w-3" />
          Review summary
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#9AA7B5]">Instrument</span>
            <span className="font-medium text-[#E6EDF3]">
              {displayName}
              <span className="ml-1 text-[#9AA7B5]">
                ({symbol.toUpperCase()})
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#9AA7B5]">Mode</span>
            <span className="font-medium text-[#16A34A]">Research review</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#9AA7B5]">Next step</span>
            <span className="font-medium text-[#E6EDF3]">
              Decide outside StockStory
            </span>
          </div>
        </div>
      </ProductPanel>

      <ProductPanel className="border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.05)] p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
          <div>
            <p className="text-sm font-semibold text-[#E6EDF3]">
              No order has been placed.
            </p>
            <p className="mt-1 text-sm leading-5 text-[#9AA7B5]">
              StockStory India does not execute orders or send instructions on your behalf. This is not a confirmation of any external action.
            </p>
          </div>
        </div>
      </ProductPanel>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#2962FF] bg-[#2962FF] px-4 text-xs font-semibold text-white hover:bg-[#3B71FF] transition-colors"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-transparent px-4 text-xs font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to handoff review
        </button>
      </div>
    </div>
  );
}
