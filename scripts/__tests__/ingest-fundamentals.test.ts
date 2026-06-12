import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  finiteOrNull,
  normalizeFinnhubSnapshot,
  normalizeYFinanceSnapshot,
  normalizeSymbols,
  parseArgs,
  runFundamentalsIngestion,
  validateSnapshot,
  type CliOptions,
} from "../ingest-fundamentals";

function makeFinancial(overrides: Record<string, unknown> = {}) {
  return {
    symbol: "RELIANCE",
    periodEnd: "2026-03-31",
    marketCap: "1000000",
    peRatio: "25.5",
    pbRatio: "3.1",
    eps: "42",
    roe: "18",
    debtToEquity: "0.4",
    revenueGrowth: "12",
    profitGrowth: "9",
    operatingMargin: "22",
    netMargin: "11",
    ...overrides,
  };
}

function makeDb(kind: "sqlite" | "postgres" = "sqlite") {
  const state = {
    symbols: new Map<string, { sector: string | null; industry: string | null }>([
      ["RELIANCE", { sector: "Energy", industry: "Oil & Gas" }],
      ["TCS", { sector: null, industry: null }],
      ["INFY", { sector: "", industry: "" }],
    ]),
    financialSnapshots: [] as Record<string, unknown>[],
    ingestionRuns: [] as Record<string, unknown>[],
    completeness: [] as Record<string, unknown>[],
    lineage: [] as Record<string, unknown>[],
    updates: [] as Record<string, unknown>[],
  };
  const columns: Record<string, string[]> = {
    financial_snapshots: ["symbol", "period_end", "snapshot_date", "market_cap", "pe_ratio", "pb_ratio", "eps", "roe", "debt_to_equity", "revenue_growth", "profit_growth", "operating_margin", "net_margin"],
    master_security_registry: ["symbol", "sector", "industry", "last_verified", "data_sources"],
    ingestion_runs: ["id", "provider", "dataset_type", "started_at", "completed_at", "status", "accepted_count", "rejected_count", "error_message"],
    data_completeness_metrics: ["id", "run_id", "symbol", "dataset_type", "completeness_score", "available_fields", "missing_fields", "as_of", "created_at"],
    prediction_input_lineage: ["id", "prediction_run_id", "symbol", "metric", "source_table", "source_field", "source_name", "source_url", "as_of", "retrieved_at", "freshness_days", "availability", "is_fallback", "is_synthetic", "rejection_reason"],
  };
  const db = {
    kind,
    state,
    async initialize() {},
    async query(sql: string, params: unknown[] = []) {
      if (sql.startsWith("PRAGMA table_info")) {
        const table = sql.match(/PRAGMA table_info\(([^)]+)\)/)?.[1] ?? "";
        return { rows: (columns[table] ?? []).map((name) => ({ name })), rowCount: columns[table]?.length ?? 0 };
      }
      if (sql.includes("information_schema.columns")) {
        const table = String(params[0]);
        return { rows: (columns[table] ?? []).map((column_name) => ({ column_name })), rowCount: columns[table]?.length ?? 0 };
      }
      if (sql.includes("FROM master_security_registry") && sql.includes("SELECT sector")) {
        const row = state.symbols.get(String(params[0]));
        return { rows: row ? [{ sector: row.sector, industry: row.industry }] : [], rowCount: row ? 1 : 0 };
      }
      if (sql.includes("INSERT") && sql.includes("financial_snapshots")) {
        state.financialSnapshots.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO ingestion_runs")) {
        state.ingestionRuns.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("UPDATE ingestion_runs")) {
        state.ingestionRuns.push({ sql, params, update: true });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO data_completeness_metrics")) {
        state.completeness.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO prediction_input_lineage")) {
        state.lineage.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("UPDATE master_security_registry")) {
        state.updates.push({ sql, params });
        const symbol = String(params[params.length - 1]);
        state.symbols.set(symbol, { sector: String(params[0]), industry: params[1] == null ? null : String(params[1]) });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("MAX(id)") && sql.includes("data_completeness_metrics")) {
        return { rows: [{ max_id: state.completeness.length }], rowCount: 1 };
      }
      if (sql.includes("MAX(id)") && sql.includes("prediction_input_lineage")) {
        return { rows: [{ max_id: state.lineage.length }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return db;
}

function provider(financials: Record<string, unknown> | Error = makeFinancial()) {
  return {
    calls: [] as string[],
    async getFinancials(symbol: string) {
      this.calls.push(symbol);
      if (financials instanceof Error) throw financials;
      return { ...financials, symbol };
    },
    async getMetadata(symbol: string) {
      return { symbol, companyName: symbol, sector: symbol === "TCS" ? "Technology" : "", industry: "IT Services", exchange: "NSE" };
    },
  };
}

const baseOptions: CliOptions = { provider: "finnhub", symbols: ["RELIANCE"], mode: "dry-run", concurrency: 1 };

beforeEach(() => {
  process.env.FINNHUB_KEY = "test-key";
  delete process.env.FINNHUB_API_KEY;
  delete process.env.CONFIRM_F1_FUNDAMENTALS_APPLY;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.FINNHUB_KEY;
  delete process.env.FINNHUB_API_KEY;
  delete process.env.CONFIRM_F1_FUNDAMENTALS_APPLY;
});

describe("ingest-fundamentals", () => {
  it("missing --provider fails clearly", async () => {
    await expect(runFundamentalsIngestion({ ...baseOptions, provider: undefined }, { db: makeDb(), provider: provider() })).rejects.toThrow("Missing --provider");
  });

  it("unsupported provider fails clearly", async () => {
    await expect(runFundamentalsIngestion({ ...baseOptions, provider: "screener" }, { db: makeDb(), provider: provider() })).rejects.toThrow("Unsupported provider screener");
  });

  it("missing Finnhub API key fails clearly", async () => {
    delete process.env.FINNHUB_KEY;
    await expect(runFundamentalsIngestion(baseOptions, { db: makeDb(), provider: provider() })).rejects.toThrow("Finnhub API key is required. Set FINNHUB_KEY or FINNHUB_API_KEY.");
  });

  it("explicit yfinance provider does not require a Finnhub API key", async () => {
    delete process.env.FINNHUB_KEY;
    const report = await runFundamentalsIngestion({ ...baseOptions, provider: "yfinance" }, { db: makeDb(), provider: provider(), sleep: async () => {} });
    expect(report.provider).toBe("yfinance");
    expect(report.symbolsAccepted).toBe(1);
  });

  it("--symbols normalizes and deduplicates symbols", () => {
    expect(normalizeSymbols([" reliance ", "RELIANCE", "tcs"])).toEqual(["RELIANCE", "TCS"]);
  });

  it("empty symbol list fails", async () => {
    await expect(runFundamentalsIngestion({ ...baseOptions, symbols: [] }, { db: makeDb(), provider: provider() })).rejects.toThrow("Symbol list is empty");
  });

  it("universe=nifty50 resolves from existing canonical source", async () => {
    const p = provider();
    const report = await runFundamentalsIngestion({ provider: "finnhub", universe: "nifty50", mode: "dry-run", concurrency: 5 }, { db: makeDb(), provider: p, sleep: async () => {} });
    expect(report.symbolsRequested).toBeGreaterThanOrEqual(50);
  });

  it("provider numeric strings normalize into finite numbers", () => {
    const snapshot = normalizeFinnhubSnapshot("RELIANCE", makeFinancial());
    expect(snapshot.peRatio).toBe(25.5);
    expect(snapshot.marketCap).toBe(1000000);
  });

  it("missing provider fields remain null", () => {
    const snapshot = normalizeFinnhubSnapshot("RELIANCE", makeFinancial({ pbRatio: undefined }));
    expect(snapshot.pbRatio).toBeNull();
  });

  it("NaN, Infinity, and empty strings normalize to null", () => {
    expect(finiteOrNull("")).toBeNull();
    expect(finiteOrNull(Number.NaN)).toBeNull();
    expect(finiteOrNull(Infinity)).toBeNull();
  });

  it("yfinance decimal ratios normalize into percentage fields", () => {
    const snapshot = normalizeYFinanceSnapshot("RELIANCE", {
      symbol: "RELIANCE.NS",
      marketCap: "1000000",
      trailingPE: "25",
      priceToBook: "3",
      trailingEps: "40",
      returnOnEquity: 0.18,
      debtToEquity: 40,
      revenueGrowth: 0.12,
      earningsGrowth: 0.09,
      operatingMargins: 0.22,
      profitMargins: 0.11,
    });
    expect(snapshot.roe).toBe(18);
    expect(snapshot.debtToEquity).toBe(0.4);
    expect(snapshot.revenueGrowth).toBe(12);
    expect(snapshot.netMargin).toBe(11);
  });

  it("completeness score is calculated correctly", () => {
    const snapshot = normalizeFinnhubSnapshot("RELIANCE", makeFinancial({ pbRatio: undefined, netMargin: undefined }));
    expect(snapshot.completenessScore).toBe(80);
  });

  it("partial snapshots remain partial", async () => {
    const report = await runFundamentalsIngestion(baseOptions, { db: makeDb(), provider: provider({ symbol: "RELIANCE", periodEnd: "2026-03-31", peRatio: 20, eps: 4 }), sleep: async () => {} });
    expect(report.symbolsPartial).toBe(1);
    expect(report.symbolsAccepted).toBe(0);
  });

  it("all-null snapshots are rejected", () => {
    const snapshot = normalizeFinnhubSnapshot("RELIANCE", { symbol: "RELIANCE", periodEnd: "2026-03-31" });
    expect(validateSnapshot(snapshot)).toContain("all tracked fundamentals are null");
  });

  it("dry-run performs no database mutations", async () => {
    const db = makeDb();
    await runFundamentalsIngestion(baseOptions, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.financialSnapshots).toHaveLength(0);
    expect(db.state.ingestionRuns).toHaveLength(0);
  });

  it("apply mode fails without confirmation", async () => {
    await expect(runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db: makeDb(), provider: provider() })).rejects.toThrow("CONFIRM_F1_FUNDAMENTALS_APPLY=true");
  });

  it("apply mode writes financial_snapshots", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.financialSnapshots).toHaveLength(1);
  });

  it("apply mode writes ingestion_runs", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.ingestionRuns.length).toBeGreaterThanOrEqual(2);
  });

  it("apply mode writes data_completeness_metrics", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.completeness).toHaveLength(1);
  });

  it("apply mode writes field-level lineage", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.lineage).toHaveLength(10);
  });

  it("sector backfill does not overwrite an existing populated sector", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.updates).toHaveLength(0);
  });

  it("token-bearing URLs are never persisted", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(JSON.stringify(db.state.lineage)).not.toContain("token=");
    expect(JSON.stringify(db.state.lineage)).not.toContain("test-key");
  });

  it("API keys are never printed in reports", async () => {
    const report = await runFundamentalsIngestion(baseOptions, { db: makeDb(), provider: provider(), sleep: async () => {} });
    expect(JSON.stringify(report)).not.toContain("test-key");
  });

  it("yfinance lineage is labelled without token-bearing URLs", async () => {
    delete process.env.FINNHUB_KEY;
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb();
    await runFundamentalsIngestion({ ...baseOptions, provider: "yfinance", mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(JSON.stringify(db.state.lineage)).toContain("yfinance");
    expect(JSON.stringify(db.state.lineage)).not.toContain("token=");
    expect(JSON.stringify(db.state.ingestionRuns)).toContain("yfinance");
  });

  it("one symbol failure does not abort a valid multi-symbol batch", async () => {
    const p = {
      async getFinancials(symbol: string) {
        if (symbol === "BAD") throw new Error("provider exploded");
        return makeFinancial({ symbol });
      },
      async getMetadata(symbol: string) {
        return { symbol, companyName: symbol, sector: "", industry: "", exchange: "NSE" };
      },
    };
    const report = await runFundamentalsIngestion({ ...baseOptions, symbols: ["RELIANCE", "BAD"] }, { db: makeDb(), provider: p, sleep: async () => {} });
    expect(report.symbolsAccepted).toBe(1);
    expect(report.symbolsRejected).toBe(1);
  });

  it("concurrency above 5 is rejected", () => {
    expect(() => parseArgs(["--provider=finnhub", "--symbols=RELIANCE", "--concurrency=6"])).toThrow("Concurrency must be an integer between 1 and 5.");
  });

  it("PostgreSQL SQL path is portable", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb("postgres");
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.financialSnapshots[0].sql).not.toContain("::");
  });

  it("SQLite SQL path is portable", async () => {
    process.env.CONFIRM_F1_FUNDAMENTALS_APPLY = "true";
    const db = makeDb("sqlite");
    await runFundamentalsIngestion({ ...baseOptions, mode: "apply" }, { db, provider: provider(), sleep: async () => {} });
    expect(db.state.financialSnapshots[0].sql).toContain("INSERT OR REPLACE");
  });
});
