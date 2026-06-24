/**
 * populate-real-universe.ts — TRACK-19
 * 
 * First production-grade real-data population pipeline.
 * Replaces expand-market-coverage.ts (synthetic).
 * 
 * For each symbol in MasterCompanyRegistry:
 *   1. Fetch financials via ProviderCoordinator (Upstox → Screener → Yahoo)
 *   2. Fetch historical prices via ProviderCoordinator.getHistory()
 *   3. Compute technical features via FeatureEngine
 *   4. Compute factor scores via FactorEngine
 *   5. Run validation checks
 * 
 * ZERO synthetic data. ZERO Math.random().
 * All data comes from real provider APIs.
 */

import pool from "../db/index";
import { MasterCompanyRegistry, type RegistryEntry } from "../services/data/MasterCompanyRegistry";
import { ProviderCoordinator } from "../services/providers/ProviderCoordinator";
import { FeatureEngine } from "../services/FeatureEngine";
import { FactorEngine } from "../services/FactorEngine";
import { NightlyPopulationOrchestrator } from "./NightlyPopulationOrchestrator";

// ── Rate limiter helpers ───────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Progress tracker ───────────────────────────────────────────────
interface Progress {
  total: number;
  completed: number;
  failed: number;
  startTime: number;
  symbolTimes: number[];
}

const progress: Progress = {
  total: 0,
  completed: 0,
  failed: 0,
  startTime: Date.now(),
  symbolTimes: [],
};

function logProgress(symbol: string, status: 'done' | 'fail' | 'skip', duration: number, reason?: string): void {
  if (status === 'done') {
    progress.completed++;
    progress.symbolTimes.push(duration);
  } else if (status === 'fail') {
    progress.failed++;
  }

  const elapsed = (Date.now() - progress.startTime) / 1000;
  const avgTime = progress.symbolTimes.length > 0
    ? progress.symbolTimes.reduce((a, b) => a + b, 0) / progress.symbolTimes.length
    : 0;
  const remaining = progress.total - progress.completed - progress.failed;
  const eta = remaining * avgTime;
  const pct = ((progress.completed + progress.failed) / progress.total * 100).toFixed(0);

  const line = `[${pct}%] ${symbol}: ${status} (${duration.toFixed(1)}s) | ${progress.completed} done, ${progress.failed} failed, ${remaining} left | elapsed ${elapsed.toFixed(0)}s, ETA ${eta.toFixed(0)}s`;
  
  if (reason) {
    console.info(`${line} — ${reason}`);
  } else {
    console.info(line);
  }
}

// ── Validation result ──────────────────────────────────────────────
interface SymbolResult {
  symbol: string;
  companyName: string;
  sector: string;
  status: 'success' | 'failure';
  steps: {
    metadata: boolean;
    financials: boolean;
    dailyPrices: boolean;
    features: boolean;
    factors: boolean;
  };
  error?: string;
  duration: number;
}

const results: SymbolResult[] = [];

