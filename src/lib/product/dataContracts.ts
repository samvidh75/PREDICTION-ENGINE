import type { FinancialMetric, FinancialMetricGroup } from "./financialDataModel";

export interface ProductResearchData {
  score: number | null;
  riskScore: number | null;
  quality: number | null;
  valuation: number | null;
  growth: number | null;
  stability: number | null;
  momentum: number | null;
  financialGroups: FinancialMetricGroup[];
  financialCompleteness: number;
  sector: string | null;
  marketCap: string | null;
  price: number | null;
  change: number | null;
}

export interface ProductViewData<T> {
  state: "loading" | "ready" | "empty" | "partial" | "error";
  data: T | null;
  message?: string;
}
