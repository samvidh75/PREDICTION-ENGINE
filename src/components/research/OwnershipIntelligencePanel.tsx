import React from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Users } from "lucide-react";
import { buildOwnershipIntelligence, type OwnershipIntelligenceView, type OwnershipInput } from "../../lib/product/ownershipIntelligence";
import { ProductPanel } from "../product/ProductUI";

interface OwnershipIntelligencePanelProps {
  input?: Partial<OwnershipInput>;
  view?: OwnershipIntelligenceView;
}

const STATE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Stable ownership": { bg: "bg-[rgba(100,116,139,0.1)]", text: "text-[#64748B]", border: "border-[rgba(100,116,139,0.2)]" },
  "Institutional support improving": { bg: "bg-[rgba(22,163,74,0.1)]", text: "text-[#16A34A]", border: "border-[rgba(22,163,74,0.2)]" },
  "Promoter confidence stable": { bg: "bg-[rgba(41,98,255,0.1)]", text: "text-[#2962FF]", border: "border-[rgba(41,98,255,0.2)]" },
  "Ownership needs review": { bg: "bg-[rgba(251,146,60,0.1)]", text: "text-[#FB923C]", border: "border-[rgba(251,146,60,0.2)]" },
  "Risk rising": { bg: "bg-[rgba(239,68,68,0.1)]", text: "text-[#EF4444]", border: "border-[rgba(239,68,68,0.2)]" },
};

function TrendIndicator({ trend }: { trend: "rising" | "stable" | "falling" | null }) {
  if (trend === "rising") return <TrendingUp className="h-3.5 w-3.5 text-[#16A34A]" />;
  if (trend === "falling") return <TrendingDown className="h-3.5 w-3.5 text-[#EF4444]" />;
  return <Minus className="h-3.5 w-3.5 text-[#64748B]" />;
}

export default function OwnershipIntelligencePanel({ input, view }: OwnershipIntelligencePanelProps) {
  const ownership = view ?? buildOwnershipIntelligence({
    snapshots: input?.snapshots ?? [],
  });

  const colors = STATE_COLORS[ownership.state] ?? STATE_COLORS["Stable ownership"];

  if (ownership.state === "Not enough information") {
    return (
      <ProductPanel className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Users className="h-4 w-4" /> Ownership Intelligence
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Shareholding data not yet available.
        </p>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <Users className="h-4 w-4" /> Ownership Intelligence
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}
        >
          {ownership.state === "Risk rising" && <AlertTriangle className="h-3 w-3" />}
          {ownership.state}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
        {ownership.explanation}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {ownership.promoterHolding !== null && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(15,23,42,0.02)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                Promoter
              </span>
              <TrendIndicator trend={ownership.promoterTrend} />
            </div>
            <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
              {ownership.promoterHolding.toFixed(1)}%
            </div>
          </div>
        )}
        {ownership.fiiHolding !== null && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(15,23,42,0.02)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                FII
              </span>
              <TrendIndicator trend={ownership.fiiTrend} />
            </div>
            <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
              {ownership.fiiHolding.toFixed(1)}%
            </div>
          </div>
        )}
        {ownership.diiHolding !== null && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(15,23,42,0.02)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                DII
              </span>
              <TrendIndicator trend={ownership.diiTrend} />
            </div>
            <div className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
              {ownership.diiHolding.toFixed(1)}%
            </div>
          </div>
        )}
        {ownership.pledgePercent !== null && (
          <div className="rounded-lg border border-[var(--color-border)] bg-[rgba(15,23,42,0.02)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                Pledge
              </span>
            </div>
            <div className={`mt-1.5 font-mono text-lg font-semibold tabular-nums ${ownership.pledgePercent > 25 ? "text-[#EF4444]" : "text-[var(--color-text-primary)]"}`}>
              {ownership.pledgePercent.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {ownership.drivers.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {ownership.drivers.map((driver) => (
            <div key={driver.label} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              {driver.direction === "positive" && <TrendingUp className="h-3 w-3 text-[#16A34A]" />}
              {driver.direction === "risk" && <TrendingDown className="h-3 w-3 text-[#EF4444]" />}
              {driver.direction === "neutral" && <Minus className="h-3 w-3 text-[#64748B]" />}
              {driver.detail}
            </div>
          ))}
        </div>
      )}
    </ProductPanel>
  );
}