// ── Main pipeline ──────────────────────────────────────────────────
async function populateSymbol(
  entry: RegistryEntry,
  coordinator: ProviderCoordinator,
  featureEngine: FeatureEngine,
  factorEngine: FactorEngine
): Promise<SymbolResult> {
  const sym = entry.symbol.toUpperCase().trim();
  const startTime = Date.now();
  const result: SymbolResult = {
    symbol: sym,
    companyName: entry.companyName,
    sector: entry.sector,
    status: 'failure',
    steps: {
      metadata: false,
      financials: false,
      dailyPrices: false,
      features: false,
      factors: false,
    },
    duration: 0,
  };

  try {
    // Step 1: Insert symbol metadata (if not already present)
    const existing = await pool.query(
      `SELECT symbol FROM symbols WHERE symbol = $1`,
      [sym]
    );
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO symbols (symbol, exchange, isin, company_name, sector, industry, listing_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (symbol) DO UPDATE
         SET company_name = $4, sector = $5, industry = $6, listing_status = $7`,
        [
          sym,
          entry.exchange || 'NSE',
          entry.isin || null,
          entry.companyName,
          entry.sector,
          entry.industry,
          'Active'
        ]
      );
    }
    result.steps.metadata = true;

    // Step 2: Fetch financials through ProviderCoordinator
    let financialsFetched = false;
    try {
      const finSnapshot = await coordinator.getFinancials(sym);
      if (finSnapshot && Object.keys(finSnapshot).length > 3) {
        // Persist to financial_snapshots
        const periodEnd = (finSnapshot as any).periodEnd || new Date().toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO financial_snapshots (
             symbol, period_end,
             market_cap, pe_ratio, eps, dividend_yield, beta, free_float,
             fcf_yield, ev_ebitda, roa, roe, roic,
             debt_to_equity, current_ratio,
             revenue_growth, profit_growth, eps_growth, fcf_growth,
             gross_margin, operating_margin, pb_ratio
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
           ON CONFLICT (symbol, period_end) DO UPDATE SET
             market_cap = COALESCE($3, financial_snapshots.market_cap),
             pe_ratio = COALESCE($4, financial_snapshots.pe_ratio),
             eps = COALESCE($5, financial_snapshots.eps),
             dividend_yield = COALESCE($6, financial_snapshots.dividend_yield),
             beta = COALESCE($7, financial_snapshots.beta),
             free_float = COALESCE($8, financial_snapshots.free_float),
             fcf_yield = COALESCE($9, financial_snapshots.fcf_yield),
             ev_ebitda = COALESCE($10, financial_snapshots.ev_ebitda),
             roa = COALESCE($11, financial_snapshots.roa),
             roe = COALESCE($12, financial_snapshots.roe),
             roic = COALESCE($13, financial_snapshots.roic),
             debt_to_equity = COALESCE($14, financial_snapshots.debt_to_equity),
             current_ratio = COALESCE($15, financial_snapshots.current_ratio),
             revenue_growth = COALESCE($16, financial_snapshots.revenue_growth),
             profit_growth = COALESCE($17, financial_snapshots.profit_growth),
             eps_growth = COALESCE($18, financial_snapshots.eps_growth),
             fcf_growth = COALESCE($19, financial_snapshots.fcf_growth),
             gross_margin = COALESCE($20, financial_snapshots.gross_margin),
             operating_margin = COALESCE($21, financial_snapshots.operating_margin),
             pb_ratio = COALESCE($22, financial_snapshots.pb_ratio)`,
          [
            sym, periodEnd,
            (finSnapshot as any).marketCap ?? null,
            (finSnapshot as any).peRatio ?? null,
            (finSnapshot as any).eps ?? null,
            (finSnapshot as any).dividendYield ?? null,
            (finSnapshot as any).beta ?? null,
            (finSnapshot as any).freeFloat ?? null,
            (finSnapshot as any).fcfYield ?? null,
            (finSnapshot as any).evEbitda ?? null,
            (finSnapshot as any).roa ?? null,
            (finSnapshot as any).roe ?? null,
            (finSnapshot as any).roic ?? null,
            (finSnapshot as any).debtToEquity ?? null,
            (finSnapshot as any).currentRatio ?? null,
            (finSnapshot as any).revenueGrowth ?? null,
            (finSnapshot as any).profitGrowth ?? null,
            (finSnapshot as any).epsGrowth ?? null,
            (finSnapshot as any).fcfGrowth ?? null,
            (finSnapshot as any).grossMargin ?? null,
            (finSnapshot as any).operatingMargin ?? null,
            (finSnapshot as any).pbRatio ?? null,
          ]
        );
        financialsFetched = true;
        result.steps.financials = true;
      }
    } catch (finErr: any) {
      console.warn(`  ⚠️ Financial fetch failed for ${sym}: ${finErr.message?.substring(0, 80)}`);
    }

    // Step 3: Fetch historical candles
    let pricesFetched = false;
    try {
      const history = await coordinator.getHistory(sym, "2Y");
      if (history && history.length > 20) {
        // Persist daily_prices
        const chunkSize = 100;
        for (let i = 0; i < history.length; i += chunkSize) {
          const chunk = history.slice(i, i + chunkSize);
          if (chunk.length === 0) continue;
          
          const values: any[] = [];
          const placeholders: string[] = [];
          chunk.forEach((point, idx) => {
            const offset = idx * 8;
            values.push(
              sym,
              point.date,
              point.open,
              point.high,
              point.low,
              point.close,
              point.adjustedClose ?? point.close,
              point.volume
            );
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
          });

          const queryStr = `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
                            VALUES ${placeholders.join(', ')}
                            ON CONFLICT (symbol, trade_date) DO NOTHING`;
          await pool.query(queryStr, values);
        }
        pricesFetched = true;
        result.steps.dailyPrices = true;
      }
    } catch (priceErr: any) {
      console.warn(`  ⚠️ Price history fetch failed for ${sym}: ${priceErr.message?.substring(0, 80)}`);
    }

    // Step 4: Execute FeatureEngine (requires daily_prices in DB)
    let featuresDone = false;
    if (pricesFetched) {
      try {
        await featureEngine.calculateAndStoreFeatures(sym);
        featuresDone = true;
        result.steps.features = true;
      } catch (featErr: any) {
        console.warn(`  ⚠️ Feature computation failed for ${sym}: ${featErr.message?.substring(0, 80)}`);
      }
    }

    // Step 5: Execute FactorEngine (requires features + financials in DB)
    let factorsDone = false;
    if (featuresDone && financialsFetched) {
      try {
        await factorEngine.calculateAndStoreFactors(sym);
        factorsDone = true;
        result.steps.factors = true;
      } catch (factErr: any) {
        console.warn(`  ⚠️ Factor computation failed for ${sym}: ${factErr.message?.substring(0, 80)}`);
      }
    }

    // Determine final status
    const essentialSteps = result.steps.financials && result.steps.features && result.steps.factors;
    result.status = essentialSteps ? 'success' : 'failure';
    if (!essentialSteps) {
      const missing: string[] = [];
      if (!result.steps.financials) missing.push('financials');
      if (!result.steps.features) missing.push('features');
      if (!result.steps.factors) missing.push('factors');
      if (!result.steps.dailyPrices) missing.push('daily-prices');
      result.error = `Missing: ${missing.join(', ')}`;
    }

    result.duration = (Date.now() - startTime) / 1000;
    return result;

  } catch (err: any) {
    result.status = 'failure';
    result.error = err.message?.substring(0, 200) || String(err);
    result.duration = (Date.now() - startTime) / 1000;
    return result;
  }
}

