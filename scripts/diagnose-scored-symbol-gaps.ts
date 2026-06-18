export {};
/**
 * diagnose-scored-symbol-gaps.ts
 *
 * Diagnoses why verified symbols are missing from the scored leaderboard.
 * Queries each pipeline stage and classifies the gap reason per symbol.
 *
 * Usage:
 *   npx tsx scripts/diagnose-scored-symbol-gaps.ts
 *
 * Environment:
 *   DATABASE_URL — PostgreSQL connection string (required for production run)
 *   SCORING_WINDOW_DAYS — minimum history window for scoring (default: 365)
 */

import pool from '../src/db/index';

const SCORING_WINDOW_DAYS = parseInt(process.env.SCORING_WINDOW_DAYS || '365', 10);

interface SymbolDiagnostic {
  symbol: string;
  inCompanyRegistry: boolean;
  inSymbolRegistry: boolean;
  hasLatestPrice: boolean;
  priceCount: number;
  oldestPriceDate: string | null;
  newestPriceDate: string | null;
  hasFeatureSnapshot: boolean;
  featureCount: number;
  hasFactorSnapshot: boolean;
  factorCount: number;
  hasPrediction: boolean;
  predictionCount: number;
  hasFinancialSnapshot: boolean;
  financialCount: number;
  onLeaderboard: boolean;
  missingReasons: string[];
}

function classifyMissingReasons(d: SymbolDiagnostic): string[] {
  const reasons: string[] = [];
  if (!d.inCompanyRegistry) reasons.push('no_company_registry');
  if (!d.inSymbolRegistry) reasons.push('no_symbol_registry');
  if (!d.hasLatestPrice) reasons.push('no_quote');
  if (d.priceCount === 0) reasons.push('no_history');
  else if (d.priceCount < SCORING_WINDOW_DAYS / 2) reasons.push('insufficient_history_window');
  if (!d.hasFeatureSnapshot) reasons.push('missing_feature_snapshot');
  if (!d.hasFactorSnapshot) reasons.push('missing_factor_snapshot');
  if (!d.hasPrediction) reasons.push('missing_prediction');
  if (d.hasPrediction && !d.onLeaderboard) reasons.push('not_on_latest_leaderboard_slice');
  return reasons;
}

