/**
 * TRACK-84 Phase 4 — Production Monitoring Endpoint
 * Exposes /api/ops/health with live dashboard metrics.
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { loadEnv } from "../../config/env";
import { query } from "../../../db/index";

interface FreshnessRow extends Record<string, unknown> {
  latest: Date | string | number | null;
}

const opsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const env = loadEnv();

  app.get("/api/ops/health", async (_request, reply) => {
    const metrics: Record<string, any> = {};
    const start = Date.now();

    // Predictions today
    try {
      const today = new Date().toISOString().split("T")[0];
      const predRes = await query(
        "SELECT COUNT(DISTINCT symbol) as symbols, COUNT(*) as total FROM prediction_registry WHERE prediction_date = $1",
        [today]
      );
      metrics.predictions_today = Number(predRes.rows[0]?.total ?? 0);
      metrics.symbols_covered = Number(predRes.rows[0]?.symbols ?? 0);
    } catch {
      metrics.predictions_today = -1;
      metrics.symbols_covered = -1;
    }

    // Hit rate (validated predictions with alpha > 0)
    try {
      const hitRes = await query(
        "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE alpha > 0) as hits FROM prediction_registry WHERE validation_status = 'validated'"
      );
      const total = Number(hitRes.rows[0]?.total ?? 1);
      const hits = Number(hitRes.rows[0]?.hits ?? 0);
      metrics.hit_rate = total > 0 ? ((hits / total) * 100).toFixed(1) + "%" : "N/A";
    } catch {
      metrics.hit_rate = "N/A";
    }

    // Data freshness
    try {
      const freshRes = await query<FreshnessRow>(
        "SELECT MAX(trade_date) as latest FROM daily_prices"
      );
      const latest = freshRes.rows[0]?.latest;
      if (latest !== null && latest !== undefined) {
        const latestDate = new Date(latest);
        const daysAgo = Math.floor((Date.now() - latestDate.getTime()) / 86400000);
        metrics.pipeline_freshness = `${daysAgo}d ago`;
      } else {
        metrics.pipeline_freshness = "never";
      }
    } catch {
      metrics.pipeline_freshness = "error";
    }

    // Scheduler health
    try {
      const schedRes = await query(
        "SELECT status, phase FROM pipeline_health ORDER BY started_at DESC LIMIT 6"
      );
      const phases = schedRes.rows.map((r: any) => `${r.phase}:${r.status}`);
      metrics.scheduler_health = phases.length > 0 ? phases.join(", ") : "no runs";
    } catch {
      metrics.scheduler_health = "error";
    }

    // DB health
    try {
      await query("SELECT 1");
      metrics.db_health = "connected";
    } catch {
      metrics.db_health = "error";
    }

    // Additional info
    metrics.response_ms = Date.now() - start;
    metrics.environment = env.nodeEnv;
    metrics.uptime_seconds = Math.floor(process.uptime());
    metrics.node_version = process.version;

    return reply.send({
      status: "ok",
      timestamp: new Date().toISOString(),
      metrics,
    });
  });

  app.get("/api/ops/data-coverage", async (_request, reply) => {
    const generatedAt = new Date().toISOString();
    
    // Check DB status
    let dbStatus: "ready" | "unavailable" = "ready";
    let dbError: string | null = null;
    try {
      await query("SELECT 1");
    } catch (err: any) {
      dbStatus = "unavailable";
      dbError = err.message || "database connection failed";
    }

    // Helper to run aggregate queries safely
    const fetchTableStats = async (
      tableName: string,
      dateCol: string,
      isDateUnix: boolean = false
    ) => {
      try {
        const rowRes = await query(`SELECT COUNT(*) as row_count, COUNT(DISTINCT symbol) as symbol_count FROM ${tableName}`);
        const dateRes = await query(`SELECT MAX(${dateCol}) as latest_date FROM ${tableName}`);
        
        let latestDate: string | null = null;
        const rawDate = dateRes.rows[0]?.latest_date;
        if (rawDate !== null && rawDate !== undefined) {
          if (isDateUnix) {
            // Check if unix timestamp (number or string representation of a number)
            const num = Number(rawDate);
            if (!isNaN(num)) {
              // Convert to milliseconds if standard seconds or milliseconds
              const ms = num < 10000000000 ? num * 1000 : num;
              latestDate = new Date(ms).toISOString().split("T")[0];
            } else {
              latestDate = new Date(rawDate).toISOString().split("T")[0];
            }
          } else {
            // Ensure parseable date format
            latestDate = new Date(rawDate).toISOString().split("T")[0];
          }
        }

        return {
          rowCount: Number(rowRes.rows[0]?.row_count ?? 0),
          symbolCount: Number(rowRes.rows[0]?.symbol_count ?? 0),
          latestSnapshotDate: latestDate,
          status: "available"
        };
      } catch (err: any) {
        return {
          rowCount: 0,
          symbolCount: 0,
          latestSnapshotDate: null,
          status: "unavailable"
        };
      }
    };

    // Symbols is slightly different structure
    let symbolsCount = 0;
    let symbolsLatest: string | null = null;
    let symbolsStatus = "available";
    try {
      const symRes = await query("SELECT COUNT(*) as count FROM symbols");
      symbolsCount = Number(symRes.rows[0]?.count ?? 0);
      
      // Look in predictions for latest update or default to current date
      const latestRes = await query("SELECT MAX(prediction_date) as max_date FROM prediction_registry");
      symbolsLatest = latestRes.rows[0]?.max_date ? new Date(latestRes.rows[0]?.max_date).toISOString().split("T")[0] : null;
    } catch {
      symbolsStatus = "unavailable";
    }

    // Run table queries
    const dailyPrices = await fetchTableStats("daily_prices", "trade_date");
    const financialSnapshots = await fetchTableStats("financial_snapshots", "snapshot_date", true);
    const featureSnapshots = await fetchTableStats("feature_snapshots", "trade_date");
    const factorSnapshots = await fetchTableStats("factor_snapshots", "trade_date");
    const predictionRegistry = await fetchTableStats("prediction_registry", "prediction_date");

    const providers = {
      FINNHUB_KEY: env.finnhubKey ? "present (removed from active pipeline)" : "missing (deprecated)",
      INDIANAPI_KEY: env.indianApiKey ? "present" : "missing",
      UPSTOX_ACCESS_TOKEN: process.env.UPSTOX_ACCESS_TOKEN ? "present" : "missing",
      UPSTOX_API_KEY: process.env.UPSTOX_API_KEY ? "present" : "missing",
      UPSTOX_CLIENT_SECRET: process.env.UPSTOX_CLIENT_SECRET ? "present" : "missing",
      REDIS_URL: process.env.REDIS_URL ? "present" : "missing",
      UPSTOX_REDIRECT_URI: process.env.UPSTOX_REDIRECT_URI ? "present" : "missing",
      UPSTOX_NOTIFIER_SECRET: process.env.UPSTOX_NOTIFIER_SECRET ? "present" : "missing",
    };

    return reply.send({
      ok: true,
      generatedAt,
      database: {
        status: dbStatus,
        migrationsReady: dbStatus === "ready",
        error: dbError
      },
      coverage: {
        symbols: {
          count: symbolsCount,
          latestUpdatedAt: symbolsLatest,
          status: symbolsStatus
        },
        dailyPrices: {
          rowCount: dailyPrices.rowCount,
          symbolCount: dailyPrices.symbolCount,
          latestPriceDate: dailyPrices.latestSnapshotDate,
          status: dailyPrices.status
        },
        financialSnapshots: {
          rowCount: financialSnapshots.rowCount,
          symbolCount: financialSnapshots.symbolCount,
          latestSnapshotDate: financialSnapshots.latestSnapshotDate,
          status: financialSnapshots.status
        },
        featureSnapshots: {
          rowCount: featureSnapshots.rowCount,
          symbolCount: featureSnapshots.symbolCount,
          latestSnapshotDate: featureSnapshots.latestSnapshotDate,
          status: featureSnapshots.status
        },
        factorSnapshots: {
          rowCount: factorSnapshots.rowCount,
          symbolCount: factorSnapshots.symbolCount,
          latestSnapshotDate: factorSnapshots.latestSnapshotDate,
          status: factorSnapshots.status
        },
        predictionRegistry: {
          rowCount: predictionRegistry.rowCount,
          symbolCount: predictionRegistry.symbolCount,
          latestPredictionDate: predictionRegistry.latestSnapshotDate,
          status: predictionRegistry.status
        }
      },
      providers
    });
  });

  app.post("/api/ops/ingest-financials", async (request, reply) => {
    const { symbols: rawSymbols, apply: rawApply } = request.query as Record<string, string | undefined>;
    const symbols = (rawSymbols || "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK")
      .split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 10);
    const applyMode = rawApply === "true";
    const results: Array<{ symbol: string; ok: boolean; marketCap: number | null; error: string | null }> = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const symbol of symbols) {
      try {
        const mod = await import("../../../services/providers/IndianMarketProvider.js");
        const indianProvider = new mod.IndianMarketProvider();
        const meta = await indianProvider.getMetadata(symbol);
        const marketCap = meta?.marketCap ?? null;
        if (marketCap !== null && applyMode) {
          await query(
            `INSERT INTO financial_snapshots (symbol, snapshot_date, period_end, market_cap)
             VALUES ($1, $2, $2::DATE, $3)
             ON CONFLICT (symbol, period_end) DO UPDATE SET
               market_cap = COALESCE(EXCLUDED.market_cap, financial_snapshots.market_cap)`,
            [symbol, today, marketCap]
          );
        }
        results.push({ symbol, ok: marketCap !== null, marketCap, error: marketCap === null ? "No market cap available" : null });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ symbol, ok: false, marketCap: null, error: msg });
      }
    }
    return reply.send({
      ok: true,
      mode: applyMode ? "apply" : "dry-run",
      symbols: results.length,
      succeeded: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  });

  app.post("/api/ops/pipeline-run", async (request, reply) => {
    const { apply: rawApply, symbols: rawSymbols, historical: rawHistorical } = request.query as Record<string, string | undefined>;
    const runId = `api-trigger-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const startedAt = new Date().toISOString();
    const applyMode = rawApply === "true";
    const symbols = (rawSymbols || "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK")
      .split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 10);
    const results: Record<string, any> = {};
    const rowsWritten: Record<string, number> = {};
    const providerStatuses = {
      indianapi: process.env.INDIANAPI_KEY ? "present" : "missing",
      upstox: process.env.UPSTOX_ACCESS_TOKEN ? "present" : "missing",
      finnhub: "deprecated-removed",
      redis: process.env.REDIS_URL ? "present" : "missing",
    };

    function finiteNumber(value: unknown): number | null {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function snapshotToDbColumns(snapshot: Record<string, unknown>): Record<string, unknown> {
      return {
        snapshot_date: snapshot.periodEnd,
        period_end: snapshot.periodEnd,
        market_cap: finiteNumber(snapshot.marketCap),
        pe_ratio: finiteNumber(snapshot.peRatio),
        pb_ratio: finiteNumber(snapshot.pbRatio),
        eps: finiteNumber(snapshot.eps),
        dividend_yield: finiteNumber(snapshot.dividendYield),
        beta: finiteNumber(snapshot.beta),
        roe: finiteNumber(snapshot.roe),
        roa: finiteNumber(snapshot.roa),
        roic: finiteNumber(snapshot.roic),
        roce: finiteNumber(snapshot.roic),
        ev_ebitda: finiteNumber(snapshot.evEbitda),
        debt_to_equity: finiteNumber(snapshot.debtToEquity),
        fcf_yield: finiteNumber(snapshot.fcfYield),
        operating_margin: finiteNumber(snapshot.operatingMargin),
        net_margin: finiteNumber(snapshot.netMargin),
        revenue_growth: finiteNumber(snapshot.revenueGrowth),
        profit_growth: finiteNumber(snapshot.profitGrowth),
        eps_growth: finiteNumber(snapshot.epsGrowth),
        fcf_growth: finiteNumber(snapshot.fcfGrowth),
        current_ratio: finiteNumber(snapshot.currentRatio),
        gross_margin: finiteNumber(snapshot.grossMargin),
      };
    }

    let overallStatus: "success" | "partial" | "failure" = "success";
    const overallError: string | null = null;

    try {
      // Stage 0: Historical backfill (if requested)
      if (rawHistorical === "true") {
        results.historical = { status: "running" };
        let histRows = 0;
        for (const symbol of symbols) {
          try {
            const ticker = symbol + ".NS";
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            const resp = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockStoryBot/1.0)' },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!resp.ok) {
              console.error(`Yahoo chart API returned ${resp.status} for ${symbol}`);
              continue;
            }
            const data = await resp.json() as any;
            const result = data?.chart?.result?.[0];
            if (!result) continue;
            const timestamps: number[] = result.timestamp || [];
            const q = result.indicators?.quote?.[0] || {};
            const points = timestamps.map((ts: number, i: number) => ({
              date: new Date(ts * 1000).toISOString().split('T')[0],
              open: q.open?.[i] ?? 0,
              high: q.high?.[i] ?? 0,
              low: q.low?.[i] ?? 0,
              close: q.close?.[i] ?? 0,
              volume: q.volume?.[i] ?? 0,
            })).filter((p: any) => p.close !== null && p.close !== 0);

            if (applyMode) {
              for (const point of points) {
                const volume = point.volume !== null && point.volume !== undefined ? Math.round(Number(point.volume)) : null;
                await query(
                  `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (symbol, trade_date) DO UPDATE SET
                     close = EXCLUDED.close, volume = COALESCE(EXCLUDED.volume, daily_prices.volume)`,
                  [symbol, point.date, point.open, point.high, point.low, point.close, volume]
                );
                histRows++;
              }
            }
            console.log(`Historical backfill for ${symbol}: ${points.length} rows` + (applyMode ? ' written' : ' would write'));
          } catch (err: any) {
            console.error(`Historical backfill failed for ${symbol}: ${err.message}`);
          }
        }
        rowsWritten["daily_prices"] = (rowsWritten["daily_prices"] ?? 0) + histRows;
        results.historical = { status: applyMode ? "success" : "dry-run", rowsWritten: histRows };
      }

      // Stage 1: Registry (verify symbols exist, insert missing in apply mode)
      const registryOk: string[] = [];
      const registryFailed: string[] = [];
      const fallbackNames: Record<string, { name: string; sector: string; industry: string }> = {
        RELIANCE: { name: "Reliance Industries Limited", sector: "Energy & Oil", industry: "Oil & Gas" },
        TCS: { name: "Tata Consultancy Services Limited", sector: "Technology", industry: "IT Services" },
        INFY: { name: "Infosys Limited", sector: "Technology", industry: "IT Services" },
        HDFCBANK: { name: "HDFC Bank Limited", sector: "Financials", industry: "Banking" },
        ICICIBANK: { name: "ICICI Bank Limited", sector: "Financials", industry: "Banking" },
      };

      for (const symbol of symbols) {
        try {
          const existing = await query("SELECT symbol FROM symbols WHERE symbol = $1", [symbol]);
          if (existing.rows.length > 0) {
            registryOk.push(symbol);
            continue;
          }

          if (!applyMode) {
            registryFailed.push(symbol);
            continue;
          }

          // Try to fetch real metadata, otherwise use verified fallback
          let companyName = symbol;
          let sector = "";
          let industry = "";
          try {
            const mod = await import("../../../services/providers/IndianMarketProvider.js");
            const indianProvider = new mod.IndianMarketProvider();
            const meta = await indianProvider.getMetadata(symbol);
            companyName = meta?.companyName || fallbackNames[symbol]?.name || symbol;
            sector = meta?.sector || fallbackNames[symbol]?.sector || "";
            industry = meta?.industry || fallbackNames[symbol]?.industry || "";
          } catch {
            const fallback = fallbackNames[symbol];
            companyName = fallback?.name || symbol;
            sector = fallback?.sector || "";
            industry = fallback?.industry || "";
          }

          await query(
            `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
             VALUES ($1, 'NSE', $2, $3, $4, 'Active')
             ON CONFLICT (symbol) DO UPDATE SET
               company_name = EXCLUDED.company_name,
               sector = COALESCE(NULLIF(EXCLUDED.sector, ''), symbols.sector),
               industry = COALESCE(NULLIF(EXCLUDED.industry, ''), symbols.industry)`,
            [symbol, companyName, sector, industry]
          );
          registryOk.push(symbol);
        } catch (err: any) {
          registryFailed.push(symbol);
        }
      }
      results.registry = {
        status: registryFailed.length > 0 ? (registryOk.length > 0 ? "partial" : "failure") : "success",
        succeeded: registryOk.length,
        failed: registryFailed.length,
      };

      // Stage 2: Quotes
      results.quotes = { status: "running" };
      const imp = await import("../../../services/providers/IndianMarketProvider.js");
      const indianProvider = new imp.IndianMarketProvider();
      const today = new Date().toISOString().slice(0, 10);
      const quoteResults: any[] = [];
      for (const symbol of symbols) {
        try {
          const quote = await indianProvider.getQuote(symbol);
          const ok = quote && quote.price !== undefined && quote.price > 0;
          if (ok && applyMode) {
            await query(
              `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (symbol, trade_date) DO UPDATE SET
                 close = EXCLUDED.close, volume = EXCLUDED.volume`,
              [symbol, today, quote.price, quote.price, quote.price, quote.price, quote.volume !== null && quote.volume !== undefined ? Math.round(Number(quote.volume)) : null]
             );
             rowsWritten["daily_prices"] = (rowsWritten["daily_prices"] ?? 0) + 1;
          }
          quoteResults.push({ symbol, ok, price: ok ? quote.price : null });
        } catch (err: any) {
          quoteResults.push({ symbol, ok: false, error: err.message });
        }
      }
      const quotesSucceeded = quoteResults.filter(r => r.ok).length;
      results.quotes = {
        status: quotesSucceeded === symbols.length ? "success" : (quotesSucceeded > 0 ? "partial" : "failure"),
        succeeded: quotesSucceeded,
        failed: quoteResults.filter(r => !r.ok).length,
        details: quoteResults.map(r => ({ symbol: r.symbol, ok: r.ok, price: r.price, error: r.error })),
      };

      // Stage 3: Financials (only in apply mode to avoid provider calls on dry-run)
      if (applyMode) {
        results.financials = { status: "running" };
        const finResults: any[] = [];
        const coordModule = await import("../../../services/providers/ProviderCoordinator.js");
        const coordinator = new coordModule.ProviderCoordinator();
        for (const symbol of symbols) {
          try {
            const snapshot = await coordinator.getFinancials(symbol);
            const columns = snapshotToDbColumns((snapshot as unknown) as Record<string, unknown>);
            if (!columns.period_end) columns.period_end = today;
            if (!columns.snapshot_date) columns.snapshot_date = today;
            const writable = Object.entries(columns)
              .filter(([key]) => key !== "symbol")
              .filter(([, value]) => value !== null && value !== undefined);

            if (writable.length > 0) {
              const columnNames = ["symbol", ...writable.map(([key]) => key)];
              const values = [symbol, ...writable.map(([, value]) => value)];
              const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
              const updates = columnNames
                .filter(col => col !== "symbol" && col !== "period_end")
                .map(col => `${col} = EXCLUDED.${col}`)
                .join(", ");
              await query(
                `INSERT INTO financial_snapshots (${columnNames.join(", ")}) VALUES (${placeholders})
                 ON CONFLICT (symbol, period_end) DO UPDATE SET ${updates}`,
                values
              );
              rowsWritten["financial_snapshots"] = (rowsWritten["financial_snapshots"] ?? 0) + 1;
            }
            finResults.push({ symbol, ok: true, fields: writable.length });
          } catch (err: any) {
            finResults.push({ symbol, ok: false, error: err.message });
          }
        }
        const finSucceeded = finResults.filter(r => r.ok).length;
        results.financials = {
          status: finSucceeded === symbols.length ? "success" : (finSucceeded > 0 ? "partial" : "failure"),
          succeeded: finSucceeded,
          failed: finResults.filter(r => !r.ok).length,
          details: finResults.map(r => ({ symbol: r.symbol, ok: r.ok, fields: r.fields, error: r.error })),
        };

        // Stage 4: Features
        try {
          const { FeatureEngine } = await import("../../../services/FeatureEngine.js");
          const featureEngine = new FeatureEngine();
          let featureRows = 0;
          for (const symbol of symbols) {
            const snapshots = await featureEngine.calculateAndStoreFeatures(symbol);
            featureRows += snapshots.filter(s => s.rsi !== null && s.macd !== null).length;
            console.log(`  ${symbol}: ${snapshots.length} feature snapshots`);
          }
          rowsWritten["feature_snapshots"] = (rowsWritten["feature_snapshots"] ?? 0) + featureRows;
          results.features = { status: "success", rowsWritten: featureRows };
        } catch (err: any) {
          results.features = { status: "failure", error: err.message };
        }

        // Stage 5: Factors
        try {
          const { FactorEngine } = await import("../../../services/FactorEngine.js");
          const factorEngine = new FactorEngine();
          let factorRows = 0;
          for (const symbol of symbols) {
            const snapshots = await factorEngine.calculateAndStoreFactors(symbol);
            factorRows += snapshots.length;
            console.log(`  ${symbol}: ${snapshots.length} factor snapshots`);
          }
          rowsWritten["factor_snapshots"] = (rowsWritten["factor_snapshots"] ?? 0) + factorRows;
          results.factors = { status: "success", rowsWritten: factorRows };
        } catch (err: any) {
          results.factors = { status: "failure", error: err.message };
        }

        // Stage 6: Predictions
        try {
          const { predictionFactory } = await import("../../../predictions/PredictionFactory.js");
          const predResult = await predictionFactory.generateDaily([30, 90, 365]);
          rowsWritten["prediction_registry"] = (rowsWritten["prediction_registry"] ?? 0) + predResult.created;
          results.predictions = {
            status: predResult.failed > 0 ? (predResult.created > 0 ? "partial" : "failure") : "success",
            created: predResult.created,
            skipped: predResult.skipped,
            failed: predResult.failed,
          };
        } catch (err: any) {
          results.predictions = { status: "failure", error: err.message };
        }

        // Stage 7: Signals
        try {
          const signalRes = await query(
            `SELECT symbol, ranking_score, classification, confidence_score
             FROM prediction_registry WHERE prediction_date = $1 AND prediction_horizon = 30`,
            [today]
          );
          results.signals = { status: "success", count: signalRes.rows.length };
        } catch (err: any) {
          results.signals = { status: "failure", error: err.message };
        }

        // Stage 8: Pipeline health
        const failures = Object.values(results).some((r: any) => r.status === "failure");
        const partials = Object.values(results).some((r: any) => r.status === "partial");
        overallStatus = failures ? "failure" : partials ? "partial" : "success";

        const pipelineId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const completedAt = new Date().toISOString();
        const symbolsFailed = symbols.length - quotesSucceeded;
        const errorClasses: string[] = [];
        const rowsWrittenSummary: Record<string, number> = { ...rowsWritten };

        for (const [stage, r] of Object.entries(results)) {
          if ((r as any).error) errorClasses.push(`${stage}:${String((r as any).error).substring(0, 40)}`);
        }

        try {
          await query(
            `INSERT INTO pipeline_health (
               id, run_id, phase, status, started_at, completed_at,
               symbols_attempted, symbols_succeeded, symbols_failed,
               error_classes, provider_statuses, rows_written, metadata
             )
             VALUES ($1, $2, 'api_pipeline_run', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              pipelineId,
              runId,
              overallStatus,
              startedAt,
              completedAt,
              symbols.length,
              quotesSucceeded,
              symbolsFailed,
              errorClasses,
              JSON.stringify(providerStatuses),
              JSON.stringify(rowsWrittenSummary),
              JSON.stringify({ mode: applyMode ? 'apply' : 'dry-run', version: '1.0' }),
            ]
          );
          results.health = { status: "recorded", overallStatus };
        } catch (err: any) {
          try {
            await query(
              `INSERT INTO pipeline_health (
                 id, run_id, phase, status, started_at, completed_at,
                 symbols_attempted, symbols_succeeded
               )
               VALUES ($1, $2, 'api_pipeline_run', $3, $4, $5, $6, $7)`,
              [
                pipelineId,
                runId,
                overallStatus,
                startedAt,
                completedAt,
                symbols.length,
                quotesSucceeded,
              ]
            );
            results.health = { status: "recorded", overallStatus };
          } catch (err2: any) {
            results.health = { status: "failed", error: err2.message };
          }
        }
      } else {
        results.financials = { status: "skipped", message: "Dry-run: financials stage skipped to avoid provider calls" };
        results.features = { status: "skipped", message: "Dry-run: features stage skipped" };
        results.factors = { status: "skipped", message: "Dry-run: factors stage skipped" };
        results.predictions = { status: "skipped", message: "Dry-run: predictions stage skipped" };
        results.signals = { status: "skipped", message: "Dry-run: signals stage skipped" };
        results.health = { status: "skipped", message: "Dry-run: health row skipped" };
      }

      return reply.send({
        ok: true,
        runId,
        mode: applyMode ? "apply" : "dry-run",
        overallStatus,
        results,
      });
    } catch (err: any) {
      return reply.send({
        ok: false,
        runId,
        overallStatus: "failure",
        error: err.message,
      });
    }
  });

  app.post("/api/ops/ingest-quotes", async (request, reply) => {
    const { symbols: rawSymbols, apply: rawApply } = request.query as Record<string, string | undefined>;
    const symbols = (rawSymbols || "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK")
      .split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 10);
    const applyMode = rawApply === "true";
    const results: Array<{ symbol: string; ok: boolean; price: number | null; error: string | null }> = [];
    const imp2 = await import("../../../services/providers/IndianMarketProvider.js");
    const indianProvider = new imp2.IndianMarketProvider();
    const today = new Date().toISOString().slice(0, 10);
    for (const symbol of symbols) {
      try {
        const quote = await indianProvider.getQuote(symbol);
        const ok = quote && quote.price !== undefined && quote.price > 0;
        if (ok && applyMode) {
          await query(
            `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (symbol, trade_date) DO UPDATE SET
               close = EXCLUDED.close, volume = EXCLUDED.volume`,
            [symbol, today, quote.price, quote.price, quote.price, quote.price, quote.volume !== null && quote.volume !== undefined ? Math.round(Number(quote.volume)) : null]
          );
        }
        results.push({ symbol, ok, price: ok ? quote.price : null, error: ok ? null : "IndianAPI returned no price data" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}${err.cause ? " cause=" + String(err.cause) : ""}` : String(err);
        results.push({ symbol, ok: false, price: null, error: msg });
      }
    }
    return reply.send({
      ok: true,
      mode: applyMode ? "apply" : "dry-run",
      symbols: results.length,
      succeeded: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });
  });
};

export default opsRoutes;
