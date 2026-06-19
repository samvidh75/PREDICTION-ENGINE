import type { RawFinancialData, FinancialMetricGroup, ValuationContext, RiskContext } from "./financialDataModel";
import { buildFinancialGroups } from "./financialDataModel";
import type { CompanyFinancialSnapshot } from "./financialDataModel";

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function buildFinancialSnapshot(data: RawFinancialData | null): CompanyFinancialSnapshot {
  if (!data) {
    return {
      groups: [],
      valuation: null,
      risk: null,
      peerCount: 0,
      historyPoints: 0,
      completenessScore: 0,
    };
  }

  const groups: FinancialMetricGroup[] = buildFinancialGroups(data);

  const pe = safeNumber(data.peRatio);
  const pb = safeNumber(data.pbRatio);
  const ev = safeNumber(data.evEbitda);
  const dy = safeNumber(data.dividendYield);

  const valuation: ValuationContext | null = (pe !== null || pb !== null || ev !== null || dy !== null)
    ? {
        peRatio: pe !== null ? { label: "P/E", value: pe, format: "ratio" } : null,
        pbRatio: pb !== null ? { label: "P/B", value: pb, format: "ratio" } : null,
        evEbitda: ev !== null ? { label: "EV/EBITDA", value: ev, format: "ratio" } : null,
        dividendYield: dy !== null ? { label: "Dividend Yield", value: dy, format: "percent" } : null,
        interpretation: null,
      }
    : null;

  const dte = safeNumber(data.debtToEquity);
  const cr = safeNumber(data.currentRatio);

  const risk: RiskContext | null = (dte !== null || cr !== null)
    ? {
        debtToEquity: dte !== null ? { label: "Debt/Equity", value: dte, format: "ratio" } : null,
        currentRatio: cr !== null ? { label: "Current Ratio", value: cr, format: "ratio" } : null,
        volatilityRisk: null,
        keyRiskFlags: [],
        overallRisk: null,
      }
    : null;

  const totalMetrics = groups.reduce((sum, g) => sum + g.metrics.length, 0);
  const completenessScore = Math.min(100, Math.round((totalMetrics / 20) * 100));

  return {
    groups,
    valuation,
    risk,
    peerCount: 0,
    historyPoints: 0,
    completenessScore,
  };
}
