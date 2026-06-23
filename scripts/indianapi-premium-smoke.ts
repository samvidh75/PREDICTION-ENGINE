import { IndianApiPremiumConfig } from '../src/backend/integrations/indianapi/IndianApiPremiumConfig';

async function main(): Promise<void> {
  const config = IndianApiPremiumConfig.getInstance();
  const summary = config.getSummary();

  console.log('IndianAPI Premium Smoke Test');
  console.log('──────────────────────────────────────');

  if (!summary.enabled) {
    console.log('Status: DISABLED');
    console.log('Set INDIANAPI_PREMIUM_ENABLED=true to enable.');
    process.exit(0);
  }

  if (!summary.hasApiKey) {
    console.log('Status: NO_API_KEY');
    console.log('Set INDIANAPI_PREMIUM_API_KEY or INDIANAPI_KEY.');
    process.exit(0);
  }

  console.log(`Status: CONFIGURED`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Timeout: ${summary.timeoutMs}ms`);
  console.log(`Concurrency: ${summary.concurrency}`);
  console.log(`Rate limit: ${summary.rateLimitPerMinute}/min`);
  console.log(`History enabled: ${summary.historyEnabled}`);
  console.log(`Scan enabled: ${summary.scanEnabled}`);

  // Check API reachability
  const symbols = process.argv.find(a => a.startsWith('--symbols='))?.split('=')[1] || 'RELIANCE,ITC,TCS,INFY,HDFCBANK';
  const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
  console.log(`\nTesting ${symbolList.length} symbols: ${symbolList.join(', ')}`);

  let successCount = 0;
  let failCount = 0;

  for (const symbol of symbolList) {
    try {
      const url = `${config.baseUrl}/stock?name=${symbol}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': config.apiKey!,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const hasData = data && (data.data || data.result || data.price || data.company_name);
        console.log(`  ${symbol}: OK` + (hasData ? '' : ' (empty response)'));
        successCount++;
      } else if (response.status === 403 || response.status === 401) {
        console.log(`  ${symbol}: AUTH_FAILED (HTTP ${response.status})`);
        failCount++;
      } else {
        console.log(`  ${symbol}: HTTP ${response.status}`);
        failCount++;
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('abort') || msg.includes('timeout')) {
        console.log(`  ${symbol}: TIMEOUT`);
      } else {
        console.log(`  ${symbol}: ERROR — ${msg.substring(0, 80)}`);
      }
      failCount++;
    }
  }

  console.log(`\nResults: ${successCount} success, ${failCount} failed out of ${symbolList.length}`);
  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
