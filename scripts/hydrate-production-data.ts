/**
 * hydrate-production-data.ts
 *
 * Production-safe symbol hydration command.
 * Fetches real data only — never fabricates snapshots.
 *
 * Usage:
 *   npx tsx scripts/hydrate-production-data.ts --symbol=CHENNPETRO
 *   npx tsx scripts/hydrate-production-data.ts --symbols=CHENNPETRO,ITC,TCS
 *   npx tsx scripts/hydrate-production-data.ts --universe --limit=31
 *   npx tsx scripts/hydrate-production-data.ts --symbol=INVALID --dry-run
 */

import pool from '../src/db/index';
import { FeatureEngine } from '../src/services/FeatureEngine';
import { FactorEngine } from '../src/services/FactorEngine';
import { predictionFactory } from '../src/predictions/PredictionFactory';
import { ProviderCoordinator } from '../src/services/providers/ProviderCoordinator';
import { IndianMarketProvider } from '../src/services/providers/IndianMarketProvider';
import { YahooProvider } from '../src/services/providers/YahooProvider';
import type { FinancialSnapshot } from '../src/services/data/types';

interface HydrationOptions {
  symbols: string[];
  apply: boolean;
  limit: number;
}

interface HydrationResult {
  symbol: string;
  universeRegistered: boolean;
  financialSnapshotCreatedOrUpdated: boolean;
  dailyPricesCreatedOrUpdated: boolean;
  featureSnapshotCreatedOrUpdated: boolean;
  factorSnapshotCreatedOrUpdated: boolean;
  predictionCreatedOrUpdated: boolean;
  skippedReason: string | null;
  errors: string[];
}

interface StageSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

