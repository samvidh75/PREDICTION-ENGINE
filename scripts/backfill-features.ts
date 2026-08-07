/**
 * backfill-features.ts — compute and store REAL feature/factor snapshots from
 * the daily_prices already present in the DB.
 *
 * The FeatureEngine and FactorEngine already implement the full indicator math
 * (RSI, MACD, ATR, ADX, Bollinger, momentum, annualized volatility, relative
 * strength, MA distance, trend strength + the six factor scores). This script
 * simply runs them over every symbol that has real price history so the
 * healthometer, factor engines and prediction pipeline consume real data
 * instead of empty tables.
 *
 * Missing fundamentals (pe_ratio, dividend_yield, beta, ...) are handled by
 * the engines as neutral (50) — they are never guessed at.
 *
 * Usage:
 *   SQLITE_DB_PATH=dev.db npx tsx scripts/backfill-features.ts            # all symbols with prices
 *   SQLITE_DB_PATH=dev.db npx tsx scripts/backfill-features.ts --symbols=SMPH,BDO
 *   SQLITE_DB_PATH=dev.db npx tsx scripts/backfill-features.ts --features-only
 */
import 'dotenv/config';
import { dbAdapter } from '../src/db/DatabaseAdapter';
import { featureEngine } from '../src/services/FeatureEngine';
import { factorEngine } from '../src/services/FactorEngine';

interface Cli {
  symbols?: string[];
  featuresOnly: boolean;
}

function parseArgs(argv: string[]): Cli {
  const cli: Cli = { featuresOnly: false };
  for (const a of argv) {
    if (a.startsWith('--symbols=')) {
      cli.symbols = a.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (a === '--features-only') {
      cli.featuresOnly = true;
    }
  }
  return cli;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  await dbAdapter.initialize();
  if (dbAdapter.kind === 'unavailable') {
    console.error('[backfill-features] Database unavailable — aborting');
    process.exitCode = 1;
    return;
  }

  const priceSymbols = await dbAdapter.query(
    `SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol`
  );
  const all = priceSymbols.rows.map((r) => String(r.symbol));
  const targets = cli.symbols ? cli.symbols.filter((s) => all.includes(s)) : all;
  if (cli.symbols && targets.length !== cli.symbols.length) {
    console.warn('[backfill-features] Some requested symbols have no daily_prices; skipping them.');
  }
  console.log(`[backfill-features] ${targets.length} symbols with price history (db: ${dbAdapter.kind})`);

  let featureRows = 0;
  let factorRows = 0;
  const t0 = Date.now();
  for (const symbol of targets) {
    try {
      const features = await featureEngine.calculateAndStoreFeatures(symbol);
      featureRows += features.length;
      let factorsLen = 0;
      if (!cli.featuresOnly) {
        const factors = await factorEngine.calculateAndStoreFactors(symbol);
        factorRows += factors.length;
        factorsLen = factors.length;
      }
      console.log(`  ${symbol}: ${features.length} features${cli.featuresOnly ? '' : `, ${factorsLen} factors`}`);
    } catch (err) {
      console.error(`  ${symbol}: FAILED — ${(err as Error).message}`);
    }
  }
  console.log(
    `[backfill-features] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ` +
    `${featureRows} feature rows${cli.featuresOnly ? '' : `, ${factorRows} factor rows`}.`
  );
}

main();
