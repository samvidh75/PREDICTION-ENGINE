import React from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3 } from "lucide-react";
import { buildTechnicalIntelligence, type TechnicalInput, type TechnicalIntelligenceView } from "../../lib/product/technicalIntelligenceViewModel";
import { ProductPanel } from "../product/ProductUI";

interface TechnicalIntelligencePanelProps {
  input?: Partial<TechnicalInput>;
  view?: TechnicalIntelligenceView;
  asOf?: string | null;
  delayed?: boolean;
}

const STATE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Strong momentum": { bg: "bg-[rgba(22,163,74,0.1)]", text: "text-[#16A34A]", border: "border-[rgba(22,163,74,0.2)]" },
  "Improving": { bg: "bg-[rgba(41,98,255,0.1)]", text: "text-[#2962FF]", border: "border-[rgba(41,98,255,0.2)]" },
  "Neutral": { bg: "bg-[rgba(100,116,139,0.1)]", text: "text-[#64748B]", border: "border-[rgba(100,116,139,0.2)]" },
  "Weakening": { bg: "bg-[rgba(251,146,60,0.1)]", text: "text-[#FB923C]", border: "border-[rgba(251,146,60,0.2)]" },
  "Risk rising": { bg: "bg-[rgba(239,68,68,0.1)]", text: "text-[#EF4444]", border: "border-[rgba(239,68,68,0.2)]" },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  positive: TrendingUp,
  neutral: Minus,
  risk: TrendingDown,
};

export default function TechnicalIntelligencePanel({ input, view, asOf, delayed = false }: TechnicalIntelligencePanelProps) {
  const techView = view ?? buildTechnicalIntelligence({
    priceHistory: input?.priceHistory ?? [],
    momentumScore: input?.momentumScore ?? null,
    volatilityScore: input?.volatilityScore ?? null,
    rsiValue: input?.rsiValue ?? null,
    macdValue: input?.macdValue ?? null,
    priceChangePercent: input?.priceChangePercent ?? null,
    distanceFrom52WeekHigh: input?.distanceFrom52WeekHigh ?? null,
  });

  const colors = STATE_COLORS[techView.state] ?? STATE_COLORS["Neutral"];

  if (techView.state === "Not enough information") {
    return (
      <ProductPanel className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <BarChart3 className="h-4 w-4" /> Technical Intelligence
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Not enough information to assess technical condition.
        </p>
      </ProductPanel>
    );
  }

  return (
    <ProductPanel className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          <BarChart3 className="h-4 w-4" /> Technical Intelligence
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}
        >
          {techView.state === "Strong momentum" && <TrendingUp className="h-3 w-3" />}
          {techView.state === "Risk rising" && <AlertTriangle className="h-3 w-3" />}
          {techView.state}
        </span>
      </div>
      <div className={`mt-2 text-[10px] ${delayed ? "text-amber-700" : "text-[var(--color-text-muted)]"}`}>
        {asOf ? `Calculated from prices through ${asOf}` : "Source date unavailable"}{delayed ? " · delayed data" : ""}
      </div>

      {techView.score !== null && (
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold tabular-nums text-[var(--color-text-primary)]">
            {techView.score}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            / 100 · {techView.activeFactorCount} active signals
          </span>
        </div>
      )}

      <p className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
        {techView.explanation}
      </p>

      <div className="mt-5 space-y-2">
        {techView.checks.map((check) => {
          const Icon = STATUS_ICONS[check.status] ?? Minus;
          return (
            <div key={check.label} className="flex items-start gap-2.5 rounded-lg bg-[rgba(15,23,42,0.025)] px-3 py-2">
              <Icon
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                  check.status === "positive"
                    ? "text-[#16A34A]"
                    : check.status === "risk"
                      ? "text-[#EF4444]"
                      : "text-[#64748B]"
                }`}
              />
              <div className="min-w-0">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {check.label}
                </span>
                <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                  {check.detail}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {techView.topDrivers.length > 0 && (
        <div className="mt-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#16A34A]">
            Top drivers
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {techView.topDrivers.map((driver) => (
              <span
                key={driver}
                className="rounded-lg border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.08)] px-2 py-1 text-xs text-[#16A34A]"
              >
                {driver}
              </span>
            ))}
          </div>
        </div>
      )}

      {techView.riskFlags.length > 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#EF4444]">
            Risk flags
          </span>
          <div className="mt-2 space-y-1">
            {techView.riskFlags.map((flag) => (
              <div key={flag} className="flex items-center gap-2 text-xs text-[#EF4444]">
                <AlertTriangle className="h-3 w-3" />
                {flag}
              </div>
            ))}
          </div>
        </div>
      )}
    </ProductPanel>
  );
}
