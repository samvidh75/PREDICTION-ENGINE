import type {
  MarketLivePrice, CompanyProfileOverview, FundamentalSnapshot,
  FinancialStatementTable, FinancialStatementRow, ShareholdingSnapshot,
  ShareholdingTrend,
} from "./IndianApiTypes";

function safeNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[₹,CrL%,\s]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function safeStr(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function extractPrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/[₹,]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['NSE', 'BSE', 'nse', 'bse', 'price', 'last']) {
      const v = obj[key];
      if (v !== undefined && v !== null) {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const n = Number(v.replace(/[₹,]/g, ''));
          if (Number.isFinite(n)) return n;
        }
      }
    }
  }
  return null;
}

export function mapToMarketLivePrice(raw: unknown): MarketLivePrice {
  const r = (raw as Record<string, unknown>) ?? {};
  const cp = r.currentPrice;
  const metrics = r.keyMetrics;
  const mcap = findMetric(metrics, 'Market Cap');
  const beta = findMetric(metrics, 'Beta');
  const week52High = r.yearHigh ?? findMetric(metrics, '52 week High');
  const week52Low = r.yearLow ?? findMetric(metrics, '52 week Low');

  return {
    symbol: safeStr(r.name ?? r.symbol) ?? "",
    price: extractPrice(cp),
    previousClose: null,
    open: null,
    high: null,
    low: null,
    change: r.percentChange !== undefined ? safeNum(r.percentChange) : null,
    changePercent: r.percentChange !== undefined ? safeNum(r.percentChange) : null,
    volume: null,
    avgVolume: null,
    week52High: safeNum(week52High),
    week52Low: safeNum(week52Low),
    marketCap: safeNum(mcap),
    tradedValue: null,
    lastTradedAt: null,
    exchange: "NSE",
    currency: "INR",
    halted: false,
    delisted: false,
    dataState: extractPrice(cp) !== null ? "available" : "partial",
  };
}

export function mapToProfile(raw: unknown): CompanyProfileOverview {
  const r = (raw as Record<string, unknown>) ?? {};
  const metrics = r.keyMetrics;
  const mcap = findMetric(metrics, 'Market Cap');
  return {
    symbol: safeStr(r.name ?? r.symbol) ?? "",
    companyName: safeStr(r.companyName ?? r.name) ?? "Unidentified security",
    shortName: null,
    nseTicker: null,
    bseCode: null,
    isin: null,
    sector: safeStr(r.industry),
    industry: safeStr(r.industry),
    description: safeStr(r.companyProfile),
    website: null,
    marketCap: safeNum(mcap),
    listingDate: null,
    faceValue: null,
    exchange: "NSE",
    dataState: r.companyName ? "available" : "partial",
  };
}

function findMetric(metrics: any, displayNamePattern: string): string | null {
  if (!metrics || typeof metrics !== 'object') return null;
  for (const category of Object.values(metrics)) {
    if (Array.isArray(category)) {
      for (const item of category) {
        if (typeof item === 'object' && item !== null) {
          const dn = String(item.displayName || '').toLowerCase();
          if (dn.includes(displayNamePattern.toLowerCase())) {
            const val = item.value;
            return val !== null && val !== undefined && val !== 'None' ? String(val) : null;
          }
        }
      }
    }
  }
  return null;
}

export function mapToFundamentals(raw: unknown): FundamentalSnapshot {
  const r = (raw as Record<string, unknown>) ?? {};
  const metrics = r.keyMetrics;
  const pe = findMetric(metrics, 'P/E excluding extraordinary items, most recent fiscal year');
  const pb = findMetric(metrics, 'Price to Book - most recent fiscal year');
  const divYield = findMetric(metrics, 'Current Dividend Yield');
  const eps = findMetric(metrics, 'EPS including extraordinary items - trailing 12 month');
  const bv = findMetric(metrics, 'Book value per share - most recent fiscal year');
  const de = findMetric(metrics, 'Total debt/total equity - most recent fiscal year');
  const cr = findMetric(metrics, 'Current ratio - most recent fiscal year');
  const roce = findMetric(metrics, 'ROCE');
  const roe = findMetric(metrics, 'Return on average equity');

  return {
    symbol: safeStr(r.name ?? r.symbol) ?? "",
    peRatio: safeNum(pe),
    pbRatio: safeNum(pb),
    roce: safeNum(roce),
    roe: safeNum(roe),
    debtToEquity: safeNum(de),
    dividendYield: safeNum(divYield),
    eps: safeNum(eps),
    bookValue: safeNum(bv),
    salesGrowth: null,
    profitGrowth: null,
    operatingMargin: null,
    netMargin: null,
    currentRatio: safeNum(cr),
    interestCoverage: null,
    dataState: pe || roe ? "available" : "partial",
  };
}

