export type FinancialMetricKey =
  | "revenue"
  | "pat"
  | "ebitda"
  | "operatingProfit"
  | "eps"
  | "operatingMargin"
  | "netMargin";

export type PeriodType = "annual" | "quarterly";

export interface FinancialSeriesPoint {
  period: string;
  fiscalYear: number;
  quarter?: string;
  value: number | null;
  unit: "crore" | "lakh" | "absolute" | "%";
  sourceState: "available" | "missing";
}

export interface FinancialSeries {
  symbol: string;
  metric: FinancialMetricKey;
  label: string;
  periodType: PeriodType;
  points: FinancialSeriesPoint[];
  updatedAt: string;
}

export const FINANCIAL_METRIC_LABELS: Record<FinancialMetricKey, string> = {
  revenue: "Revenue",
  pat: "PAT / Net Profit",
  ebitda: "EBITDA",
  operatingProfit: "Operating Profit",
  eps: "EPS",
  operatingMargin: "Operating Margin",
  netMargin: "Net Margin",
};

export const FINANCIAL_METRIC_UNITS: Record<FinancialMetricKey, "crore" | "absolute" | "%"> = {
  revenue: "crore",
  pat: "crore",
  ebitda: "crore",
  operatingProfit: "crore",
  eps: "absolute",
  operatingMargin: "%",
  netMargin: "%",
};