// ── Main entry point ───────────────────────────────────────────────
async function main(): Promise<void> {
  console.info('=== TRACK-19: Real Data Universe Builder ===\n');
  
  // Validate database connection
  try {
    await pool.query('SELECT 1');
    console.info('✅ Database connected');
  } catch (err: any) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Ensure PostgreSQL is running and DATABASE_URL is set.');
    process.exit(1);
  }

  const registry = MasterCompanyRegistry.getInstance();
  const allEntries = registry.getAllEntries();
  console.info(`✅ MasterCompanyRegistry: ${allEntries.length} verified companies\n`);

  // Priority: NIFTY 50 heavyweights first (sorted by market cap)
  const entries = [...allEntries].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
  progress.total = entries.length;

  const coordinator = new ProviderCoordinator();
  const featureEngine = new FeatureEngine();
  const factorEngine = new FactorEngine();

  console.info(`Starting pipeline for ${entries.length} symbols...\n`);

  // Process sequentially to respect API rate limits
  // Upstox: ~20 req/min → 3s delay between symbols
  // Screener: cautious scraping → same delay
  // Yahoo: generous limits → well within range
  const RATE_LIMIT_DELAY_MS = 4000; // 4 seconds between symbols

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const symbol = entry.symbol;

    const result = await populateSymbol(entry, coordinator, featureEngine, factorEngine);
    results.push(result);
    
    logProgress(symbol, result.status === 'success' ? 'done' : 'fail', result.duration, result.error);

    // Rate limit pause (except after the last symbol)
    if (i < entries.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // ── TRACK-25A: Invoke NightlyPopulationOrchestrator for advanced stages ──
  console.info(`\n=== Invoking NightlyPopulationOrchestrator (TTM + Derived + Quality + Confidence + Anomaly) ===`);
  const successfulSymbols = results.filter(r => r.status === 'success').map(r => r.symbol);
  if (successfulSymbols.length > 0) {
    try {
      const orchestrator = new NightlyPopulationOrchestrator({ batchSize: 5, cooldownMs: 1000 });
      const orchResult = await orchestrator.run(successfulSymbols);
      console.info(`Orchestrator result: ${orchResult.symbolsSucceeded}/${orchResult.symbolsProcessed} succeeded`);
    } catch (orchErr: any) {
      console.warn(`Orchestrator run failed (non-fatal): ${orchErr.message}`);
    }
  } else {
    console.info('No successful symbols — skipping orchestrator stages.');
  }

  // ── Summary ───────────────────────────────────────────────────
  const totalTime = (Date.now() - progress.startTime) / 1000;
  const succeeded = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failure');

  console.info(`\n=== Pipeline Complete ===`);
  console.info(`⏱ Total time: ${totalTime.toFixed(0)}s (${(totalTime / 60).toFixed(1)} min)`);
  console.info(`✅ Succeeded: ${succeeded.length}/${entries.length}`);
  console.info(`❌ Failed: ${failed.length}/${entries.length}`);

  // Per-step coverage
  const finCoverage = results.filter(r => r.steps.financials).length;
  const priceCoverage = results.filter(r => r.steps.dailyPrices).length;
  const featCoverage = results.filter(r => r.steps.features).length;
  const factCoverage = results.filter(r => r.steps.factors).length;

  console.info(`\n📊 Step Coverage:`);
  console.info(`  Financial snapshots: ${finCoverage}/${entries.length} (${(finCoverage / entries.length * 100).toFixed(0)}%)`);
  console.info(`  Daily prices: ${priceCoverage}/${entries.length} (${(priceCoverage / entries.length * 100).toFixed(0)}%)`);
  console.info(`  Feature snapshots: ${featCoverage}/${entries.length} (${(featCoverage / entries.length * 100).toFixed(0)}%)`);
  console.info(`  Factor snapshots: ${factCoverage}/${entries.length} (${(factCoverage / entries.length * 100).toFixed(0)}%)`);

  // Average runtime per symbol
  const avgTime = results.length > 0
    ? results.reduce((a, b) => a + b.duration, 0) / results.length
    : 0;
  console.info(`\n⏱ Average time per symbol: ${avgTime.toFixed(1)}s`);

  // Write failure report
  if (failed.length > 0) {
    console.info(`\n❌ Failures:`);
    for (const f of failed) {
      console.info(`  ${f.symbol}: ${f.error || 'unknown error'}`);
    }
  }

  // Write summary to reports
  const fs = await import('fs');
  const path = await import('path');
  const reportsDir = path.join(process.cwd(), 'reports', 'track-19');
  fs.mkdirSync(reportsDir, { recursive: true });

  // PopulationCoverage.md
  let coverageMd = `# Population Coverage — TRACK-19\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  coverageMd += `## Pipeline Results\n\n`;
  coverageMd += `| Metric | Count | % |\n| --- | --- | --- |\n`;
  coverageMd += `| Total symbols | ${entries.length} | 100% |\n`;
  coverageMd += `| Completed successfully | ${succeeded.length} | ${(succeeded.length / entries.length * 100).toFixed(0)}% |\n`;
  coverageMd += `| Failed | ${failed.length} | ${(failed.length / entries.length * 100).toFixed(0)}% |\n`;
  coverageMd += `| Financial snapshots | ${finCoverage} | ${(finCoverage / entries.length * 100).toFixed(0)}% |\n`;
  coverageMd += `| Daily prices | ${priceCoverage} | ${(priceCoverage / entries.length * 100).toFixed(0)}% |\n`;
  coverageMd += `| Feature snapshots | ${featCoverage} | ${(featCoverage / entries.length * 100).toFixed(0)}% |\n`;
  coverageMd += `| Factor snapshots | ${factCoverage} | ${(factCoverage / entries.length * 100).toFixed(0)}% |\n`;
  coverageMd += `\n## Timing\n\n`;
  coverageMd += `- Total: ${totalTime.toFixed(0)}s\n`;
  coverageMd += `- Average per symbol: ${avgTime.toFixed(1)}s\n`;
  coverageMd += `- Rate limit delay: ${RATE_LIMIT_DELAY_MS}ms between symbols\n`;

  fs.writeFileSync(path.join(reportsDir, 'PopulationCoverage.md'), coverageMd, 'utf8');

  // ProviderCoverage.md
  let providerMd = `# Provider Coverage — TRACK-19\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  providerMd += `## Provider Chain\n\n`;
  providerMd += `- **Tier 1:** UpstoxFundamentalsProvider → primary financials (roa, roe, roic, pe, pb, evEbitda, debtToEquity)\n`;
  providerMd += `- **Tier 2:** ScreenerProvider → enrichment (revenueGrowth, profitGrowth, operatingMargin, currentRatio, dividendYield)\n`;
  providerMd += `- **Tier 3:** YahooProvider → fallback (eps, beta, fcfYield, grossMargin)\n`;
  providerMd += `- **History:** YahooProvider → daily OHLCV (2-year range)\n`;
  providerMd += `\n## Provider Trace\n\n`;
  providerMd += `Provider calls were made through ProviderCoordinator. Financial merge logic prevents overwriting Tier 1 values with lower-tier data.\n`;
  providerMd += `\n## Rate Limits Respected\n\n`;
  providerMd += `- Upstox: 20 req/min → ${RATE_LIMIT_DELAY_MS / 1000}s delay between symbols\n`;
  providerMd += `- Screener: conservative scraping pace\n`;
  providerMd += `- Yahoo: ~2000 req/hr → well within limits\n`;

  fs.writeFileSync(path.join(reportsDir, 'ProviderCoverage.md'), providerMd, 'utf8');

  // FailureAudit.md
  let failureMd = `# Failure Audit — TRACK-19\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  failureMd += `## Failed Symbols\n\n`;
  if (failed.length === 0) {
    failureMd += `✅ No failures. All ${entries.length} symbols completed successfully.\n`;
  } else {
    failureMd += `| Symbol | Company | Sector | Error | Steps Completed |\n`;
    failureMd += `| --- | --- | --- | --- | --- |\n`;
    for (const f of failed) {
      const stepsDone = Object.entries(f.steps).filter(([, v]) => v).map(([k]) => k).join(', ');
      failureMd += `| ${f.symbol} | ${f.companyName} | ${f.sector} | ${f.error || 'unknown'} | ${stepsDone} |\n`;
    }
  }

  fs.writeFileSync(path.join(reportsDir, 'FailureAudit.md'), failureMd, 'utf8');

  // FinalVerdict.md
  let verdictMd = `# Final Verdict — TRACK-19\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  verdictMd += `## Does StockStory Now Have Its First Real-Data Ranking Universe?\n\n`;
  if (factCoverage >= entries.length * 0.5) {
    verdictMd += `✅ **YES** — ${factCoverage}/${entries.length} (${(factCoverage / entries.length * 100).toFixed(0)}%) symbols have complete factor snapshots generated from real provider data.\n\n`;
    verdictMd += `This is the first time StockStory has a ranking universe built entirely from:\n`;
    verdictMd += `- Real financials (Upstox + Screener + Yahoo)\n`;
    verdictMd += `- Real price history (Yahoo)\n`;
    verdictMd += `- Real technical indicators (computed from real prices)\n`;
    verdictMd += `- Real factor scores (computed from real financials + features)\n\n`;
    verdictMd += `**Zero synthetic data. Zero Math.random().**\n`;
    verdictMd += `\n## Next Steps\n\n`;
    verdictMd += `1. Run \`calibrate.ts\` to generate real-data EngineCalibrationReport\n`;
    verdictMd += `2. Run TRACK-13 to audit real-world score distributions\n`;
    verdictMd += `3. Run TRACK-14 to validate: "Does StockStory rank good businesses above bad businesses?" — against REAL data\n`;
  } else {
    verdictMd += `⚠️ **PARTIALLY** — ${factCoverage}/${entries.length} symbols have factor data. Need at least 50% coverage for meaningful calibration.\n`;
    verdictMd += `\n## Failures\n\n`;
    for (const f of failed) {
      verdictMd += `- ${f.symbol}: ${f.error || 'unknown'}\n`;
    }
  }

  fs.writeFileSync(path.join(reportsDir, 'FinalVerdict.md'), verdictMd, 'utf8');

  console.info(`\n📄 Reports written to ${reportsDir}`);

  await pool.end();
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
