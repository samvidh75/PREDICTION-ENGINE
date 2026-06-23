import type { FinancialSeries, FinancialSeriesPoint, FinancialMetricKey, PeriodType } from "../../../shared/financials/FinancialSeriesTypes";
import { FINANCIAL_METRIC_LABELS, FINANCIAL_METRIC_UNITS } from "../../../shared/financials/FinancialSeriesTypes";

const KNOWN_KEYS: Record<string, FinancialMetricKey> = {
  "total revenue": "revenue",
  "revenue": "revenue",
  "net revenue": "revenue",
  "sales": "revenue",
  "total income": "revenue",
  "profit for the period": "pat",
  "net profit": "pat",
  "profit/(loss) for the period": "pat",
  "pat": "pat",
  "net profit/(loss)": "pat",
  "profit after tax": "pat",
  "ebitda": "ebitda",
  "profit before depreciation, interest & tax": "ebitda",
  "operating profit": "operatingProfit",
  "profit before tax": "operatingProfit",
  "pbdt": "operatingProfit",
  "pbdit": "operatingProfit",
  "eps": "eps",
  "earnings per share": "eps",
  "operating margin": "operatingMargin",
  "net margin": "netMargin",
  "net profit margin": "netMargin",
};

function parseFinancialValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const str = String(value).replace(/,/g, "").trim();
  if (!str || str === "-" || str === "--") return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function classifyRecordType(endDate: string): PeriodType {
  if (!endDate) return "annual";
  const parts = endDate.split("-");
  if (parts.length !== 3) return "annual";
  return "annual";
}

