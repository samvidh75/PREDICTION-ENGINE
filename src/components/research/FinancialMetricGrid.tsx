import React from "react";
import { Info, TrendingUp, Shield, AlertTriangle, BarChart3 } from "lucide-react";
import { ProductPanel } from "../product/ProductUI";
import { formatMetricValue, type FinancialMetric, type FinancialMetricGroup } from "../../lib/product/financialDataModel";

interface FinancialMetricGridProps {
  groups: FinancialMetricGroup[];
}

function MetricRow({ metric }: { metric: FinancialMetric }) {
  if (metric.value === null || metric.value === undefined) return null;
  const display = formatMetricValue(metric);

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[#9AA7B5]">{metric.label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums text-[#E8EDF2]">{display}</span>
    </div>
  );
}

export const FinancialMetricGrid: React.FC<FinancialMetricGridProps> = ({ groups }) => {
  const hasAny = groups.some((g) => g.metrics.some((m) => m.value !== null));
  if (!hasAny) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const hasMetric = group.metrics.some((m) => m.value !== null);
        if (!hasMetric) return null;
        return (
          <div key={group.title} className="rounded-lg border border-[rgba(148,163,184,0.1)] bg-[rgba(255,255,255,0.015)] p-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B] mb-2">{group.title}</h4>
            <div className="divide-y divide-[rgba(148,163,184,0.06)]">
              {group.metrics.map((m) => (
                <MetricRow key={m.label} metric={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ValuationContextPanelProps {
  peRatio: FinancialMetric | null;
  pbRatio: FinancialMetric | null;
  evEbitda: FinancialMetric | null;
  dividendYield: FinancialMetric | null;
  interpretation: string | null;
}

export const ValuationContextPanel: React.FC<ValuationContextPanelProps> = ({
  peRatio, pbRatio, evEbitda, dividendYield, interpretation,
}) => {
  const metrics = [peRatio, pbRatio, evEbitda, dividendYield].filter((m) => m?.value !== null);
  if (metrics.length === 0) return null;

  return (
    <ProductPanel className="p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="h-4 w-4 text-[#2A6AFF]" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-[#E8EDF2]">Valuation Context</h3>
      </div>
      <div className="space-y-2">
        {peRatio?.value !== null && peRatio && <MetricRow metric={peRatio} />}
        {pbRatio?.value !== null && pbRatio && <MetricRow metric={pbRatio} />}
        {evEbitda?.value !== null && evEbitda && <MetricRow metric={evEbitda} />}
        {dividendYield?.value !== null && dividendYield && <MetricRow metric={dividendYield} />}
      </div>
      {interpretation && (
        <p className="mt-2 text-[11px] leading-4 text-[#9AA7B5]">{interpretation}</p>
      )}
    </ProductPanel>
  );
};

interface RiskContextPanelProps {
  debtToEquity: FinancialMetric | null;
  currentRatio: FinancialMetric | null;
  volatilityRisk: string | null;
  keyRiskFlags: string[];
  overallRisk: string | null;
}

export const RiskContextPanel: React.FC<RiskContextPanelProps> = ({
  debtToEquity, currentRatio, volatilityRisk, keyRiskFlags, overallRisk,
}) => {
  const hasMetrics = debtToEquity?.value !== null || currentRatio?.value !== null;
  const hasFlags = keyRiskFlags.length > 0 || overallRisk !== null;
  if (!hasMetrics && !hasFlags) return null;

  return (
    <ProductPanel className="p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Shield className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-[#E8EDF2]">Risk Factors</h3>
      </div>
      {hasMetrics && (
        <div className="space-y-2">
          {debtToEquity?.value !== null && debtToEquity && <MetricRow metric={debtToEquity} />}
          {currentRatio?.value !== null && currentRatio && <MetricRow metric={currentRatio} />}
        </div>
      )}
      {overallRisk && (
        <p className="mt-2 text-[11px] leading-4 text-[#9AA7B5]">
          <AlertTriangle className="inline h-3 w-3 mr-1 text-[#F59E0B]" aria-hidden="true" />
          {overallRisk}
        </p>
      )}
      {keyRiskFlags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keyRiskFlags.map((flag, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-[rgba(239,68,68,0.08)] px-2 py-0.5 text-[10px] text-[#EF4444]">
              {flag}
            </span>
          ))}
        </div>
      )}
    </ProductPanel>
  );
};
