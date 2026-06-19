import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { ProductPanel } from "../product/ProductUI";

interface InvestHandoffSheetProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  companyName?: string;
  thesisSummary?: string;
}

type Stage = 1 | 2 | 3;

const STAGE_1_RISKS = [
  "Market volatility may affect entry price and position sizing.",
  "Liquidity constraints could affect external execution during high-volume periods.",
  "Sector-wide regulatory changes may alter the investment thesis over time.",
];

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
  thesisSummary,
}: InvestHandoffSheetProps) {
  const [stage, setStage] = useState<Stage>(1);

  useEffect(() => {
    if (open) {
      setStage(1);
    }
  }, [open]);

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

  const displayName = companyName || symbol.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Invest handoff — ${symbol.toUpperCase()}`}
    >
      <div
        className="relative w-full max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[28px] bg-[#0D1117] border border-white/10 shadow-depth sm:max-w-xl"
        tabIndex={-1}
      >
        <Header
          symbol={symbol}
          displayName={displayName}
          onClose={onClose}
        />

        <div className="px-6 py-5">
          <StageIndicator current={stage} />

          <div className="mt-6">
            {stage === 1 && (
              <StageOne
                symbol={symbol}
                displayName={displayName}
                thesisSummary={thesisSummary}
                onContinue={() => setStage(2)}
                onTrack={onClose}
                onCompare={onClose}
                onBack={onClose}
              />
            )}
            {stage === 2 && (
              <StageTwo
                onBack={() => setStage(1)}
                onContinue={() => setStage(3)}
              />
            )}
            {stage === 3 && (
              <StageThree
                symbol={symbol}
                displayName={displayName}
                onBack={() => setStage(2)}
                onClose={onClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  symbol,
  displayName,
  onClose,
}: {
  symbol: string;
  displayName: string;
  onClose: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/5 bg-[#0D1117] px-6 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm text-[#8B949E]">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Invest — {displayName}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#8B949E] hover:bg-white/10 hover:text-[#E6EDF3] transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function StageIndicator({ current }: { current: Stage }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as const).map((s) => (
        <div
          key={s}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            s <= current ? "bg-[#2962FF]" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function StageOne({
  symbol,
  displayName,
  thesisSummary,
  onContinue,
  onTrack,
  onCompare,
  onBack,
}: {
  symbol: string;
  displayName: string;
  thesisSummary?: string;
  onContinue: () => void;
  onTrack: () => void;
  onCompare: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <ProductPanel className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9AA7B5]">
          <BookOpen className="h-3 w-3" />
          Thesis review
        </div>
        <h3 className="mt-3 text-base font-semibold text-[#E6EDF3]">
          {displayName}
          <span className="ml-1.5 text-[#9AA7B5]">({symbol.toUpperCase()})</span>
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#9AA7B5]">
          {thesisSummary ||
            `Investment thesis for ${displayName} is being evaluated based on market positioning, fundamentals, and sector context.`}
        </p>
      </ProductPanel>

      <ProductPanel className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F59E0B]">
          <AlertTriangle className="h-3 w-3" />
          Key risks
        </div>
        <ul className="mt-3 space-y-2">
          {STAGE_1_RISKS.map((risk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-[#9AA7B5]">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#F59E0B]/60" />
              {risk}
            </li>
          ))}
        </ul>
      </ProductPanel>

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
          <p className="text-sm leading-5 text-[#E6EDF3]">
            StockStory is a research workspace. Any execution decision happens outside StockStory after your own review.
          </p>
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
          External handoff is being prepared
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-5 text-[#9AA7B5]">
          External handoff is being prepared for this account.
          Track instead or compare first while this workspace stays in review mode.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5">
            <Shield className="h-4 w-4 text-[#64748B]" />
            <span className="text-xs text-[#64748B]">
              No external account credentials are stored in StockStory.
            </span>
          </div>
        </div>
      </ProductPanel>

      <div className="flex flex-col gap-2 pt-2">
        <button
          type="button"
          disabled
          title="External handoff is not yet available"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#111827] px-4 text-xs font-semibold text-[#64748B] cursor-not-allowed"
        >
          Open external handoff
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(148,163,184,0.2)] bg-[#111827] px-4 text-xs font-semibold text-[#E6EDF3] hover:border-[#2962FF]/60 transition-colors"
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
              No external action has been taken.
            </p>
            <p className="mt-1 text-sm leading-5 text-[#9AA7B5]">
              StockStory India does not execute orders or send instructions on your behalf.
              This is not a confirmation of any external action.
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
