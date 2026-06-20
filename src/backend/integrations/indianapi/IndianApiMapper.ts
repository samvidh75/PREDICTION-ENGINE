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

export function mapToMarketLivePrice(raw: unknown): MarketLivePrice {
  const r = (raw as Record<string, unknown>) ?? {};
  return {
    symbol: safeStr(r.symbol ?? r.name) ?? "",
    price: r.price !== undefined ? safeNum(r.price) : safeNum(r.last_price ?? r.lastPrice ?? r.close),
    previousClose: safeNum(r.previous_close ?? r.previousClose),
    open: safeNum(r.open),
    high: safeNum(r.high),
    low: safeNum(r.low),
    change: safeNum(r.change),
    changePercent: safeNum(r.change_percent ?? r.changePercent ?? r.pChange),
    volume: safeNum(r.volume ?? r.total_traded_volume),
    avgVolume: safeNum(r.avg_volume ?? r.averageVolume),
    week52High: safeNum(r.week_52_high ?? r.week52High ?? r["52_week_high"]),
    week52Low: safeNum(r.week_52_low ?? r.week52Low ?? r["52_week_low"]),
    marketCap: safeNum(r.market_cap ?? r.marketCap),
    tradedValue: safeNum(r.total_traded_value),
    lastTradedAt: safeStr(r.last_traded_at ?? r.lastTradedAt ?? r.last_trade_time),
    exchange: safeStr(r.exchange),
    currency: "INR",
    halted: !!r.halted || !!r.suspended,
    delisted: !!r.delisted,
    dataState: r.price !== undefined || r.last_price !== undefined ? "available" : "partial",
  };
}

export function mapToProfile(raw: unknown): CompanyProfileOverview {
  const r = (raw as Record<string, unknown>) ?? {};
  return {
    symbol: safeStr(r.symbol ?? r.name) ?? "",
    companyName: safeStr(r.company_name ?? r.companyName ?? r.name) ?? "Unidentified security",
    shortName: safeStr(r.short_name ?? r.shortName),
    nseTicker: safeStr(r.nse_ticker ?? r.nseSymbol ?? r.nse_symbol),
    bseCode: safeStr(String(r.bse_code ?? r.bseCode ?? "")),
    isin: safeStr(r.isin),
    sector: safeStr(r.sector),
    industry: safeStr(r.industry),
    description: safeStr(r.description),
    website: safeStr(r.website),
    marketCap: safeNum(r.market_cap ?? r.marketCap),
    listingDate: safeStr(r.listing_date ?? r.listingDate),
    faceValue: safeNum(r.face_value ?? r.faceValue),
    exchange: safeStr(r.exchange),
    dataState: r.company_name || r.name ? "available" : "partial",
  };
}

export function mapToFundamentals(raw: unknown): FundamentalSnapshot {
  const r = (raw as Record<string, unknown>) ?? {};
  return {
    symbol: safeStr(r.symbol ?? r.name) ?? "",
    peRatio: safeNum(r.pe_ratio ?? r.peRatio ?? r.pe),
    pbRatio: safeNum(r.pb_ratio ?? r.pbRatio ?? r.pb),
    roce: safeNum(r.roce),
    roe: safeNum(r.roe),
    debtToEquity: safeNum(r.debt_to_equity ?? r.debtToEquity ?? r["debt/equity"]),
    dividendYield: safeNum(r.dividend_yield ?? r.dividendYield),
    eps: safeNum(r.eps),
    bookValue: safeNum(r.book_value ?? r.bookValue),
    salesGrowth: safeNum(r.sales_growth ?? r.salesGrowth ?? r.revenue_growth),
    profitGrowth: safeNum(r.profit_growth ?? r.profitGrowth),
    operatingMargin: safeNum(r.operating_margin ?? r.operatingMargin),
    netMargin: safeNum(r.net_margin ?? r.netMargin),
    currentRatio: safeNum(r.current_ratio ?? r.currentRatio),
    interestCoverage: safeNum(r.interest_coverage ?? r.interestCoverage),
    dataState: r.pe_ratio || r.roe ? "available" : "partial",
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
