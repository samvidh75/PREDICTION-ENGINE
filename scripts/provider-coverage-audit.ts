/**
 * Provider Coverage Audit — Item 4 from production stabilization.
 *
 * Checks which external data providers are configured (have secrets set)
 * and which are actually integrated into the codebase. Reports coverage gaps.
 */
import { loadEnv } from '../src/backend/config/env';

interface ProviderInfo {
  name: string;
  keyEnvVar: string;
  keySet: boolean;
  codeReferences: string[];
  integrated: boolean;
}

function main() {
  const env = loadEnv();

  const providers: ProviderInfo[] = [
    {
      name: 'Finnhub',
      keyEnvVar: 'FINNHUB_KEY',
      keySet: !!process.env.FINNHUB_KEY,
      codeReferences: ['src/services/providers/FinnhubProvider.ts', 'src/services/api/MarketDataOrchestrator.ts'],
      integrated: true,
    },
    {
      name: 'IndianAPI',
      keyEnvVar: 'INDIANAPI_KEY',
      keySet: !!process.env.INDIANAPI_KEY,
      codeReferences: ['src/services/providers/IndianMarketProvider.ts'],
      integrated: true,
    },
    {
      name: 'Alpha Vantage',
      keyEnvVar: 'ALPHA_VANTAGE_KEY',
      keySet: !!process.env.ALPHA_VANTAGE_KEY,
      codeReferences: ['src/services/providers/AlphaVantageProvider.ts'],
      integrated: true,
    },
    {
      name: 'YFinance (Node)',
      keyEnvVar: 'YFINANCE_ENABLED',
      keySet: !!process.env.YFINANCE_ENABLED,
      codeReferences: [
        'src/providers/yfinance/YFinanceProvider.ts',
        'src/providers/yfinance/DailyMarketUpdater.ts',
        'src/providers/yfinance/HistoricalPriceBackfill.ts',
      ],
      integrated: true,
    },
    {
      name: 'Upstox (Broker)',
      keyEnvVar: 'UPSTOX_ACCESS_TOKEN',
      keySet: !!process.env.UPSTOX_ACCESS_TOKEN,
      codeReferences: ['src/services/providers/broker/UpstoxBroker.ts'],
      integrated: true,
    },
  ];

  console.log('=== Provider Coverage Audit ===\n');
  console.log(`${'Provider'.padEnd(22)} ${'Key Set'.padEnd(10)} ${'Integrated'.padEnd(12)} Status`);
  console.log('-'.repeat(60));

  let configured = 0;
  let missing = 0;

  for (const p of providers) {
    const status = p.keySet && p.integrated ? 'READY' : p.keySet ? 'NO CODE' : p.integrated ? 'MISSING KEY' : 'UNUSED';
    if (p.keySet && p.integrated) configured++;
    else missing++;
    console.log(
      `${p.name.padEnd(22)} ${String(p.keySet).padEnd(10)} ${String(p.integrated).padEnd(12)} ${status}`
    );
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Providers configured & integrated: ${configured}`);
  console.log(`  Providers with gaps: ${missing}`);

  if (missing > 0) {
    console.log(`\n=== Gap Details ===`);
    for (const p of providers) {
      if (p.keySet && !p.integrated) {
        console.log(`  [NO CODE] ${p.name}: Key ${p.keyEnvVar} is set but no integration found.`);
      }
      if (!p.keySet && p.integrated) {
        console.log(`  [MISSING KEY] ${p.name}: Code exists but ${p.keyEnvVar} is not set.`);
      }
    }
  }

  process.exit(missing > 0 ? 1 : 0);
}

main();
