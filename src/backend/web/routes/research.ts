import type { FastifyPluginAsync } from "fastify";
import { query } from "../../../db/index";
import { MarketDataGateway } from "../../../services/data/MarketDataGateway";
import { buildCompanyResearch } from "../../../research/engine/companyResearchEngine";
import { runScanner, SCANNER_PRESETS, type ScannerPreset } from "../../../research/scanner/scannerEngine";
import { compareCompanies, type CompareInput } from "../../../research/compare/compareEngine";
import { trackThesis } from "../../../research/watchlist/watchlistEngine";
import { monitorPortfolio } from "../../../research/portfolio/portfolioEngine";
import { generateAlerts } from "../../../research/alerts/alertsEngine";
import type { NormalizedFundamentals, NormalizedCandle } from "../../../research/normalization/types";
import type { ThesisStatus, RiskLevel } from "../../../research/contracts/productContracts";

function normaliseSymbol(raw: string): string {
  return raw.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}

function parseFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function productSafeJson(data: unknown): string {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value;
  });
}

function productSafeParse<T>(data: string): T {
  return JSON.parse(data) as T;
}

export const researchRoutes: FastifyPluginAsync = async (app) => {
  // ── Existing: fundamentals-coverage ──────────────────────────────────
  app.get("/api/research/fundamentals-coverage", async (req, reply) => {
    try {
      const allSymbolsRes = await query(`SELECT symbol FROM symbols ORDER BY symbol`);
      const allSymbols: string[] = (allSymbolsRes.rows || []).map((r: any) => r.symbol);

      const fsSymbolsRes = await query(
        `SELECT DISTINCT symbol FROM financial_snapshots WHERE source_label IS NOT NULL ORDER BY symbol`
      );
      const fsSymbols = new Set((fsSymbolsRes.rows || []).map((r: any) => r.symbol));

      const covered = allSymbols.filter((s) => fsSymbols.has(s));
      const missing = allSymbols.filter((s) => !fsSymbols.has(s));

      const latestPerSymbol = await query(
        `SELECT symbol, MAX(snapshot_date) as latest_date, MAX(ingestion_timestamp) as latest_ingestion
         FROM financial_snapshots WHERE source_label IS NOT NULL GROUP BY symbol ORDER BY symbol`
      );

      return reply.send({
        total: allSymbols.length,
        covered: covered.length,
        missing: missing.length,
        coveredSymbols: covered,
        missingSymbols: missing,
        latestSnapshots: (latestPerSymbol.rows || []).reduce((acc: any, r: any) => {
          acc[r.symbol] = { latestDate: r.latest_date, latestIngestion: r.latest_ingestion };
          return acc;
        }, {}),
      });
    } catch (err: any) {
      return reply.send({ total: 0, covered: 0, missing: 0, coveredSymbols: [], missingSymbols: [], error: err.message });
    }
  });

  // ── Existing: lineage ────────────────────────────────────────────────
  app.get("/api/research/lineage/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.status(400).send({ error: "A valid symbol is required.", code: "INVALID_SYMBOL" });
    }

    const sym = normaliseSymbol(symbol);

    try {
      const lineageRes = await query(
        `SELECT metric, source_table, source_field, source_name, source_url,
                as_of, retrieved_at, freshness_days, availability,
                is_fallback, is_synthetic, rejection_reason
         FROM prediction_input_lineage
         WHERE symbol = $1
         ORDER BY metric`,
        [sym]
      );
      const lineageRows: any[] = lineageRes.rows || [];

      const fsRes = await query(
        `SELECT source_label, source_url, ingestion_timestamp, snapshot_date
         FROM financial_snapshots
         WHERE symbol = $1 AND source_label IS NOT NULL
         ORDER BY snapshot_date DESC LIMIT 1`,
        [sym]
      );
      const fsRows: any[] = fsRes.rows || [];

      const dpRes = await query(
        `SELECT COUNT(*) as cnt, MAX(trade_date) as latest_date
         FROM daily_prices WHERE symbol = $1`,
        [sym]
      );
      const dpRow = dpRes.rows?.[0] || null;

      if (lineageRows.length === 0 && fsRows.length === 0) {
        return reply.send({
          symbol: sym, entries: [], modelRun: null, completeness: null,
          entryCount: 0, featureLineageCount: 0, factorLineageCount: 0,
          fundamentalsLineageCount: 0, priceCoverage: null,
          message: `No lineage records found for ${sym}.`,
        });
      }

      const entries = lineageRows.map((r: any) => ({
        sourceTable: r.source_table,
        sourceField: r.metric || r.source_field,
        provider: r.source_name,
        asOf: r.as_of,
        retrievedAt: r.retrieved_at,
        isFallback: !!r.is_fallback,
        isSynthetic: false,
        notes: r.availability === "unavailable" ? "Unavailable" : r.rejection_reason || undefined,
      }));

      fsRows.forEach((r: any) => {
        entries.push({
          sourceTable: "financial_snapshots",
          sourceField: r.source_label,
          provider: r.source_label,
          asOf: r.ingestion_timestamp || r.snapshot_date,
          retrievedAt: r.ingestion_timestamp,
          isFallback: false,
          isSynthetic: false,
          notes: undefined,
        });
      });

      const priceCoverage = dpRow ? { rowCount: Number(dpRow.cnt), latestDate: dpRow.latest_date } : null;

      return reply.send({
        symbol: sym, entries, modelRun: null, completeness: null,
        entryCount: entries.length, featureLineageCount: 0, factorLineageCount: 0,
        fundamentalsLineageCount: fsRows.length, priceCoverage,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message, code: "LINEAGE_QUERY_FAILED" });
    }
  });

  // ── Phase 4: Company Research API ──────────────────────────────────
  app.get("/api/research/company/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({
        code: "INVALID_SYMBOL",
        message: "A valid symbol is required.",
      });
    }

    try {
      const [metaRes, fsRes, dpRes, quote] = await Promise.all([
        MarketDataGateway.getCompany(sym).catch(() => null),
        query(
          `SELECT symbol, snapshot_date, pe_ratio, pb_ratio, roe, roa, roce AS roic,
                  operating_margin, NULL AS net_margin, revenue_growth,
                  eps_growth, debt_to_equity, current_ratio, beta,
                  fcf_yield, ev_ebitda, market_cap, profit_growth,
                  gross_margin, book_value, eps, dividend_yield,
                  sales, net_profit, operating_profit, total_assets,
                  total_debt, equity, cash_flow, free_cash_flow
           FROM financial_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           ORDER BY snapshot_date DESC LIMIT 1`,
          [sym]
        ),
        query(
          `SELECT trade_date, close, high, low, volume
           FROM daily_prices
           WHERE symbol = $1
           ORDER BY trade_date DESC LIMIT 252`,
          [sym]
        ),
        MarketDataGateway.getQuote(sym).catch(() => null),
      ]);

      const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
      const dpRows = (dpRes.rows || []) as Record<string, unknown>[];

      const fundamentals: NormalizedFundamentals | null = fsRow ? {
        symbol: sym,
        peRatio: parseFinite(fsRow.pe_ratio),
        pbRatio: parseFinite(fsRow.pb_ratio),
        evEbitda: parseFinite(fsRow.ev_ebitda),
        dividendYield: parseFinite(fsRow.dividend_yield),
        eps: parseFinite(fsRow.eps),
        bookValue: parseFinite(fsRow.book_value),
        roe: parseFinite(fsRow.roe),
        roa: parseFinite(fsRow.roa),
        roic: parseFinite(fsRow.roic),
        debtToEquity: parseFinite(fsRow.debt_to_equity),
        currentRatio: parseFinite(fsRow.current_ratio),
        grossMargin: parseFinite(fsRow.gross_margin),
        operatingMargin: parseFinite(fsRow.operating_margin),
        netMargin: parseFinite(fsRow.net_margin),
        revenueGrowth: parseFinite(fsRow.revenue_growth),
        profitGrowth: parseFinite(fsRow.profit_growth),
        epsGrowth: parseFinite(fsRow.eps_growth),
        sales: parseFinite(fsRow.sales),
        netProfit: parseFinite(fsRow.net_profit),
        operatingProfit: parseFinite(fsRow.operating_profit),
        totalAssets: parseFinite(fsRow.total_assets),
        totalDebt: parseFinite(fsRow.total_debt),
        equity: parseFinite(fsRow.equity),
        cashFlow: parseFinite(fsRow.cash_flow),
        freeCashFlow: parseFinite(fsRow.free_cash_flow),
        timestamp: fsRow.snapshot_date ? String(fsRow.snapshot_date) : "",
        sourceSuccess: true,
      } : null;

      const candles: NormalizedCandle[] = dpRows.map((r) => ({
        date: String(r.trade_date),
        close: parseFinite(r.close) ?? 0,
        high: parseFinite(r.high),
        low: parseFinite(r.low),
        open: null,
        volume: parseFinite(r.volume),
      })).filter((c) => c.close > 0).reverse();

      const companyName = (metaRes && typeof metaRes === "object" && "companyName" in metaRes)
        ? String((metaRes as any).companyName) : sym;
      const sector = (metaRes && typeof metaRes === "object" && "sector" in metaRes)
        ? String((metaRes as any).sector) : null;
      const industry = (metaRes && typeof metaRes === "object" && "industry" in metaRes)
        ? String((metaRes as any).industry) : null;
      const beta = parseFinite(fsRow?.beta) ?? null;

      const quoteData = quote && typeof quote === "object" ? {
        lastPrice: parseFinite((quote as any).price),
        change: parseFinite((quote as any).change),
        changePercent: parseFinite((quote as any).changePercent),
        open: parseFinite((quote as any).open),
        high: parseFinite((quote as any).high),
        low: parseFinite((quote as any).low),
        close: parseFinite((quote as any).close ?? (quote as any).price),
        volume: parseFinite((quote as any).volume),
        marketCap: fundamentals?.peRatio !== null && fundamentals?.sales !== null
          ? parseFinite(fsRow?.market_cap) : null,
        week52High: null,
        week52Low: null,
      } : null;

      const result = buildCompanyResearch({
        symbol: sym, companyName, sector, industry,
        fundamentals, quote: quoteData, candles,
        relativeStrength: null, beta,
        priorThesisStatus: null,
      });

      const safe = productSafeParse<typeof result>(productSafeJson(result));

      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "company research failed");
      return reply.status(502).send({
        code: "RESEARCH_UNAVAILABLE",
        message: "Research data is temporarily unavailable. Try again later.",
      });
    }
  });

  // ── Phase 5: Scanner/Rankings API ─────────────────────────────────
  app.get("/api/research/scanner", async (req, reply) => {
    const queryParams = req.query as Record<string, string>;
    const preset = (queryParams.preset || "Quality compounders") as ScannerPreset;
    const limit = Math.min(parseInt(queryParams.limit || "50", 10), 200);
    const symbolsParam = queryParams.symbols;

    if (!SCANNER_PRESETS[preset]) {
      return reply.status(400).send({
        code: "INVALID_PRESET",
        message: `Unknown preset: ${preset}. Available: ${Object.keys(SCANNER_PRESETS).join(", ")}`,
      });
    }

    try {
      let targetSymbols: string[] = [];

      if (symbolsParam) {
        targetSymbols = symbolsParam.split(",").map((s: string) => normaliseSymbol(s)).filter(Boolean);
      } else {
        const topRes = await query(
          `SELECT symbol FROM prediction_registry
           WHERE ranking_score IS NOT NULL
           ORDER BY ranking_score DESC LIMIT $1`,
          [limit]
        );
        targetSymbols = ((topRes.rows || []) as any[]).map((r: any) => r.symbol);
      }

      if (targetSymbols.length === 0) {
        return reply.send({ ok: true, data: [], preset, message: "No symbols available for scanning." });
      }

      const companies = await Promise.all(targetSymbols.slice(0, limit).map(async (sym) => {
        try {
          const [fsRes, metaRes] = await Promise.all([
            query(
              `SELECT pe_ratio, pb_ratio, roe, roa, roce AS roic,
                      debt_to_equity, current_ratio, gross_margin,
                      operating_margin, revenue_growth, profit_growth,
                      eps_growth, beta, sales, net_profit
               FROM financial_snapshots
               WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
               ORDER BY snapshot_date DESC LIMIT 1`,
              [sym]
            ),
            MarketDataGateway.getCompany(sym).catch(() => null),
          ]);

          const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
          const companyName = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).companyName || sym) : sym;
          const sector = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).sector || "") : "";

          if (!fsRow) {
            return { symbol: sym, companyName, sector: sector || null,
              scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
          }

          const roe = parseFinite(fsRow.roe);
          const roa = parseFinite(fsRow.roa);
          const de = parseFinite(fsRow.debt_to_equity);
          const cr = parseFinite(fsRow.current_ratio);
          const gm = parseFinite(fsRow.gross_margin);
          const om = parseFinite(fsRow.operating_margin);
          const rg = parseFinite(fsRow.revenue_growth);
          const pg = parseFinite(fsRow.profit_growth);
          const pe = parseFinite(fsRow.pe_ratio);
          const pb = parseFinite(fsRow.pb_ratio);
          const ev = parseFinite(fsRow.ev_ebitda);

          let qualityScore: number | null = null;
          if (roe !== null || gm !== null || om !== null) {
            let scores = 0; let count = 0;
            if (roe !== null) { scores += roe >= 15 ? 75 : roe >= 10 ? 55 : roe >= 0 ? 40 : 15; count++; }
            if (gm !== null) { scores += gm >= 40 ? 75 : gm >= 20 ? 55 : 30; count++; }
            if (om !== null) { scores += om >= 15 ? 75 : om >= 8 ? 55 : 30; count++; }
            if (cr !== null) { scores += cr >= 1.5 ? 70 : cr >= 1 ? 50 : 25; count++; }
            if (de !== null) { scores += de <= 0.5 ? 80 : de <= 1 ? 60 : de <= 2 ? 40 : 20; count++; }
            qualityScore = count > 0 ? Math.round(scores / count) : null;
          }

          let valuationScore: number | null = null;
          if (pe !== null || pb !== null || ev !== null) {
            let scores = 0; let count = 0;
            if (pe !== null && pe > 0) { scores += pe <= 20 ? 75 : pe <= 35 ? 55 : pe <= 50 ? 35 : 20; count++; }
            if (pb !== null && pb > 0) { scores += pb <= 2 ? 75 : pb <= 4 ? 55 : pb <= 7 ? 35 : 20; count++; }
            valuationScore = count > 0 ? Math.round(scores / count) : null;
          }

          let growthScore: number | null = null;
          if (rg !== null || pg !== null) {
            let scores = 0; let count = 0;
            if (rg !== null) { scores += rg >= 15 ? 75 : rg >= 8 ? 55 : rg >= 0 ? 35 : 15; count++; }
            if (pg !== null) { scores += pg >= 15 ? 75 : pg >= 8 ? 55 : pg >= 0 ? 35 : 15; count++; }
            growthScore = count > 0 ? Math.round(scores / count) : null;
          }

          let riskScore: number | null = null;
          if (de !== null) {
            riskScore = de <= 0.5 ? 75 : de <= 1 ? 55 : de <= 2 ? 35 : 15;
          }

          return {
            symbol: sym, companyName, sector: sector || null,
            scores: { quality: qualityScore, valuation: valuationScore, growth: growthScore,
              risk: riskScore, momentum: null, stability: null },
          };
        } catch {
          return { symbol: sym, companyName: sym, sector: null,
            scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
        }
      }));

      const results = runScanner(preset, companies);
      const safe = productSafeParse<typeof results>(productSafeJson(results));

      return reply.send({ ok: true, data: safe, preset });
    } catch (err: any) {
      req.log.error({ err, preset }, "scanner failed");
      return reply.status(502).send({
        code: "SCANNER_UNAVAILABLE",
        message: "Scanner is temporarily unavailable. Try again later.",
      });
    }
  });

  // ── Phase 6: Compare API ──────────────────────────────────────────
  app.post("/api/research/compare", async (req, reply) => {
    const body = req.body as { symbols: string[] } | null;
    if (!body || !body.symbols || !Array.isArray(body.symbols) || body.symbols.length < 2) {
      return reply.status(400).send({
        code: "INVALID_INPUT",
        message: "Provide at least two symbols to compare.",
      });
    }

    const symbols = body.symbols.map((s: string) => normaliseSymbol(s)).filter(Boolean);
    if (symbols.length < 2) {
      return reply.status(400).send({
        code: "INVALID_SYMBOLS",
        message: "Provide at least two valid symbols to compare.",
      });
    }

    try {
      const inputs = await Promise.all(symbols.map(async (sym) => {
        try {
          const [fsRes, metaRes] = await Promise.all([
            query(
              `SELECT pe_ratio, pb_ratio, roe, roa, roce AS roic,
                      debt_to_equity, current_ratio, gross_margin,
                      operating_margin, revenue_growth, profit_growth,
                      eps_growth, beta, sales, net_profit
               FROM financial_snapshots
               WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
               ORDER BY snapshot_date DESC LIMIT 1`,
              [sym]
            ),
            MarketDataGateway.getCompany(sym).catch(() => null),
          ]);

          const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
          const companyName = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).companyName || sym) : sym;

          if (!fsRow) {
            return { symbol: sym, companyName,
              scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
          }

          const roe = parseFinite(fsRow.roe);
          const de = parseFinite(fsRow.debt_to_equity);
          const gm = parseFinite(fsRow.gross_margin);
          const om = parseFinite(fsRow.operating_margin);
          const rg = parseFinite(fsRow.revenue_growth);
          const pg = parseFinite(fsRow.profit_growth);
          const pe = parseFinite(fsRow.pe_ratio);
          const pb = parseFinite(fsRow.pb_ratio);

          let qualityScore: number | null = null;
          if (roe !== null || gm !== null || om !== null) {
            let s = 0; let c = 0;
            if (roe !== null) { s += roe >= 15 ? 75 : roe >= 10 ? 55 : roe >= 0 ? 40 : 15; c++; }
            if (gm !== null) { s += gm >= 40 ? 75 : gm >= 20 ? 55 : 30; c++; }
            qualityScore = c > 0 ? Math.round(s / c) : null;
          }

          let valuationScore: number | null = null;
          if (pe !== null && pe > 0) {
            valuationScore = pe <= 20 ? 75 : pe <= 35 ? 55 : pe <= 50 ? 35 : 20;
          }

          let growthScore: number | null = null;
          if (rg !== null || pg !== null) {
            let s = 0; let c = 0;
            if (rg !== null) { s += rg >= 15 ? 75 : rg >= 8 ? 55 : rg >= 0 ? 35 : 15; c++; }
            if (pg !== null) { s += pg >= 15 ? 75 : pg >= 8 ? 55 : pg >= 0 ? 35 : 15; c++; }
            growthScore = c > 0 ? Math.round(s / c) : null;
          }

          let riskScore: number | null = null;
          if (de !== null) {
            riskScore = de <= 0.5 ? 75 : de <= 1 ? 55 : de <= 2 ? 35 : 15;
          }

          return { symbol: sym, companyName,
            scores: { quality: qualityScore, valuation: valuationScore, growth: growthScore,
              risk: riskScore, momentum: null, stability: null } };
        } catch {
          return { symbol: sym, companyName: sym,
            scores: { quality: null, valuation: null, growth: null, risk: null, momentum: null, stability: null } };
        }
      }));

      const result = compareCompanies(inputs as CompareInput[]);
      const safe = productSafeParse<typeof result>(productSafeJson(result));

      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbols }, "compare failed");
      return reply.status(502).send({
        code: "COMPARE_UNAVAILABLE",
        message: "Compare is temporarily unavailable. Try again later.",
      });
    }
  });

  // ── Phase 7: Watchlist Thesis Tracking API ────────────────────────
  app.get("/api/research/watchlist/:symbol/thesis", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({ code: "INVALID_SYMBOL", message: "A valid symbol is required." });
    }

    try {
      const prRes = await query(
        `SELECT ranking_score FROM prediction_registry
         WHERE symbol = $1 AND ranking_score IS NOT NULL
         ORDER BY prediction_date DESC LIMIT 1`,
        [sym]
      );
      const prRow = (prRes.rows?.[0] || null) as { ranking_score: number } | null;
      const currentScore = prRow ? parseFinite(prRow.ranking_score) : null;

      const metaRes = await MarketDataGateway.getCompany(sym).catch(() => null);
      const companyName = metaRes && typeof metaRes === "object"
        ? String((metaRes as any).companyName || sym) : sym;

      const result = trackThesis({
        symbol: sym, companyName,
        currentScore,
        previousScore: null,
        factorChanges: [],
        riskChanges: [],
        lastUpdated: null,
      });

      const safe = productSafeParse<typeof result>(productSafeJson(result));
      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "watchlist thesis failed");
      return reply.status(502).send({
        code: "THESIS_UNAVAILABLE",
        message: "Thesis data is temporarily unavailable.",
      });
    }
  });

  // ── Phase 8: Portfolio Thesis Monitor API ─────────────────────────
  app.post("/api/research/portfolio", async (req, reply) => {
    const body = req.body as { holdings?: Array<{ symbol: string; companyName?: string }> } | null;
    const holdings = body?.holdings;

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return reply.send({
        ok: true, data: { holdings: [], reviewPriority: [], summary: "Monitor companies after you decide to track an investment thesis." },
      });
    }

    try {
      const enriched = await Promise.all(holdings.slice(0, 20).map(async (h) => {
        const sym = normaliseSymbol(h.symbol);
        if (!sym) return null;

        try {
          const [fsRes, prRes, metaRes] = await Promise.all([
            query(
              `SELECT pe_ratio, pb_ratio, roe, debt_to_equity,
                      gross_margin, revenue_growth, profit_growth
               FROM financial_snapshots
               WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
               ORDER BY snapshot_date DESC LIMIT 1`, [sym]
            ),
            query(
              `SELECT ranking_score FROM prediction_registry
               WHERE symbol = $1 AND ranking_score IS NOT NULL
               ORDER BY prediction_date DESC LIMIT 1`, [sym]
            ),
            MarketDataGateway.getCompany(sym).catch(() => null),
          ]);

          const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
          const prRow = (prRes.rows?.[0] || null) as { ranking_score: number } | null;
          const companyName = metaRes && typeof metaRes === "object"
            ? String((metaRes as any).companyName || sym) : (h.companyName || sym);
          const score = prRow ? parseFinite(prRow.ranking_score) : null;

          let conviction = "Research signals pending";
          if (score !== null) {
            conviction = score >= 75 ? "High conviction"
              : score >= 55 ? "Moderate conviction"
              : score >= 35 ? "Needs review" : "Track before investing";
          }

          const flags: string[] = [];
          if (fsRow) {
            const de = parseFinite(fsRow.debt_to_equity);
            if (de !== null && de > 2) flags.push("High leverage");
            if (parseFinite(fsRow.profit_growth) !== null && (parseFinite(fsRow.profit_growth) ?? 0) < 0) flags.push("Profit declining");
          }

          return {
            symbol: sym, companyName, currentScore: score,
            thesisStatus: score !== null ? "active" : "pending",
            conviction,
            keyRisks: flags,
            keyStrengths: [],
            whatToWatch: score !== null && score < 55 ? ["Monitor quarterly results"] : [],
          };
        } catch {
          return {
            symbol: sym, companyName: h.companyName || sym,
            currentScore: null, thesisStatus: "pending",
            conviction: "Research signals pending",
            keyRisks: [], keyStrengths: [], whatToWatch: [],
          };
        }
      }));

      const validHoldings = enriched.filter((h): h is NonNullable<typeof h> => h !== null);
      const result = monitorPortfolio(validHoldings);
      const safe = productSafeParse<typeof result>(productSafeJson(result));

      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err }, "portfolio monitor failed");
      return reply.status(502).send({
        code: "PORTFOLIO_UNAVAILABLE",
        message: "Portfolio monitor is temporarily unavailable.",
      });
    }
  });

  // ── Phase 9: Alerts / What Changed API ────────────────────────────
  app.get("/api/research/alerts/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({ code: "INVALID_SYMBOL", message: "A valid symbol is required." });
    }

    try {
      const prRes = await query(
        `SELECT ranking_score, prediction_date FROM prediction_registry
         WHERE symbol = $1 AND ranking_score IS NOT NULL
         ORDER BY prediction_date DESC LIMIT 2`,
        [sym]
      );
      const prRows = (prRes.rows || []) as Array<{ ranking_score: number; prediction_date: string }>;

      const [quote, metaRes] = await Promise.all([
        MarketDataGateway.getQuote(sym).catch(() => null),
        MarketDataGateway.getCompany(sym).catch(() => null),
      ]);

      const companyName = metaRes && typeof metaRes === "object"
        ? String((metaRes as any).companyName || sym) : sym;

      let scoreChange: number | null = null;
      if (prRows.length >= 2) {
        scoreChange = parseFinite(prRows[0].ranking_score) !== null && parseFinite(prRows[1].ranking_score) !== null
          ? (parseFinite(prRows[0].ranking_score) ?? 0) - (parseFinite(prRows[1].ranking_score) ?? 0) : null;
      }

      const priceChange = quote && typeof quote === "object"
        ? parseFinite((quote as any).changePercent) : null;

      const alerts = generateAlerts({
        symbol: sym,
        previousThesisStatus: null,
        currentThesisStatus: "Tracking begins now",
        previousRiskLevel: null,
        currentRiskLevel: "Insufficient data",
        scoreChange,
        priceChangePercent: priceChange,
        peerBecameMoreAttractive: false,
        hasResultEvent: false,
      });

      const safe = productSafeParse<typeof alerts>(productSafeJson(alerts));
      return reply.send({ ok: true, data: safe, symbol: sym, companyName });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "alerts failed");
      return reply.status(502).send({
        code: "ALERTS_UNAVAILABLE",
        message: "Alerts data is temporarily unavailable.",
      });
    }
  });

  // ── Phase 10: Invest Review Context API ───────────────────────────
  app.get("/api/research/invest/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const sym = normaliseSymbol(symbol);

    if (!sym) {
      return reply.status(400).send({ code: "INVALID_SYMBOL", message: "A valid symbol is required." });
    }

    try {
      const [metaRes, fsRes, prRes] = await Promise.all([
        MarketDataGateway.getCompany(sym).catch(() => null),
        query(
          `SELECT pe_ratio, pb_ratio, roe, roa, roce AS roic,
                  debt_to_equity, current_ratio, gross_margin,
                  operating_margin, revenue_growth, profit_growth,
                  eps_growth, beta, sales, net_profit
           FROM financial_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           ORDER BY snapshot_date DESC LIMIT 1`, [sym]
        ),
        query(
          `SELECT ranking_score FROM prediction_registry
           WHERE symbol = $1 AND ranking_score IS NOT NULL
           ORDER BY prediction_date DESC LIMIT 1`, [sym]
        ),
      ]);

      const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
      const prRow = (prRes.rows?.[0] || null) as { ranking_score: number } | null;
      const companyName = metaRes && typeof metaRes === "object"
        ? String((metaRes as any).companyName || sym) : sym;
      const score = prRow ? parseFinite(prRow.ranking_score) : null;

      let conviction = "Research signals pending";
      if (score !== null) {
        conviction = score >= 75 ? "High conviction research case"
          : score >= 55 ? "Moderate conviction"
          : score >= 35 ? "Needs review" : "Track before investing";
      }

      const risks: string[] = [];
      const strengths: string[] = [];
      const watchItems: string[] = [];
      const missingData: string[] = [];

      if (fsRow) {
        const de = parseFinite(fsRow.debt_to_equity);
        const rg = parseFinite(fsRow.revenue_growth);
        const roe = parseFinite(fsRow.roe);

        if (de !== null && de > 2) risks.push("High leverage");
        if (rg !== null && rg < 0) risks.push("Revenue declining");
        if (roe !== null && roe > 15) strengths.push("Strong return on equity");
        if (rg !== null && rg > 10) strengths.push("Strong revenue growth");
      } else {
        missingData.push("Fundamentals");
      }

      if (score === null) missingData.push("Research score");

      if (risks.length === 0 && strengths.length > 0) {
        watchItems.push("Monitor quarterly results for sustained performance.");
      } else if (risks.length > 0) {
        watchItems.push("Monitor identified risk areas in upcoming results.");
      }
      watchItems.push("Review thesis before making investment decisions.");
      watchItems.push("Final order placement is handled through your broker.");

      const result = {
        symbol: sym, companyName, conviction,
        score, thesis: score !== null
          ? `Research case with ${conviction.toLowerCase()}.`
          : "Research signals pending — track this company to review over time.",
        keyRisks: risks, keyStrengths: strengths,
        whatToWatch: watchItems, missingCriticalData: missingData,
      };

      const safe = productSafeParse<typeof result>(productSafeJson(result));
      return reply.send({ ok: true, data: safe });
    } catch (err: any) {
      req.log.error({ err, symbol: sym }, "invest context failed");
      return reply.status(502).send({
        code: "INVEST_CONTEXT_UNAVAILABLE",
        message: "Investment context is temporarily unavailable. Try again later.",
      });
    }
  });
};

export default researchRoutes;
