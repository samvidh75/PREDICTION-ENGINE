/**
 * Scheduled job runner for IndianAPI Premium ingestion.
 *
 * Usage:
 *   npm run job:indianapi-premium
 *   npm run job:indianapi-premium -- --market-hours
 *   npm run job:indianapi-premium -- --eod
 */

import { IndianApiPremiumConfig } from '../src/backend/integrations/indianapi/IndianApiPremiumConfig';
import { execSync } from 'node:child_process';

function main(): void {
  const config = IndianApiPremiumConfig.getInstance();
  const summary = config.getSummary();

  console.log(`IndianAPI Premium Job — ${new Date().toISOString()}`);
  console.log('──────────────────────────────────────');

  if (!summary.enabled) {
    console.log('Job: SKIPPED — Premium ingestion disabled');
    process.exit(0);
  }

  if (!summary.hasApiKey) {
    console.log('Job: SKIPPED — No API key configured');
    process.exit(0);
  }

  const isMarketHours = process.argv.includes('--market-hours');
  const isEod = process.argv.includes('--eod');

  if (isMarketHours) {
    console.log('Mode: Market hours (incremental, top symbols)');
    const cmd = 'python3 scripts/python/ingest_indianapi_premium.py --limit=30 --write --scan';
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', env: process.env });
  } else if (isEod) {
    console.log('Mode: End of day (full universe)');
    const cmd = 'python3 scripts/python/ingest_indianapi_premium.py --from-db --write';
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', env: process.env });
  } else {
    console.log('Mode: Default (top symbols)');
    const symbols = 'RELIANCE,ITC,TCS,INFY,HDFCBANK,ICICIBANK,SBIN,BHARTIARTL,HINDUNILVR,BAJFINANCE';
    const cmd = `python3 scripts/python/ingest_indianapi_premium.py --symbols=${symbols} --write --scan`;
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', env: process.env });
  }

  console.log('\nJob complete.');
}

main();