const ROW_KEY_MAP: Record<string, string> = {
  "sales": "revenue", "total income": "revenue", "revenue": "revenue",
  "operating profit": "operating_profit", "ebit": "operating_profit", "ebitda": "operating_profit",
  "net profit": "net_profit", "pat": "net_profit", "profit after tax": "net_profit",
  "borrowings": "total_debt", "debt": "total_debt", "total debt": "total_debt",
  "reserves": "equity", "equity": "equity", "net worth": "equity",
  "total assets": "total_assets",
  "cash": "cash", "cash and equivalents": "cash",
  "current assets": "current_assets",
  "current liabilities": "current_liabilities",
};

function normalizeRowKey(label: string): string {
  const lower = label.toLowerCase().trim();
  return ROW_KEY_MAP[lower] || lower.replace(/[^a-z0-9]/g, "_");
}

export function mapToFinancialTable(raw: unknown): FinancialStatementTable {
  const r = (raw as Record<string, unknown>) ?? {};
  const rows: FinancialStatementRow[] = [];
  const periods: string[] = [];
  if (r.quarterly_results && Array.isArray(r.quarterly_results)) {
    const qData = r.quarterly_results as Record<string, unknown>[];
    if (qData.length > 0) {
      const cols = Object.keys(qData[0]).filter((k) => k !== "period" && k !== "label");
      qData.forEach((q) => {
        const period = safeStr(q.period ?? q.label) ?? "";
        if (period && !periods.includes(period)) periods.push(period);
      });
      cols.forEach((col) => {
        const row: FinancialStatementRow = { label: col, values: [], unit: "Cr", key: normalizeRowKey(col) };
        qData.forEach((q) => row.values.push(safeNum(q[col])));
        rows.push(row);
      });
    }
  }
  return { symbol: safeStr(r.symbol) ?? "", periodType: "quarterly", periods, rows, currency: "INR", dataState: rows.length > 0 ? "available" : "partial" };
}

export function mapToShareholding(raw: unknown): ShareholdingTrend {
  const r = (raw as Record<string, unknown>) ?? {};
  const rows = r.shareholding_pattern ?? r.shareholding ?? r.shareholding_data;
  const snapshots: ShareholdingSnapshot[] = [];
  if (Array.isArray(rows)) {
    (rows as Record<string, unknown>[]).forEach((row) => {
      const period = safeStr(row.period ?? row.quarter ?? row.date) ?? "";
      snapshots.push({
        symbol: safeStr(r.symbol) ?? "",
        period,
        promoter: safeNum(row.promoter ?? row.promoters),
        fii: safeNum(row.fii ?? row.foreign_institutional),
        dii: safeNum(row.dii ?? row.domestic_institutional),
        public_: safeNum(row.public_ ?? row.public ?? row.retail),
        others: safeNum(row.others),
        totalHeld: safeNum(row.total),
        dataState: "available",
      });
    });
  }
  return { symbol: safeStr(r.symbol) ?? "", snapshots, dataState: snapshots.length > 0 ? "available" : "partial" };
}

export function buildFactorInputFromSnapshot(snapshot: {
  price?: MarketLivePrice | null;
  profile?: CompanyProfileOverview | null;
  fundamentals?: FundamentalSnapshot | null;
}): Record<string, number | null | undefined> {
  const f = snapshot.fundamentals;
  const p = snapshot.price;
  const pr = snapshot.profile;
  return {
    pe_ratio: f?.peRatio ?? null,
    pb_ratio: f?.pbRatio ?? null,
    return_on_equity: f?.roe ?? null,
    roce: f?.roce ?? null,
    debt_to_equity: f?.debtToEquity ?? null,
    dividend_yield: f?.dividendYield ?? null,
    eps: f?.eps ?? null,
    book_value: f?.bookValue ?? null,
    revenue_growth: f?.salesGrowth ?? null,
    profit_growth: f?.profitGrowth ?? null,
    operating_margin: f?.operatingMargin ?? null,
    net_margin: f?.netMargin ?? null,
    current_ratio: f?.currentRatio ?? null,
    price: p?.price ?? null,
    market_cap: p?.marketCap ?? pr?.marketCap ?? null,
    volume: p?.volume ?? null,
    week_52_high: p?.week52High ?? null,
    week_52_low: p?.week52Low ?? null,
  };
}
