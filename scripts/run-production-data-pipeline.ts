/**
 * run-production-data-pipeline.ts
 *
 * Single orchestrator for the production data pipeline.
 * Default: dry-run mode, five symbols only.
 *
 * Usage:
 *   npx tsx scripts/run-production-data-pipeline.ts --dry-run
 *   npx tsx scripts/run-production-data-pipeline.ts --symbols=RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK --apply
 */

import pool from '../src/db/index';
import { FeatureEngine } from '../src/services/FeatureEngine';
import { FactorEngine } from '../src/services/FactorEngine';
import { predictionFactory } from '../src/predictions/PredictionFactory';
import { ProviderCoordinator } from '../src/services/providers/ProviderCoordinator';
import { IndianMarketProvider } from '../src/services/providers/IndianMarketProvider';
import { YahooProvider } from '../src/services/providers/YahooProvider';
import type { FinancialSnapshot } from '../src/services/data/types';

const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'];

interface PipelineOptions {
  symbols: string[];
  apply: boolean;
  skipUpstox: boolean;
  skipIndianApi: boolean;
  quotesOnly: boolean;
  historical: boolean;
  financialsOnly: boolean;
  featuresOnly: boolean;
  factorsOnly: boolean;
  predictionsOnly: boolean;
  signalsOnly: boolean;
}

interface StageResult {
  status: 'success' | 'partial' | 'failure' | 'skipped';
  succeeded?: number;
  failed?: number;
  created?: number;
  skipped?: number;
  count?: number;
  rowsWritten?: Record<string, number> | { count: number };
  error?: string;
  message?: string;
  dryRun?: boolean;
  wouldStatus?: string;
  recorded?: boolean;
  overallStatus?: string;
  symbolsWithFactors?: number;
}

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
    const opts: PipelineOptions = {
      symbols: DEFAULT_SYMBOLS,
      apply: false,
      skipUpstox: false,
      skipIndianApi: false,
      quotesOnly: false,
      historical: false,
      financialsOnly: false,
      featuresOnly: false,
      factorsOnly: false,
      predictionsOnly: false,
      signalsOnly: false,
    };

  for (const arg of args) {
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--dry-run') opts.apply = false;
    else if (arg === '--skip-upstox') opts.skipUpstox = true;
    else if (arg === '--skip-indianapi') opts.skipIndianApi = true;
    else if (arg === '--quotes-only') opts.quotesOnly = true;
    else if (arg === '--historical') opts.historical = true;
    else if (arg === '--financials-only') opts.financialsOnly = true;
    else if (arg === '--features-only') opts.featuresOnly = true;
    else if (arg === '--factors-only') opts.factorsOnly = true;
    else if (arg === '--predictions-only') opts.predictionsOnly = true;
    else if (arg === '--signals-only') opts.signalsOnly = true;
    else if (arg.startsWith('--symbols=')) {
      const val = arg.split('=')[1];
      opts.symbols = val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }
  }

  return opts;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function snapshotToDbColumns(snapshot: FinancialSnapshot): Record<string, unknown> {
  return {
    symbol: snapshot.symbol,
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
    roce: finiteNumber(snapshot.roic), // best available proxy
    ev_ebitda: finiteNumber(snapshot.evEbitda),
    debt_to_equity: finiteNumber(snapshot.debtToEquity),
    fcf_yield: finiteNumber(snapshot.fcfYield),
    operating_margin: finiteNumber(snapshot.operatingMargin),
    net_margin: finiteNumber(snapshot.netMargin),
    revenue_growth: finiteNumber(snapshot.revenueGrowth),
    profit_growth: finiteNumber(snapshot.profitGrowth),
    earnings_growth: finiteNumber(snapshot.epsGrowth ?? snapshot.profitGrowth),
    eps_growth: finiteNumber(snapshot.epsGrowth),
    fcf_growth: finiteNumber(snapshot.fcfGrowth),
    current_ratio: finiteNumber(snapshot.currentRatio),
    gross_margin: finiteNumber(snapshot.grossMargin),
    total_assets: finiteNumber(snapshot.totalAssets),
    total_liabilities: finiteNumber(snapshot.totalLiabilities),
    total_equity: finiteNumber(snapshot.totalEquity),
  };
}