function parseArgs(): HydrationOptions {
  const args = process.argv.slice(2);
  const opts: HydrationOptions = {
    symbols: [],
    apply: false,
    limit: 31,
  };

  for (const arg of args) {
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--dry-run') opts.apply = false;
    else if (arg === '--universe') {
      opts.symbols = [];
    } else if (arg.startsWith('--symbol=')) {
      const val = arg.split('=')[1];
      opts.symbols = [val.trim().toUpperCase()];
    } else if (arg.startsWith('--symbols=')) {
      const val = arg.split('=')[1];
      opts.symbols = val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    } else if (arg.startsWith('--limit=')) {
      opts.limit = parseInt(arg.split('=')[1], 10) || 31;
    }
  }

  if (opts.symbols.length === 0 && args.includes('--universe')) {
    opts.symbols = [];
  }

  return opts;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
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
    roce: finiteNumber(snapshot.roic),
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

class HydrationPipeline {
  private coordinator: ProviderCoordinator;
  private indianProvider: IndianMarketProvider;
  private yahooProvider: YahooProvider;
  private featureEngine: FeatureEngine;
  private factorEngine: FactorEngine;
  private opts: HydrationOptions;
  private results: Map<string, HydrationResult> = new Map();

  constructor(opts: HydrationOptions) {
    this.opts = opts;
    this.coordinator = new ProviderCoordinator();
    this.indianProvider = new IndianMarketProvider();
    this.yahooProvider = new YahooProvider();
    this.featureEngine = new FeatureEngine();
    this.factorEngine = new FactorEngine();
  }

  async run(): Promise<void> {
    const mode = this.opts.apply ? 'APPLY' : 'DRY-RUN';
    console.log(`Hydration Pipeline — ${mode}`);
    console.log('');

    let symbols: string[];

    if (this.opts.symbols.length > 0) {
      symbols = this.opts.symbols;
      console.log(`Symbols: ${symbols.join(', ')}`);
    } else {
      const universeRes = await pool.query(
        'SELECT symbol FROM symbols ORDER BY symbol LIMIT $1',
        [this.opts.limit]
      );
      symbols = universeRes.rows.map((r: any) => String(r.symbol));
      console.log(`Universe hydration: ${symbols.length} symbols (limit=${this.opts.limit})`);
    }

    if (symbols.length === 0) {
      console.log('No symbols to hydrate. Exiting.');
      return;
    }

    console.log('');

    const totals: Record<string, StageSummary> = {
      universe: { attempted: 0, succeeded: 0, failed: 0, skipped: 0 },
      financials: { attempted: 0, succeeded: 0, failed: 0, skipped: 0 },
      dailyPrices: { attempted: 0, succeeded: 0, failed: 0, skipped: 0 },
      features: { attempted: 0, succeeded: 0, failed: 0, skipped: 0 },
      factors: { attempted: 0, succeeded: 0, failed: 0, skipped: 0 },
      predictions: { attempted: 0, succeeded: 0, failed: 0, skipped: 0 },
    };

    for (const symbol of symbols) {
      const result: HydrationResult = {
        symbol,
        universeRegistered: false,
        financialSnapshotCreatedOrUpdated: false,
        dailyPricesCreatedOrUpdated: false,
        featureSnapshotCreatedOrUpdated: false,
        factorSnapshotCreatedOrUpdated: false,
        predictionCreatedOrUpdated: false,
        skippedReason: null,
        errors: [],
      };

      try {
        totals.universe.attempted++;
        const registered = await this.ensureSymbol(symbol);
        result.universeRegistered = registered;
        if (registered) totals.universe.succeeded++;
        else totals.universe.failed++;

        if (!registered) {
          result.skippedReason = 'Symbol not registered in universe';
          this.results.set(symbol, result);
          continue;
        }

        totals.dailyPrices.attempted++;
        const pricesOk = await this.hydratePrices(symbol);
        result.dailyPricesCreatedOrUpdated = pricesOk;
        if (pricesOk) totals.dailyPrices.succeeded++;
        else totals.dailyPrices.failed++;

        totals.financials.attempted++;
        const finOk = await this.hydrateFinancials(symbol);
        result.financialSnapshotCreatedOrUpdated = finOk;
        if (finOk) totals.financials.succeeded++;
        else totals.financials.failed++;

        totals.features.attempted++;
        const featOk = await this.hydrateFeatures(symbol);
        result.featureSnapshotCreatedOrUpdated = featOk;
        if (featOk) totals.features.succeeded++;
        else totals.features.failed++;

        totals.factors.attempted++;
        const factOk = await this.hydrateFactors(symbol);
        result.factorSnapshotCreatedOrUpdated = factOk;
        if (factOk) totals.factors.succeeded++;
        else totals.factors.failed++;

        totals.predictions.attempted++;
        const predOk = await this.hydratePredictions(symbol);
        result.predictionCreatedOrUpdated = predOk;
        if (predOk) totals.predictions.succeeded++;
        else totals.predictions.failed++;

        if (!result.predictionCreatedOrUpdated && result.factorSnapshotCreatedOrUpdated) {
          result.skippedReason = 'Insufficient analytical data for prediction';
        } else if (!result.predictionCreatedOrUpdated && !result.factorSnapshotCreatedOrUpdated) {
          result.skippedReason = 'Insufficient factor data for prediction';
        }
      } catch (err: any) {
        const msg = err?.message ?? 'Unknown error';
        result.errors.push(msg);
        console.error(`  ${symbol}: FATAL — ${msg}`);
      }

      this.results.set(symbol, result);
    }

    console.log('');
    console.log('=== HYDRATION SUMMARY ===');
    console.log('');
    for (const [symbol, res] of this.results) {
      const parts: string[] = [
        `registered=${res.universeRegistered}`,
        `fin=${res.financialSnapshotCreatedOrUpdated}`,
        `prices=${res.dailyPricesCreatedOrUpdated}`,
        `feat=${res.featureSnapshotCreatedOrUpdated}`,
        `fact=${res.factorSnapshotCreatedOrUpdated}`,
        `pred=${res.predictionCreatedOrUpdated}`,
      ];
      if (res.skippedReason) parts.push(`skipped=${res.skippedReason}`);
      if (res.errors.length > 0) parts.push(`errors=${res.errors.length}`);
      console.log(`  ${symbol}: ${parts.join(', ')}`);
    }

    console.log('');
    console.log('=== STAGE COUNTS ===');
    for (const [stage, summary] of Object.entries(totals)) {
      if (summary.attempted > 0) {
        console.log(`  ${stage}: attempted=${summary.attempted}, ok=${summary.succeeded}, failed=${summary.failed}, skipped=${summary.skipped}`);
      }
    }

    const totalErrors = Array.from(this.results.values()).reduce((sum, r) => sum + r.errors.length, 0);
    console.log(`  total_errors: ${totalErrors}`);

    console.log('');
    if (!this.opts.apply) {
      console.log('[DRY-RUN] No data was written. Re-run with --apply to persist.');
    }
  }

  private async ensureSymbol(symbol: string): Promise<boolean> {
    try {
      const existing = await pool.query(
        'SELECT symbol FROM symbols WHERE symbol = $1',
        [symbol]
      );
      if (existing.rows.length > 0) return true;

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
        console.log(`  ${symbol}: metadata fetch failed, using symbol as name`);
      }

      if (!this.opts.apply) {
        console.log(`  [DRY-RUN] Would insert symbol ${symbol} (${companyName})`);
        return true;
      }

      await pool.query(
        `INSERT INTO symbols (symbol, exchange, company_name, sector, industry, listing_status)
         VALUES ($1, 'NSE', $2, $3, $4, 'Active')
         ON CONFLICT (symbol) DO UPDATE SET
           company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), symbols.company_name),
           sector = COALESCE(NULLIF(EXCLUDED.sector, ''), symbols.sector),
           industry = COALESCE(NULLIF(EXCLUDED.industry, ''), symbols.industry)`,
        [symbol, companyName, sector, industry]
      );
      console.log(`  ${symbol}: registered in universe`);
      return true;
    } catch (err: any) {
      console.error(`  ${symbol}: failed to register — ${err.message}`);
      return false;
    }
  }

  private async hydratePrices(symbol: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().slice(0, 10);

      try {
        const quote = await this.indianProvider.getQuote(symbol);
        if (quote && quote.price !== undefined && this.opts.apply) {
          await pool.query(
            `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, volume)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (symbol, trade_date) DO UPDATE SET
               close = EXCLUDED.close,
               volume = COALESCE(EXCLUDED.volume, daily_prices.volume)`,
            [symbol, today, quote.price, quote.price, quote.price, quote.price,
             quote.volume !== null && quote.volume !== undefined ? Math.round(Number(quote.volume)) : null]
          );
          if (!this.opts.apply) {
            console.log(`  [DRY-RUN] ${symbol}: ₹${quote.price} quote available`);
          } else {
            console.log(`  ${symbol}: ₹${quote.price} quote written`);
          }
          return true;
        }
      } catch {
        // quote fetch failed, try historical
      }

      try {
        const points = await this.yahooProvider.getHistorical(symbol, '1Y');
        if (points.length === 0) {
          console.log(`  ${symbol}: no price data from providers`);
          return false;
        }

        if (!this.opts.apply) {
          console.log(`  [DRY-RUN] ${symbol}: ${points.length} historical price rows available`);
          return true;
        }

        let written = 0;
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
          written++;
        }
        console.log(`  ${symbol}: ${written} historical prices written`);
        return written > 0;
      } catch (err: any) {
        console.log(`  ${symbol}: no price data available — ${err.message}`);
        return false;
      }
    } catch (err: any) {
      console.log(`  ${symbol}: price hydration failed — ${err.message}`);
      return false;
    }
  }

  private async hydrateFinancials(symbol: string): Promise<boolean> {
    try {
      const snapshot = await this.coordinator.getFinancials(symbol);
      const columns = snapshotToDbColumns(snapshot);
      const today = new Date().toISOString().slice(0, 10);

      const writable = Object.entries(columns)
        .filter(([key]) => key !== 'symbol')
        .filter(([, value]) => value !== null && value !== undefined);

      if (writable.length === 0) {
        console.log(`  ${symbol}: no financial data available`);
        return false;
      }

      if (!this.opts.apply) {
        const availableFields = writable.map(([key]) => key).join(', ');
        console.log(`  [DRY-RUN] ${symbol}: fields=[${availableFields}]`);
        return true;
      }

      const periodEnd = columns.period_end || today;
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
      const availableFields = writable.map(([key]) => key);
      console.log(`  ${symbol}: financial snapshot written (fields=${availableFields.length})`);
      return true;
    } catch (err: any) {
      console.log(`  ${symbol}: financials failed — ${err.message}`);
      return false;
    }
  }

  private async hydrateFeatures(symbol: string): Promise<boolean> {
    try {
      if (!this.opts.apply) {
        const priceCount = await pool.query(
          'SELECT COUNT(*) as cnt FROM daily_prices WHERE symbol = $1',
          [symbol]
        );
        const count = Number(priceCount.rows[0]?.cnt ?? 0);
        if (count < 2) {
          console.log(`  [DRY-RUN] ${symbol}: insufficient price rows (${count}) for feature computation`);
          return false;
        }
        console.log(`  [DRY-RUN] ${symbol}: ${count} price rows available for feature computation`);
        return true;
      }

      const snapshots = await this.featureEngine.calculateAndStoreFeatures(symbol);
      const validSnapshots = snapshots.filter(s => s.rsi !== null && s.macd !== null).length;
      if (validSnapshots === 0) {
        console.log(`  ${symbol}: feature computation returned no valid snapshots`);
        return false;
      }
      console.log(`  ${symbol}: ${validSnapshots} feature snapshots written`);
      return true;
    } catch (err: any) {
      console.log(`  ${symbol}: features failed — ${err.message}`);
      return false;
    }
  }

  private async hydrateFactors(symbol: string): Promise<boolean> {
    try {
      if (!this.opts.apply) {
        const featureCount = await pool.query(
          'SELECT COUNT(*) as cnt FROM feature_snapshots WHERE symbol = $1',
          [symbol]
        );
        const count = Number(featureCount.rows[0]?.cnt ?? 0);
        if (count === 0) {
          console.log(`  [DRY-RUN] ${symbol}: no feature snapshots for factor computation`);
          return false;
        }
        console.log(`  [DRY-RUN] ${symbol}: ${count} feature rows available for factor computation`);
        return true;
      }

      const snapshots = await this.factorEngine.calculateAndStoreFactors(symbol);
      if (snapshots.length === 0) {
        console.log(`  ${symbol}: factor computation returned no snapshots`);
        return false;
      }
      console.log(`  ${symbol}: ${snapshots.length} factor snapshots written`);
      return true;
    } catch (err: any) {
      console.log(`  ${symbol}: factors failed — ${err.message}`);
      return false;
    }
  }

  private async hydratePredictions(symbol: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const horizons = [30, 90, 365];
      let createdCount = 0;

      if (!this.opts.apply) {
        const factorCount = await pool.query(
          'SELECT COUNT(*) as cnt FROM factor_snapshots WHERE symbol = $1',
          [symbol]
        );
        const count = Number(factorCount.rows[0]?.cnt ?? 0);
        if (count === 0) {
          console.log(`  [DRY-RUN] ${symbol}: no factor data for prediction generation`);
          return false;
        }
        console.log(`  [DRY-RUN] ${symbol}: ${count} factor rows, predictions would be generated`);
        return true;
      }

      for (const horizon of horizons) {
        const existing = await pool.query(
          `SELECT id FROM prediction_registry WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3`,
          [symbol, today, horizon]
        );
        if (existing.rows.length > 0) {
          console.log(`  ${symbol}: prediction for horizon ${horizon}d already exists, skipped`);
          continue;
        }

        const result = await predictionFactory.generateDaily([horizon]);
        createdCount += result.created;
        if (result.created > 0) {
          console.log(`  ${symbol}: prediction for horizon ${horizon}d created`);
        } else {
          const insufficient = result.skippedInsufficientData;
          if (insufficient > 0) {
            console.log(`  ${symbol}: insufficient analytical data for horizon ${horizon}d`);
          }
        }
      }

      return createdCount > 0;
    } catch (err: any) {
      console.log(`  ${symbol}: prediction failed — ${err.message}`);
      return false;
    }
  }
}

async function main() {
  const opts = parseArgs();
  const pipeline = new HydrationPipeline(opts);
  await pipeline.run();
  await pool.end?.();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Hydration fatal:', err.message);
    process.exitCode = 1;
  });
}
