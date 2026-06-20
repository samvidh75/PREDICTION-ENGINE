import React, { useState } from "react";
import { CheckCircle, AlertCircle, HelpCircle, MinusCircle, XCircle, ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import { buildResearchChecklist, type ResearchChecklistView, type ChecklistInput, type ChecklistItemStatus } from "../../lib/product/researchChecklist";
import { ProductPanel } from "../product/ProductUI";

interface ResearchChecklistPanelProps {
  input?: Partial<ChecklistInput>;
  view?: ResearchChecklistView;
}

const STATUS_CONFIG: Record<ChecklistItemStatus, { icon: React.ElementType; color: string; label: string }> = {
  pass: { icon: CheckCircle, color: "#16A34A", label: "Pass" },
  neutral: { icon: MinusCircle, color: "#64748B", label: "Neutral" },
  watch: { icon: AlertCircle, color: "#F59E0B", label: "Watch" },
  fail: { icon: XCircle, color: "#EF4444", label: "Fail" },
  not_enough_information: { icon: HelpCircle, color: "#94A3B8", label: "Insufficient data" },
};

export default function ResearchChecklistPanel({ input, view }: ResearchChecklistPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const checklist = view ?? buildResearchChecklist({
    healthometerScores: input?.healthometerScores ?? [],
    momentumScore: input?.momentumScore ?? null,
    riskScore: input?.riskScore ?? null,
    peContext: input?.peContext ?? null,
    pbContext: input?.pbContext ?? null,
    debtWarning: input?.debtWarning ?? null,
    volatilityNote: input?.volatilityNote ?? null,
    promoterHolding: input?.promoterHolding ?? null,
    fiiHolding: input?.fiiHolding ?? null,
    revenueGrowth: input?.revenueGrowth ?? null,
    profitGrowth: input?.profitGrowth ?? null,
    roce: input?.roce ?? null,
    roe: input?.roe ?? null,
    debtToEquity: input?.debtToEquity ?? null,
    currentRatio: input?.currentRatio ?? null,
    hasPeerData: input?.hasPeerData ?? false,
  });

  return (
    <ProductPanel className="p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <ClipboardCheck className="h-4 w-4" /> Research Checklist
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {checklist.passCount}/{checklist.totalItems} checks
            {checklist.watchpointCount > 0 && ` · ${checklist.watchpointCount} watch`}
          </span>
          {expanded ? <ChevronDown className="h-4 w-4 text-[#64748B]" /> : <ChevronRight className="h-4 w-4 text-[#64748B]" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
            {checklist.explanation}
          </p>

          {checklist.categories.map((cat) => (
            <div key={cat.category} className="rounded-lg border border-[var(--color-border)] bg-[rgba(15,23,42,0.02)]">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{cat.label}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {cat.passCount}/{cat.totalCount}
                  {cat.strongest && <span className="ml-1.5 text-[#16A34A]">· strongest</span>}
                  {cat.weakest && cat.passCount < cat.totalCount && <span className="ml-1.5 text-[#F59E0B]">· review</span>}
                </span>
              </div>
              <div className="space-y-0.5 border-t border-[var(--color-border)] px-3 py-1.5">
                {checklist.items
                  .filter((item) => item.category === cat.category)
                  .map((item) => {
                    const config = STATUS_CONFIG[item.status];
                    const Icon = config.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-2 py-1">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: config.color }} />
                        <div className="min-w-0">
                          <span className="text-xs text-[var(--color-text-primary)]">{item.label}</span>
                          <span className="ml-1.5 text-[10px] text-[var(--color-text-secondary)]">{item.evidence}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProductPanel>
  );
}