class ProductionPipeline {
  private coordinator: ProviderCoordinator;
  private indianProvider: IndianMarketProvider;
  private featureEngine: FeatureEngine;
  private factorEngine: FactorEngine;
  private opts: PipelineOptions;
  private results: Record<string, StageResult> = {};
  private providerStatuses: Record<string, string> = {};
  private rowsWritten: Record<string, number> = {};

  constructor(opts: PipelineOptions) {
    this.opts = opts;
    this.coordinator = new ProviderCoordinator();
    this.indianProvider = new IndianMarketProvider();
    this.featureEngine = new FeatureEngine();
    this.factorEngine = new FactorEngine();
  }

  async run(): Promise<void> {
    const runId = `pipeline-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const startedAt = new Date().toISOString();
    const mode = this.opts.apply ? 'APPLY' : 'DRY-RUN';
    console.log(`Pipeline ${runId} — ${mode}`);
    console.log(`Symbols: ${this.opts.symbols.join(', ')}`);
    console.log('');

    if (!this.opts.apply) {
      console.log('[DRY-RUN] No writes will be performed.');
    }

    let overallStatus: 'success' | 'partial' | 'failure' = 'success';
    let overallError: string | undefined;

    try {
    const runAll = !this.opts.quotesOnly && !this.opts.financialsOnly && !this.opts.featuresOnly &&
      !this.opts.factorsOnly && !this.opts.predictionsOnly && !this.opts.signalsOnly && !this.opts.historical;

      // Stage 1: Historical backfill (if requested)
      if (this.opts.historical) {
        await this.stageHistorical();
      }

      // Stage 2: Registry fix (idempotent)
      if (runAll) {
        await this.stageRegistry();
      }

      // Stage 3: Quotes
      if (runAll || this.opts.quotesOnly || this.opts.historical) {
        await this.stageQuotes();
      }

      // Stage 3: Financials
      if (runAll || this.opts.financialsOnly) {
        await this.stageFinancials();
      }

      // Stage 4: Features
      if (runAll || this.opts.featuresOnly) {
        await this.stageFeatures();
      }

      // Stage 5: Factors
      if (runAll || this.opts.factorsOnly) {
        await this.stageFactors();
      }

      // Stage 6: Predictions
      if (runAll || this.opts.predictionsOnly) {
        await this.stagePredictions();
      }

      // Stage 7: Signals
      if (runAll || this.opts.signalsOnly) {
        await this.stageSignals();
      }

      // Determine overall status
      const failures = Object.values(this.results).some(r => r.status === 'failure');
      const partials = Object.values(this.results).some(r => r.status === 'partial');
      overallStatus = failures ? 'failure' : partials ? 'partial' : 'success';

      // Stage 8: Pipeline health
      await this.stagePipelineHealth({
        runId,
        startedAt,
        status: overallStatus,
        error: overallError,
      });

      console.log('');
      console.log('=== PIPELINE SUMMARY ===');
      for (const [key, val] of Object.entries(this.results)) {
        const summary = `${val.status}${val.succeeded !== undefined ? ` | succeeded=${val.succeeded}` : ''}${val.failed !== undefined ? ` | failed=${val.failed}` : ''}${val.created !== undefined ? ` | created=${val.created}` : ''}${val.skipped !== undefined ? ` | skipped=${val.skipped}` : ''}${val.count !== undefined ? ` | count=${val.count}` : ''}`;
        console.log(`${key}: ${summary}`);
      }
      console.log(`Overall: ${overallStatus}`);
      console.log(`Mode: ${mode}`);
      if (!this.opts.apply) {
        console.log('[DRY-RUN] No data was written. Re-run with --apply to persist.');
      }

      if (overallStatus === 'failure') {
        process.exitCode = 1;
      }
    } catch (err: any) {
      console.error(`Pipeline failed: ${err.message}`);
      overallStatus = 'failure';
      overallError = err.message;
      await this.stagePipelineHealth({
        runId,
        startedAt,
        status: 'failure',
        error: err.message,
      });
      process.exitCode = 1;
    }
  }

  private async ensureSymbol(symbol: string): Promise<boolean> {
    try {
      const existing = await pool.query(
        'SELECT symbol FROM symbols WHERE symbol = $1',
        [symbol]
      );
      if (existing.rows.length > 0) return true;

      // Fetch real metadata from IndianAPI
      let companyName = symbol;
      let sector = '';
      let industry = '';

      try {
        const meta = await this.indianProvider.getMetadata(symbol);
        if (meta && meta.companyName) {
          companyName = meta.companyName;
          sector = meta.sector || '';
          industry = meta.industry || '';
        }
      } catch {
        // Fallback names for known symbols
        const fallbackNames: Record<string, { name: string; sector: string; industry: string }> = {
          RELIANCE: { name: 'Reliance Industries Limited', sector: 'Energy & Oil', industry: 'Oil & Gas' },
          TCS: { name: 'Tata Consultancy Services Limited', sector: 'Technology', industry: 'IT Services' },
          INFY: { name: 'Infosys Limited', sector: 'Technology', industry: 'IT Services' },
          HDFCBANK: { name: 'HDFC Bank Limited', sector: 'Financials', industry: 'Banking' },
          ICICIBANK: { name: 'ICICI Bank Limited', sector: 'Financials', industry: 'Banking' },
        };
        const fallback = fallbackNames[symbol];
        if (fallback) {
          companyName = fallback.name;
          sector = fallback.sector;
          industry = fallback.industry;
        }
      }

      if (!this.opts.apply) {
        console.log(`[DRY-RUN] Would insert symbol ${symbol} (${companyName})`);
        return true;
      }

      await pool.query(
        `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
         VALUES ($1, 'NSE', $2, $3, $4, 'Active')
         ON CONFLICT (symbol) DO UPDATE SET
           company_name = EXCLUDED.company_name,
           sector = COALESCE(NULLIF(EXCLUDED.sector, ''), symbols.sector),
           industry = COALESCE(NULLIF(EXCLUDED.industry, ''), symbols.industry)`,
        [symbol, companyName, sector, industry]
      );
      console.log(`  Inserted symbol ${symbol} (${companyName})`);
      return true;
    } catch (err: any) {
      console.error(`  Failed to ensure symbol ${symbol}: ${err.message}`);
      return false;
    }
  }

  private async stageHistorical(): Promise<void> {
    console.log('[Stage 1a] Historical Price Backfill...');
    const yahoo = new YahooProvider();
    const succeeded: string[] = [];
    const failed: string[] = [];
    let rowsWritten = 0;

    for (const symbol of this.opts.symbols) {
      try {
        const points = await yahoo.getHistorical(symbol, '2Y');
        if (points.length === 0) {
          console.log(`  ${symbol}: no historical data from Yahoo`);
          failed.push(symbol);
          continue;
        }

        if (!this.opts.apply) {
          console.log(`  [DRY-RUN] ${symbol}: ${points.length} historical rows`);
          succeeded.push(symbol);
          continue;
        }

        for (const point of points) {
          const volume = point.volume !== null && point.volume !== undefined ? Math.round(Number(point.volume)) : null;
          await pool.query(
            `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (symbol, trade_date) DO UPDATE SET
               close = EXCLUDED.close,
               volume = COALESCE(EXCLUDED.volume, daily_prices.volume)`,
            [symbol, point.date, point.open, point.high, point.low, point.close, volume]
          );
          rowsWritten++;
        }
        console.log(`  ${symbol}: ${points.length} historical rows written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.rowsWritten['daily_prices'] = (this.rowsWritten['daily_prices'] ?? 0) + rowsWritten;
    this.results['1a_historical'] = {
      status: failed.length > 0 ? (succeeded.length > 0 ? 'partial' : 'failure') : 'success',
      succeeded: succeeded.length,
      failed: failed.length,
    };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageRegistry(): Promise<void> {
    console.log('[Stage 1/8] Symbol Registry...');
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const symbol of this.opts.symbols) {
      const ok = await this.ensureSymbol(symbol);
      if (ok) succeeded.push(symbol);
      else failed.push(symbol);
    }

    this.results['1_registry'] = {
      status: failed.length > 0 ? (succeeded.length > 0 ? 'partial' : 'failure') : 'success',
      succeeded: succeeded.length,
      failed: failed.length,
    };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageQuotes(): Promise<void> {
    console.log('[Stage 2/8] Quote Ingestion...');
    const succeeded: string[] = [];
    const failed: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    let rowsWritten = 0;

    for (const symbol of this.opts.symbols) {
      try {
        const quote = await this.indianProvider.getQuote(symbol);
        if (!quote || quote.price === undefined) {
          console.log(`  ${symbol}: no price data`);
          failed.push(symbol);
          continue;
        }

        if (!this.opts.apply) {
          console.log(`  [DRY-RUN] ${symbol}: ₹${quote.price} (${quote.changePercent}%)`);
          succeeded.push(symbol);
          continue;
        }

        await pool.query(
          `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (symbol, trade_date) DO UPDATE SET
             close = EXCLUDED.close,
             volume = COALESCE(EXCLUDED.volume, daily_prices.volume)`,
          [symbol, today, quote.price, quote.price, quote.price, quote.price, quote.volume !== null && quote.volume !== undefined ? Math.round(Number(quote.volume)) : null]
        );
        rowsWritten++;
        console.log(`  ${symbol}: ₹${quote.price} written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.rowsWritten['daily_prices'] = (this.rowsWritten['daily_prices'] ?? 0) + rowsWritten;
    this.results['2_quotes'] = {
      status: failed.length > 0 ? (succeeded.length > 0 ? 'partial' : 'failure') : 'success',
      succeeded: succeeded.length,
      failed: failed.length,
    };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageFinancials(): Promise<void> {
    console.log('[Stage 3/8] Financial Snapshots...');
    const succeeded: string[] = [];
    const failed: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    let rowsWritten = 0;

    for (const symbol of this.opts.symbols) {
      try {
        const snapshot = await this.coordinator.getFinancials(symbol);
        const columns = snapshotToDbColumns(snapshot);
        const availableFields = Object.entries(columns)
          .filter(([key]) => key !== 'symbol' && key !== 'snapshot_date' && key !== 'period_end')
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key]) => key);

        if (!this.opts.apply) {
          console.log(`  [DRY-RUN] ${symbol}: fields=[${availableFields.join(', ')}]`);
          succeeded.push(symbol);
          continue;
        }

        // Use period_end as the primary key date; fall back to today
        const periodEnd = columns.period_end || today;

        // Build dynamic INSERT with available columns
        const writable = Object.entries(columns)
          .filter(([key]) => key !== 'symbol')
          .filter(([, value]) => value !== null && value !== undefined);

        if (writable.length === 0) {
          console.log(`  ${symbol}: no financial fields available`);
          failed.push(symbol);
          continue;
        }

        const columnNames = ['symbol', ...writable.map(([key]) => key)];
        const values = [symbol, ...writable.map(([, value]) => value)];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const updates = columnNames
          .filter(col => col !== 'symbol' && col !== 'period_end')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');

        await pool.query(
          `INSERT INTO financial_snapshots (${columnNames.join(', ')}) VALUES (${placeholders})
           ON CONFLICT (symbol, period_end) DO UPDATE SET ${updates}`,
          values
        );
        rowsWritten++;
        console.log(`  ${symbol}: financial snapshot written (fields=${availableFields.length})`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.rowsWritten['financial_snapshots'] = (this.rowsWritten['financial_snapshots'] ?? 0) + rowsWritten;
    this.results['3_financials'] = {
      status: failed.length > 0 ? (succeeded.length > 0 ? 'partial' : 'failure') : 'success',
      succeeded: succeeded.length,
      failed: failed.length,
    };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageFeatures(): Promise<void> {
    console.log('[Stage 4/8] Feature Snapshots...');
    const succeeded: string[] = [];
    const failed: string[] = [];
    let rowsWritten = 0;

    for (const symbol of this.opts.symbols) {
      try {
        if (!this.opts.apply) {
          const priceCount = await pool.query(
            'SELECT COUNT(*) as cnt FROM daily_prices WHERE symbol = $1',
            [symbol]
          );
          const count = Number(priceCount.rows[0]?.cnt ?? 0);
          console.log(`  [DRY-RUN] ${symbol}: ${count} price rows available for feature computation`);
          succeeded.push(symbol);
          continue;
        }

        const snapshots = await this.featureEngine.calculateAndStoreFeatures(symbol);
        rowsWritten += snapshots.filter(s => s.rsi !== null && s.macd !== null).length;
        console.log(`  ${symbol}: ${snapshots.length} feature snapshots written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.rowsWritten['feature_snapshots'] = (this.rowsWritten['feature_snapshots'] ?? 0) + rowsWritten;
    this.results['4_features'] = {
      status: failed.length > 0 ? (succeeded.length > 0 ? 'partial' : 'failure') : 'success',
      succeeded: succeeded.length,
      failed: failed.length,
      rowsWritten: { count: rowsWritten },
    };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageFactors(): Promise<void> {
    console.log('[Stage 5/8] Factor Snapshots...');
    const succeeded: string[] = [];
    const failed: string[] = [];
    let rowsWritten = 0;

    for (const symbol of this.opts.symbols) {
      try {
        if (!this.opts.apply) {
          const featureCount = await pool.query(
            'SELECT COUNT(*) as cnt FROM feature_snapshots WHERE symbol = $1',
            [symbol]
          );
          const count = Number(featureCount.rows[0]?.cnt ?? 0);
          console.log(`  [DRY-RUN] ${symbol}: ${count} feature rows available for factor computation`);
          succeeded.push(symbol);
          continue;
        }

        const snapshots = await this.factorEngine.calculateAndStoreFactors(symbol);
        rowsWritten += snapshots.length;
        console.log(`  ${symbol}: ${snapshots.length} factor snapshots written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.rowsWritten['factor_snapshots'] = (this.rowsWritten['factor_snapshots'] ?? 0) + rowsWritten;
    this.results['5_factors'] = {
      status: failed.length > 0 ? (succeeded.length > 0 ? 'partial' : 'failure') : 'success',
      succeeded: succeeded.length,
      failed: failed.length,
      rowsWritten: { count: rowsWritten },
    };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stagePredictions(): Promise<void> {
    console.log('[Stage 6/8] Prediction Registry...');
    try {
      if (!this.opts.apply) {
        const factorCount = await pool.query(
          'SELECT COUNT(DISTINCT symbol) as cnt FROM factor_snapshots'
        );
        const count = Number(factorCount.rows[0]?.cnt ?? 0);
        console.log(`  [DRY-RUN] ${count} symbols with factor data ready for predictions`);
        this.results['6_predictions'] = { status: 'success', dryRun: true, symbolsWithFactors: count };
        return;
      }

      const result = await predictionFactory.generateDaily([30, 90, 365]);
      console.log(`  Created: ${result.created}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.slice(0, 5).map(e => `${e.symbol}:${e.horizon}d=${e.code}`).join(', ')}`);
      }
      this.rowsWritten['prediction_registry'] = (this.rowsWritten['prediction_registry'] ?? 0) + result.created;
      this.results['6_predictions'] = {
        status: result.failed > 0 ? (result.created > 0 ? 'partial' : 'failure') : 'success',
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        count: result.total,
      };
    } catch (err: any) {
      console.error(`  Predictions failed: ${err.message}`);
      this.results['6_predictions'] = { status: 'failure', error: err.message };
    }
  }

  private async stageSignals(): Promise<void> {
    console.log('[Stage 7/8] Prediction Signals...');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await pool.query(
        `SELECT symbol, ranking_score, classification, confidence_score, prediction_date
         FROM prediction_registry
         WHERE prediction_date = $1 AND prediction_horizon = 30
         ORDER BY prediction_date DESC`,
        [today]
      );

      if (result.rows.length === 0) {
        console.log('  No prediction signals available yet — predictions must be generated first.');
        this.results['7_signals'] = { status: 'success', count: 0, message: 'No predictions for today' };
        return;
      }

      console.log(`  ${result.rows.length} prediction signals available`);
      for (const row of result.rows) {
        console.log(`    ${row.symbol}: score=${row.ranking_score}, classification=${row.classification}, confidence=${row.confidence_score}`);
      }
      this.results['7_signals'] = { status: 'success', count: result.rows.length };
    } catch (err: any) {
      console.error(`  Signals failed: ${err.message}`);
      this.results['7_signals'] = { status: 'failure', error: err.message };
    }
  }

  private async stagePipelineHealth(params: {
    runId: string;
    startedAt: string;
    status: 'success' | 'partial' | 'failure';
    error?: string;
  }): Promise<void> {
    console.log('[Stage 8/8] Pipeline Health Record...');

    const symbolsAttempted = this.opts.symbols.length;
    const registryResult = this.results['1_registry'];
    const symbolsSucceeded = registryResult?.succeeded ?? symbolsAttempted;

    this.providerStatuses = {
      indianapi: process.env.INDIANAPI_KEY ? 'present' : 'missing',
      upstox: process.env.UPSTOX_ACCESS_TOKEN ? 'present' : 'missing',
      finnhub: 'deprecated-removed',
      redis: process.env.REDIS_URL ? 'present' : 'missing',
    };

    if (!this.opts.apply) {
      console.log(`  [DRY-RUN] Would write pipeline_health: ${params.status}`);
      this.results['8_health'] = { status: 'success', dryRun: true, wouldStatus: params.status };
      return;
    }

    try {
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const completedAt = new Date().toISOString();

      await pool.query(
        `INSERT INTO pipeline_health (
           id, run_id, phase, status, started_at, completed_at,
           symbols_attempted, symbols_succeeded, symbols_failed,
           error_classes, provider_statuses, rows_written, metadata
         )
         VALUES ($1, $2, 'production_data_pipeline', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          params.runId,
          params.status,
          params.startedAt,
          completedAt,
          symbolsAttempted,
          symbolsSucceeded,
          symbolsAttempted - symbolsSucceeded,
          params.error ? [params.error] : [],
          JSON.stringify(this.providerStatuses),
          JSON.stringify(this.rowsWritten),
          JSON.stringify({ mode: this.opts.apply ? 'apply' : 'dry-run', stages: this.results }),
        ]
      );
      console.log(`  Pipeline health recorded: ${params.status}`);
      this.results['8_health'] = { status: 'success', recorded: true, overallStatus: params.status };
    } catch (err: any) {
      console.error(`  Failed to record pipeline health: ${err.message}`);
      this.results['8_health'] = { status: 'failure', error: err.message };
    }
  }
}

async function main() {
  const opts = parseArgs();
  const pipeline = new ProductionPipeline(opts);
  await pipeline.run();
  await pool.end?.();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Pipeline fatal:', err.message);
    process.exitCode = 1;
  });
}

export { ProductionPipeline, parseArgs, snapshotToDbColumns };