async function main(): Promise<void> {
  console.log('=== Scored-Symbol Gap Diagnostic ===\n');

  const leaderboardSymbols = new Set<string>();
  try {
    const lr = await pool.query(
      `SELECT DISTINCT pr.symbol
       FROM prediction_registry pr
       WHERE pr.prediction_date = (
         SELECT MAX(prediction_date) FROM prediction_registry
       )`
    );
    for (const row of lr.rows) {
      leaderboardSymbols.add((row as any).symbol);
    }
  } catch {
    console.log('  [WARN] Could not query leaderboard (prediction_registry may be empty)');
  }

  const verifiedResult = await pool.query(
    `SELECT symbol, company_name FROM symbols WHERE listing_status = 'Active' ORDER BY symbol`
  );

  const verifiedSymbols = verifiedResult.rows as { symbol: string; company_name: string }[];
  console.log(`Verified symbols in DB: ${verifiedSymbols.length}`);
  console.log(`Scoring window: ${SCORING_WINDOW_DAYS} days\n`);

  const diagnostics: SymbolDiagnostic[] = [];

  for (const vs of verifiedSymbols) {
    const sym = vs.symbol;
    const d: SymbolDiagnostic = {
      symbol: sym,
      inCompanyRegistry: false,
      inSymbolRegistry: true,
      hasLatestPrice: false,
      priceCount: 0,
      oldestPriceDate: null,
      newestPriceDate: null,
      hasFeatureSnapshot: false,
      featureCount: 0,
      hasFactorSnapshot: false,
      factorCount: 0,
      hasPrediction: false,
      predictionCount: 0,
      hasFinancialSnapshot: false,
      financialCount: 0,
      onLeaderboard: leaderboardSymbols.has(sym),
      missingReasons: [],
    };

    // Check company registry (master_security_registry)
    try {
      const reg = await pool.query(
        'SELECT symbol FROM master_security_registry WHERE symbol = $1',
        [sym]
      );
      d.inCompanyRegistry = reg.rows.length > 0;
    } catch { d.inCompanyRegistry = false; }

    // Check daily prices
    try {
      const prices = await pool.query(
        `SELECT COUNT(*)::int AS cnt,
                MIN(trade_date)::text AS oldest,
                MAX(trade_date)::text AS newest
         FROM daily_prices WHERE symbol = $1`,
        [sym]
      );
      const pRow = prices.rows[0] as any;
      d.priceCount = pRow.cnt;
      d.oldestPriceDate = pRow.oldest;
      d.newestPriceDate = pRow.newest;
      d.hasLatestPrice = d.priceCount > 0 && pRow.newest !== null;
    } catch { /* no prices */ }

    // Check feature snapshots
    try {
      const feat = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM feature_snapshots WHERE symbol = $1`,
        [sym]
      );
      d.featureCount = (feat.rows[0] as any).cnt;
      d.hasFeatureSnapshot = d.featureCount > 0;
    } catch { /* no features */ }

    // Check factor snapshots
    try {
      const fac = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM factor_snapshots WHERE symbol = $1`,
        [sym]
      );
      d.factorCount = (fac.rows[0] as any).cnt;
      d.hasFactorSnapshot = d.factorCount > 0;
    } catch { /* no factors */ }

    // Check predictions
    try {
      const pred = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM prediction_registry WHERE symbol = $1`,
        [sym]
      );
      d.predictionCount = (pred.rows[0] as any).cnt;
      d.hasPrediction = d.predictionCount > 0;
    } catch { /* no predictions */ }

    // Check financial snapshots
    try {
      const fin = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM financial_snapshots WHERE symbol = $1`,
        [sym]
      );
      d.financialCount = (fin.rows[0] as any).cnt;
      d.hasFinancialSnapshot = d.financialCount > 0;
    } catch { /* no financials */ }

    d.missingReasons = classifyMissingReasons(d);
    diagnostics.push(d);
  }

  // Print table
  const header = `${'Symbol'.padEnd(16)} ${'Reg'.padEnd(4)} ${'Prices'.padEnd(6)} ${'Count'.padEnd(6)} ${'Features'.padEnd(9)} ${'Factors'.padEnd(8)} ${'Preds'.padEnd(6)} ${'Fin'.padEnd(4)} ${'Lead'.padEnd(5)} ${'Missing Reasons'}`;
  const sep = '─'.repeat(header.length);

  console.log(header);
  console.log(sep);

  let scored = 0;
  const reasonCounts: Record<string, number> = {};

  for (const d of diagnostics) {
    const lead = d.onLeaderboard ? '✓' : '✗';
    const reasons = d.missingReasons.length > 0 ? d.missingReasons.join(', ') : 'none (scored)';
    if (d.onLeaderboard) scored++;

    for (const r of d.missingReasons) {
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }

    const line = `${d.symbol.padEnd(16)} ${(d.inCompanyRegistry ? '✓' : '✗').padEnd(4)} ${(d.hasLatestPrice ? '✓' : '✗').padEnd(6)} ${String(d.priceCount).padEnd(6)} ${(d.hasFeatureSnapshot ? '✓' : '✗').padEnd(9)} ${(d.hasFactorSnapshot ? '✓' : '✗').padEnd(8)} ${(d.hasPrediction ? '✓' : '✗').padEnd(6)} ${(d.hasFinancialSnapshot ? '✓' : '✗').padEnd(4)} ${lead.padEnd(5)} ${reasons}`;
    console.log(line);
  }

  console.log(sep);
  console.log(`\nScored/Leaderboard symbols: ${scored} / ${diagnostics.length}`);

  // Summary by reason
  if (Object.keys(reasonCounts).length > 0) {
    console.log('\nGap summary:');
    for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${reason}: ${count} symbols`);
    }
  }

  console.log('\nDiagnostic complete.');
}

main().catch((err) => {
  console.error('Diagnostic failed:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
