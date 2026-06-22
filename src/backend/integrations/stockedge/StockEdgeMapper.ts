import type {
  StockEdgeCanonicalSnapshot,
  StockEdgeCorporateAction,
  StockEdgeFinancialTable,
  StockEdgeFundamentalSnapshot,
  StockEdgeOwnershipSnapshot,
  StockEdgePriceSnapshot,
  StockEdgeProfile,
  StockEdgeScreenerSignal,
  StockEdgeTechnicalSnapshot,
} from "./StockEdgeTypes";

export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9&-]/g, "");
}

export function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[₹,%\s]/g, "").replace(/,/g, "");
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "na") return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = finiteNumber(record[key]);
    if (value != null) return value;
  }
  return undefined;
}

function firstText(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return undefined;
}

export function normalizeFinancialRowKey(label: string): string {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const synonyms: Record<string, string> = {
    sales: "revenue",
    total_income: "revenue",
    revenue_from_operations: "revenue",
    pat: "net_profit",
    profit_after_tax: "net_profit",
    net_profit_after_tax: "net_profit",
    borrowings: "debt",
    total_debt: "debt",
    finance_cost: "interest_expense",
  };
  return synonyms[normalized] ?? normalized;
}

export function mapProfile(symbol: string, payload: unknown): StockEdgeProfile {
  const source = asRecord(payload);
  return {
    symbol: normalizeSymbol(firstText(source, ["symbol", "nseCode", "nse", "ticker"]) ?? symbol),
    companyName: firstText(source, ["companyName", "name", "company", "longName"]),
    sector: firstText(source, ["sector"]),
    industry: firstText(source, ["industry"]),
    isin: firstText(source, ["isin", "ISIN"]),
    nseCode: firstText(source, ["nseCode", "nse", "symbol"]),
    bseCode: firstText(source, ["bseCode", "bse"]),
    marketCapCrore: firstNumber(source, ["marketCapCrore", "marketCap", "mcap"]),
  };
}

export function mapPrice(symbol: string, payload: unknown): StockEdgePriceSnapshot {
  const source = asRecord(payload);
  const price = firstNumber(source, ["price", "ltp", "lastPrice", "close"]);
  const previousClose = firstNumber(source, ["previousClose", "prevClose"]);
  const change = firstNumber(source, ["change", "dayChange"]);
  const changePercent = firstNumber(source, ["changePercent", "pChange", "dayChangePercent"]);
  return {
    symbol: normalizeSymbol(symbol),
    price,
    previousClose,
    change: change ?? (price != null && previousClose != null ? price - previousClose : undefined),
    changePercent:
      changePercent ?? (price != null && previousClose ? ((price - previousClose) / previousClose) * 100 : undefined),
    volume: firstNumber(source, ["volume", "tradedVolume"]),
    deliveryPercent: firstNumber(source, ["deliveryPercent", "delivery"]),
    fiftyTwoWeekHigh: firstNumber(source, ["fiftyTwoWeekHigh", "week52High", "high52"]),
    fiftyTwoWeekLow: firstNumber(source, ["fiftyTwoWeekLow", "week52Low", "low52"]),
    asOf: firstText(source, ["asOf", "updatedAt", "date", "timestamp"]),
  };
}

export function mapTechnicals(symbol: string, payload: unknown): StockEdgeTechnicalSnapshot {
  const source = asRecord(payload);
  return {
    symbol: normalizeSymbol(symbol),
    rsi: firstNumber(source, ["rsi", "RSI"]),
    macd: firstNumber(source, ["macd", "MACD"]),
    macdSignal: firstNumber(source, ["macdSignal", "signal"]),
    sma20: firstNumber(source, ["sma20", "SMA20"]),
    sma50: firstNumber(source, ["sma50", "SMA50"]),
    sma200: firstNumber(source, ["sma200", "SMA200"]),
    ema20: firstNumber(source, ["ema20", "EMA20"]),
    ema50: firstNumber(source, ["ema50", "EMA50"]),
    adx: firstNumber(source, ["adx", "ADX"]),
    atr: firstNumber(source, ["atr", "ATR"]),
    oscillatorSummary: firstText(source, ["oscillatorSummary", "oscillators"]),
    momentumSummary: firstText(source, ["momentumSummary", "momentum"]),
    volumeSummary: firstText(source, ["volumeSummary", "volumeSignal"]),
    asOf: firstText(source, ["asOf", "date", "updatedAt"]),
  };
}

