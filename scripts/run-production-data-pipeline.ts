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
import { IndianMarketProvider } from '../src/services/providers/IndianMarketProvider';

const DEFAULT_SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'];

interface PipelineOptions {
  symbols: string[];
  apply: boolean;
  skipUpstox: boolean;
  skipIndianApi: boolean;
  quotesOnly: boolean;
  financialsOnly: boolean;
  featuresOnly: boolean;
  factorsOnly: boolean;
  predictionsOnly: boolean;
  signalsOnly: boolean;
}

function parseArgs(): PipelineOptions {
  const args = process.argv.slice(2);
  const opts: PipelineOptions = {
    symbols: DEFAULT_SYMBOLS,
    apply: false,
    skipUpstox: false,
    skipIndianApi: false,
    quotesOnly: false,
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

class ProductionPipeline {
  private indianProvider: IndianMarketProvider;
  private featureEngine: FeatureEngine;
  private factorEngine: FactorEngine;
  private opts: PipelineOptions;
  private results: Record<string, any> = {};
  private providerStatuses: Record<string, string> = {};

  constructor(opts: PipelineOptions) {
    this.opts = opts;
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

    try {
      // Stage 1: Registry fix (idempotent)
      if (!this.opts.quotesOnly && !this.opts.financialsOnly && !this.opts.featuresOnly && !this.opts.factorsOnly && !this.opts.predictionsOnly && !this.opts.signalsOnly) {
        await this.stageRegistry();
      }

      // Stage 2: Quotes
      if (!this.opts.financialsOnly && !this.opts.featuresOnly && !this.opts.factorsOnly && !this.opts.predictionsOnly && !this.opts.signalsOnly) {
        await this.stageQuotes();
      }

      // Stage 3: Financials
      if (!this.opts.quotesOnly && !this.opts.featuresOnly && !this.opts.factorsOnly && !this.opts.predictionsOnly && !this.opts.signalsOnly) {
        await this.stageFinancials();
      }

      // Stage 4: Features
      if (!this.opts.quotesOnly && !this.opts.financialsOnly && !this.opts.factorsOnly && !this.opts.predictionsOnly && !this.opts.signalsOnly) {
        await this.stageFeatures();
      }

      // Stage 5: Factors
      if (!this.opts.quotesOnly && !this.opts.financialsOnly && !this.opts.featuresOnly && !this.opts.predictionsOnly && !this.opts.signalsOnly) {
        await this.stageFactors();
      }

      // Stage 6: Predictions
      if (!this.opts.quotesOnly && !this.opts.financialsOnly && !this.opts.featuresOnly && !this.opts.factorsOnly && !this.opts.signalsOnly) {
        await this.stagePredictions();
      }

      // Stage 7: Signals
      if (!this.opts.quotesOnly && !this.opts.financialsOnly && !this.opts.featuresOnly && !this.opts.factorsOnly && !this.opts.predictionsOnly) {
        await this.stageSignals();
      }

      // Stage 8: Pipeline health
      await this.stagePipelineHealth({
        runId,
        startedAt,
        status: 'success',
      });

      console.log('');
      console.log('=== PIPELINE SUMMARY ===');
      for (const [key, val] of Object.entries(this.results)) {
        console.log(`${key}: ${JSON.stringify(val)}`);
      }
      console.log(`Mode: ${mode}`);
      if (!this.opts.apply) {
        console.log('[DRY-RUN] No data was written. Re-run with --apply to persist.');
      }
    } catch (err: any) {
      console.error(`Pipeline failed: ${err.message}`);
      await this.stagePipelineHealth({
        runId,
        startedAt,
        status: 'failure',
        error: err.message,
      });
      process.exit(1);
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
        const fallbackNames: Record<string, string> = {
          RELIANCE: 'Reliance Industries Limited',
          TCS: 'Tata Consultancy Services Limited',
          INFY: 'Infosys Limited',
          HDFCBANK: 'HDFC Bank Limited',
          ICICIBANK: 'ICICI Bank Limited',
        };
        companyName = fallbackNames[symbol] || symbol;
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

  private async stageRegistry(): Promise<void> {
    console.log('[Stage 1/8] Symbol Registry...');
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const symbol of this.opts.symbols) {
      const ok = await this.ensureSymbol(symbol);
      if (ok) succeeded.push(symbol);
      else failed.push(symbol);
    }

    this.results['1_registry'] = { succeeded: succeeded.length, failed: failed.length };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageQuotes(): Promise<void> {
    console.log('[Stage 2/8] Quote Ingestion...');
    const succeeded: string[] = [];
    const failed: string[] = [];
    const today = new Date().toISOString().slice(0, 10);

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
          [symbol, today, quote.price, quote.price, quote.price, quote.price, quote.volume ?? null]
        );
        console.log(`  ${symbol}: ₹${quote.price} written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.results['2_quotes'] = { succeeded: succeeded.length, failed: failed.length, date: today };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageFinancials(): Promise<void> {
    console.log('[Stage 3/8] Financial Snapshots...');
    const succeeded: string[] = [];
    const failed: string[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const symbol of this.opts.symbols) {
      try {
        const meta = await this.indianProvider.getMetadata(symbol);
        const quote = await this.indianProvider.getQuote(symbol);

        const marketCap = meta?.marketCap ?? null;
        const price = quote?.price ?? null;

        if (!this.opts.apply) {
          console.log(`  [DRY-RUN] ${symbol}: marketCap=${marketCap !== null ? '₹' + (marketCap / 1e7).toFixed(0) + 'Cr' : 'N/A'}`);
          succeeded.push(symbol);
          continue;
        }

        if (marketCap !== null || price !== null) {
          await pool.query(
            `INSERT INTO financial_snapshots (symbol, snapshot_date, market_cap)
             VALUES ($1, $2, $3)
             ON CONFLICT (symbol, snapshot_date) DO UPDATE SET
               market_cap = COALESCE(EXCLUDED.market_cap, financial_snapshots.market_cap)`,
            [symbol, today, marketCap !== null ? marketCap : null]
          );
          console.log(`  ${symbol}: financial snapshot written (marketCap=${marketCap !== null ? (marketCap / 1e7).toFixed(0) + 'Cr' : 'N/A'})`);
        }
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.results['3_financials'] = { succeeded: succeeded.length, failed: failed.length, date: today };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageFeatures(): Promise<void> {
    console.log('[Stage 4/8] Feature Snapshots...');
    const succeeded: string[] = [];
    const failed: string[] = [];

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
        console.log(`  ${symbol}: ${snapshots.length} feature snapshots written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.results['4_features'] = { succeeded: succeeded.length, failed: failed.length };
    console.log(`  Succeeded: ${succeeded.length}, Failed: ${failed.length}`);
  }

  private async stageFactors(): Promise<void> {
    console.log('[Stage 5/8] Factor Snapshots...');
    const succeeded: string[] = [];
    const failed: string[] = [];

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
        console.log(`  ${symbol}: ${snapshots.length} factor snapshots written`);
        succeeded.push(symbol);
      } catch (err: any) {
        console.error(`  ${symbol}: ${err.message}`);
        failed.push(symbol);
      }
    }

    this.results['5_factors'] = { succeeded: succeeded.length, failed: failed.length };
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
        this.results['6_predictions'] = { dryRun: true, symbolsWithFactors: count };
        return;
      }

      const result = await predictionFactory.generateDaily([30, 90, 365]);
      console.log(`  Created: ${result.created}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.slice(0, 5).map(e => `${e.symbol}:${e.horizon}d=${e.code}`).join(', ')}`);
      }
      this.results['6_predictions'] = {
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        total: result.total,
      };
    } catch (err: any) {
      console.error(`  Predictions failed: ${err.message}`);
      this.results['6_predictions'] = { error: err.message };
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
        this.results['7_signals'] = { count: 0, message: 'No predictions for today' };
        return;
      }

      console.log(`  ${result.rows.length} prediction signals available`);
      for (const row of result.rows) {
        console.log(`    ${row.symbol}: score=${row.ranking_score}, classification=${row.classification}, confidence=${row.confidence_score}`);
      }
      this.results['7_signals'] = { count: result.rows.length };
    } catch (err: any) {
      console.error(`  Signals failed: ${err.message}`);
      this.results['7_signals'] = { error: err.message };
    }
  }

  private async stagePipelineHealth(params: {
    runId: string;
    startedAt: string;
    status: string;
    error?: string;
  }): Promise<void> {
    console.log('[Stage 8/8] Pipeline Health Record...');

    if (!this.opts.apply) {
      console.log(`  [DRY-RUN] Would write pipeline_health: ${params.status}`);
      this.results['8_health'] = { dryRun: true, status: params.status };
      return;
    }

    try {
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const completedAt = new Date().toISOString();

      const symbolsAttempted = this.opts.symbols.length;
      const symbolsSucceeded = this.results['1_registry']?.succeeded ?? 0;

      await pool.query(
        `INSERT INTO pipeline_health (id, phase, status, started_at, completed_at, symbols_processed, symbols_succeeded, symbols_failed, errors)
         VALUES ($1, 'production_data_pipeline', $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          params.status,
          params.startedAt,
          completedAt,
          symbolsAttempted,
          symbolsSucceeded,
          this.opts.symbols.length - symbolsSucceeded,
          params.error || null,
        ]
      );
      console.log(`  Pipeline health recorded: ${params.status}`);
      this.results['8_health'] = { status: params.status, recorded: true };
    } catch (err: any) {
      console.error(`  Failed to record pipeline health: ${err.message}`);
      this.results['8_health'] = { error: err.message };
    }
  }
}

async function main() {
  const opts = parseArgs();
  const pipeline = new ProductionPipeline(opts);
  await pipeline.run();
}

main().catch(err => {
  console.error('Pipeline fatal:', err.message);
  process.exit(1);
});