function extractFiscalYear(row: Record<string, unknown>): number {
  const rawYear = row["FiscalYear"];
  if (typeof rawYear === "number") return rawYear;
  if (typeof rawYear === "string") {
    const parsed = Number(rawYear.replace(/[^0-9]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  const endDate = row["EndDate"] as string | undefined;
  if (endDate) {
    const parsed = Number(endDate.slice(0, 4));
    if (Number.isFinite(parsed)) return parsed;
  }
  return new Date().getFullYear();
}

function extractLabel(row: Record<string, unknown>): string {
  const rawType = String(row["Type"] ?? "");
  const rawEnd = String(row["EndDate"] ?? "");
  const year = extractFiscalYear(row);
  if (rawType === "Annual" || rawType === "FY") {
    return `FY${String(year).slice(2)}`;
  }
  if (rawEnd.length >= 7) {
    const month = rawEnd.slice(5, 7);
    const qMap: Record<string, string> = { "03": "Q4", "06": "Q1", "09": "Q2", "12": "Q3" };
    const q = qMap[month] || `M${month}`;
    return `Q${q.slice(1)} FY${String(year).slice(2)}`;
  }
  return `FY${String(year).slice(2)}`;
}

function findMetricValue(financialMap: Record<string, unknown>, metricKey: string): number | null {
  const items = financialMap[metricKey];
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    if (item && typeof item === "object" && "key" in item && "value" in item) {
      const k = String((item as Record<string, unknown>).key ?? "").toLowerCase().trim();
      if (k === metricKey.toLowerCase()) {
        return parseFinancialValue((item as Record<string, unknown>).value);
      }
    }
  }
  return null;
}

function findMetricInMap(financialMap: Record<string, unknown>, searchKeys: string[]): number | null {
  for (const sk of searchKeys) {
    for (const [mapKey, items] of Object.entries(financialMap)) {
      if (!Array.isArray(items)) continue;
      const mapKeyLower = mapKey.toLowerCase().replace(/\s+/g, "");
      const skLower = sk.toLowerCase().replace(/\s+/g, "");
      if (mapKeyLower.includes(skLower) || skLower.includes(mapKeyLower)) {
        for (const item of items) {
          if (item && typeof item === "object" && "value" in item) {
            const val = parseFinancialValue((item as Record<string, unknown>).value);
            if (val !== null) return val;
          }
        }
      }
    }
  }
  return null;
}

function findAllItemsInMap(financialMap: Record<string, unknown>): Array<{ displayName: string; key: string; value: unknown }> {
  const items: Array<{ displayName: string; key: string; value: unknown }> = [];
  for (const categoryItems of Object.values(financialMap)) {
    if (!Array.isArray(categoryItems)) continue;
    for (const item of categoryItems) {
      if (item && typeof item === "object" && "value" in item) {
        const rec = item as Record<string, unknown>;
        items.push({
          displayName: String(rec["displayName"] ?? "").toLowerCase().trim(),
          key: String(rec["key"] ?? "").toLowerCase().trim(),
          value: rec["value"],
        });
      }
    }
  }
  return items;
}

function findItemValue(items: Array<{ displayName: string; key: string; value: unknown }>, term: string): number | null {
  const termClean = term.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const item of items) {
    const displayClean = item.displayName.replace(/[^a-z0-9]/g, "");
    const keyClean = item.key.replace(/[^a-z0-9]/g, "");
    if (displayClean.includes(termClean) || keyClean.includes(termClean) || termClean.includes(displayClean) || termClean.includes(keyClean)) {
      return parseFinancialValue(item.value);
    }
  }
  return null;
}

function findFieldsForMetric(allItems: Array<{ displayName: string; key: string; value: unknown }>, metric: FinancialMetricKey): number | null {
  const searchTerms: Record<FinancialMetricKey, string[]> = {
    revenue: ["total revenue", "revenue", "net revenue", "sales", "total income", "income from operations"],
    pat: ["net income", "profit for the period", "net profit", "profit after tax", "pat", "net profit/(loss)", "profit/(loss) for the period", "income availableto com excl extra ord", "diluted net income"],
    ebitda: ["ebitda", "profit before depreciation, interest & tax"],
    operatingProfit: ["operating income", "operating profit", "profit before tax", "pbdt", "pbdit", "profit from operations", "income from operations"],
    eps: ["eps", "earnings per share", "basic eps", "diluted normalized eps", "diluted eps excluding extra ord items"],
    operatingMargin: ["operating margin"],
    netMargin: ["net margin", "net profit margin"],
  };

  const terms = searchTerms[metric] || [];
  for (const term of terms) {
    const val = findItemValue(allItems, term);
    if (val !== null) return val;
  }
  return null;
}

interface RowData {
  fiscalYear: number;
  label: string;
  quarter?: string;
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  depreciation: number | null;
  eps: number | null;
}

export function mapToFinancialSeries(symbol: string, financials: Record<string, unknown>[], validMetrics?: FinancialMetricKey[]): FinancialSeries[] {
  const metricsToBuild = validMetrics ?? (Object.keys(FINANCIAL_METRIC_LABELS) as FinancialMetricKey[]);

  const results: FinancialSeries[] = [];

  const annualRows = financials.filter((r) => String(r["Type"] ?? "").toLowerCase() === "annual" || String(r["Type"] ?? "").toLowerCase() === "fy");
  const interimRows = financials.filter((r) => String(r["Type"] ?? "").toLowerCase() === "interim" || String(r["Type"] ?? "").toLowerCase() === "q");

  function extractRowData(rows: Record<string, unknown>[]): RowData[] {
    return rows.map((row) => {
      const finMap = row["stockFinancialMap"] as Record<string, unknown> | undefined;
      const fiscalYear = extractFiscalYear(row);
      const label = extractLabel(row);
      const endDate = String(row["EndDate"] ?? "");
      const quarter = endDate.length >= 7 ? `Q${Math.ceil(Number(endDate.slice(5, 7)) / 3)}` : undefined;
      const items = finMap ? findAllItemsInMap(finMap) : [];
      return {
        fiscalYear,
        label,
        quarter,
        revenue: findItemValue(items, "total revenue") ?? findItemValue(items, "revenue") ?? findItemValue(items, "sales"),
        operatingIncome: findItemValue(items, "operating income") ?? findItemValue(items, "income from operations"),
        netIncome: findItemValue(items, "net income") ?? findItemValue(items, "income availableto com excl extra ord") ?? findItemValue(items, "diluted net income"),
        depreciation: findItemValue(items, "depreciation") ?? findItemValue(items, "depreciation/amortization"),
        eps: findItemValue(items, "diluted normalized eps") ?? findItemValue(items, "diluted eps excluding extra ord items") ?? findItemValue(items, "eps"),
      };
    });
  }

  function makePoints(rows: RowData[], valueFn: (r: RowData) => number | null, unit: "crore" | "absolute" | "%"): FinancialSeriesPoint[] {
    return rows.map((r) => ({
      period: r.label,
      fiscalYear: r.fiscalYear,
      quarter: r.quarter,
      value: valueFn(r),
      unit,
      sourceState: valueFn(r) !== null ? "available" as const : "missing" as const,
    })).sort((a, b) => b.fiscalYear - a.fiscalYear || ((a.quarter ?? "") > (b.quarter ?? "") ? -1 : 1));
  }

  const annualData = extractRowData(annualRows);
  const quarterlyData = extractRowData(interimRows);

  const valueExtractors: Record<FinancialMetricKey, (r: RowData) => number | null> = {
    revenue: (r) => r.revenue,
    pat: (r) => r.netIncome,
    ebitda: (r) => r.operatingIncome !== null && r.depreciation !== null ? r.operatingIncome + r.depreciation : null,
    operatingProfit: (r) => r.operatingIncome,
    eps: (r) => r.eps,
    operatingMargin: (r) => r.revenue !== null && r.operatingIncome !== null && r.revenue > 0 ? Math.round((r.operatingIncome / r.revenue) * 10000) / 100 : null,
    netMargin: (r) => r.revenue !== null && r.netIncome !== null && r.revenue > 0 ? Math.round((r.netIncome / r.revenue) * 10000) / 100 : null,
  };

  for (const metric of metricsToBuild) {
    const annualPoints = makePoints(annualData, valueExtractors[metric], FINANCIAL_METRIC_UNITS[metric]);
    const quarterlyPoints = makePoints(quarterlyData, valueExtractors[metric], FINANCIAL_METRIC_UNITS[metric]);

    const hasAnnualData = annualPoints.some((p) => p.value !== null);
    if (hasAnnualData) {
      results.push({
        symbol, metric, label: FINANCIAL_METRIC_LABELS[metric], periodType: "annual",
        points: annualPoints, updatedAt: new Date().toISOString(),
      });
    }

    const hasQuarterlyData = quarterlyPoints.some((p) => p.value !== null);
    if (hasQuarterlyData) {
      results.push({
        symbol, metric, label: FINANCIAL_METRIC_LABELS[metric], periodType: "quarterly",
        points: quarterlyPoints, updatedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}