export function mapFundamentals(symbol: string, payload: unknown): StockEdgeFundamentalSnapshot {
  const source = asRecord(payload);
  return {
    symbol: normalizeSymbol(symbol),
    peRatio: firstNumber(source, ["peRatio", "pe", "PE"]),
    pbRatio: firstNumber(source, ["pbRatio", "pb", "PB"]),
    roe: firstNumber(source, ["roe", "ROE"]),
    roce: firstNumber(source, ["roce", "ROCE"]),
    debtToEquity: firstNumber(source, ["debtToEquity", "debt_equity"]),
    dividendYield: firstNumber(source, ["dividendYield", "divYield"]),
    operatingMargin: firstNumber(source, ["operatingMargin", "opm"]),
    netMargin: firstNumber(source, ["netMargin", "npm"]),
    revenueGrowth: firstNumber(source, ["revenueGrowth", "salesGrowth"]),
    profitGrowth: firstNumber(source, ["profitGrowth", "netProfitGrowth"]),
    epsGrowth: firstNumber(source, ["epsGrowth"]),
    asOf: firstText(source, ["asOf", "date", "updatedAt"]),
  };
}

export function mapFinancialTable(symbol: string, statementType: StockEdgeFinancialTable["statementType"], rows: unknown): StockEdgeFinancialTable {
  const rawRows = Array.isArray(rows) ? rows : [];
  return {
    symbol: normalizeSymbol(symbol),
    statementType,
    unit: "crore",
    rows: rawRows.map((row) => {
      const source = asRecord(row);
      const rawLabel = firstText(source, ["label", "name", "lineItem", "item"]) ?? "unknown";
      const periods = asRecord(source.periods ?? source.values ?? {});
      return {
        rawLabel,
        normalizedKey: normalizeFinancialRowKey(rawLabel),
        cells: Object.entries(periods).map(([period, value]) => ({ period, value: finiteNumber(value) ?? null })),
      };
    }),
  };
}

export function mapOwnership(symbol: string, payload: unknown): StockEdgeOwnershipSnapshot[] {
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows.map((row) => {
    const source = asRecord(row);
    return {
      symbol: normalizeSymbol(symbol),
      period: firstText(source, ["period", "date", "quarter"]),
      promoter: firstNumber(source, ["promoter", "promoters"]),
      fii: firstNumber(source, ["fii", "FII"]),
      dii: firstNumber(source, ["dii", "DII"]),
      publicRetail: firstNumber(source, ["publicRetail", "public", "retail"]),
      pledge: firstNumber(source, ["pledge", "pledged"]),
      others: firstNumber(source, ["others"]),
    };
  });
}

export function mapCorporateActions(symbol: string, payload: unknown): StockEdgeCorporateAction[] {
  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((row) => {
    const source = asRecord(row);
    const rawType = (firstText(source, ["type", "action"] ) ?? "other").toLowerCase();
    const allowed = ["dividend", "split", "bonus", "rights", "board_meeting", "results", "announcement"];
    return {
      symbol: normalizeSymbol(symbol),
      type: (allowed.includes(rawType) ? rawType : "other") as StockEdgeCorporateAction["type"],
      date: firstText(source, ["date", "exDate", "recordDate"]),
      description: firstText(source, ["description", "details", "title"]) ?? "Corporate event",
      value: firstText(source, ["value", "amount", "ratio"]),
    };
  });
}

export function mapScreenerSignals(symbol: string, payload: unknown): StockEdgeScreenerSignal[] {
  const rows = Array.isArray(payload) ? payload : [];
  return rows.map((row) => {
    const source = asRecord(row);
    return {
      symbol: normalizeSymbol(symbol),
      category: "other",
      label: firstText(source, ["label", "name", "check"]) ?? "Research check",
      status: "neutral",
      evidence: firstText(source, ["evidence", "description", "value"]),
    };
  });
}

export function mapCanonicalSnapshot(symbol: string, payload: unknown): StockEdgeCanonicalSnapshot {
  const source = asRecord(payload);
  const tables = asRecord(source.financialTables ?? source.financials ?? {});
  return {
    symbol: normalizeSymbol(symbol),
    profile: mapProfile(symbol, source.profile ?? source.overview ?? source),
    price: mapPrice(symbol, source.price ?? source.live ?? {}),
    technicals: mapTechnicals(symbol, source.technicals ?? {}),
    fundamentals: mapFundamentals(symbol, source.fundamentals ?? source.ratios ?? {}),
    financialTables: [
      mapFinancialTable(symbol, "quarterly", tables.quarterly),
      mapFinancialTable(symbol, "profit_loss", tables.profitLoss ?? tables.profit_loss),
      mapFinancialTable(symbol, "balance_sheet", tables.balanceSheet ?? tables.balance_sheet),
      mapFinancialTable(symbol, "cash_flow", tables.cashFlow ?? tables.cash_flow),
    ].filter((table) => table.rows.length > 0),
    ownership: mapOwnership(symbol, source.ownership ?? source.shareholding ?? []),
    corporateActions: mapCorporateActions(symbol, source.corporateActions ?? source.corporate_actions ?? []),
    screenerSignals: mapScreenerSignals(symbol, source.screenerSignals ?? source.checklist ?? []),
    rawStructuralKeys: Object.keys(source).sort(),
    mappedAt: new Date().toISOString(),
  };
}
