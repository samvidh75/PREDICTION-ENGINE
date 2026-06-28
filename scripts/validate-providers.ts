// scripts/validate-providers.ts
// 50-stock provider validation test
// Run: npx tsx scripts/validate-providers.ts

const TEST_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK',
  'BAJFINANCE', 'LT', 'WIPRO', 'AXISBANK', 'TITAN',
  'ASIANPAINT', 'MARUTI', 'SUNPHARMA', 'NTPC', 'ONGC',
  'POWERGRID', 'NESTLEIND', 'ULTRACEMCO', 'M&M', 'TATAMOTORS',
  'JSWSTEEL', 'ADANIPORTS', 'HCLTECH', 'GRASIM', 'INDUSINDBK',
  'DRREDDY', 'CIPLA', 'TECHM', 'BAJAJFINSV', 'HINDALCO',
  'TATACONSUM', 'DIVISLAB', 'COALINDIA', 'BPCL', 'SBILIFE',
  'EICHERMOT', 'BRITANNIA', 'HEROMOTOCO', 'HDFCLIFE', 'APOLLOHOSP',
  'ADANIENT', 'TRENT', 'BAJAJHLDNG', 'DLF', 'GODREJCP',
];

interface ProviderResult {
  symbol: string;
  provider: string;
  success: boolean;
  fields: number;
  error?: string;
  latencyMs: number;
}

async function testProvider(
  name: string,
  fn: () => Promise<any>,
  symbol: string,
): Promise<ProviderResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const fields = result ? Object.keys(result).filter(k => !k.startsWith('_')).length : 0;
    return {
      symbol,
      provider: name,
      success: true,
      fields,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      symbol,
      provider: name,
      success: false,
      fields: 0,
      error: err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100),
      latencyMs: Date.now() - start,
    };
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  PROVIDER VALIDATION — 50 Indian Stocks');
  console.log('═'.repeat(70));
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log(`  Symbols: ${TEST_SYMBOLS.length}\n`);

  // Import providers dynamically (works in Node.js with tsx)
  const { ProviderCoordinator } = await import('../src/services/providers/ProviderCoordinator');
  const { TrendlyneProvider } = await import('../src/services/providers/unified/TrendlyneProvider');

  const coordinator = new ProviderCoordinator();
  const trendlyne = new TrendlyneProvider();

  const allResults: ProviderResult[] = [];
  let coordinatorSuccess = 0;
  let coordinatorFail = 0;
  let trendlyneSuccess = 0;
  let trendlyneFail = 0;

  // Test each symbol
  for (let i = 0; i < TEST_SYMBOLS.length; i++) {
    const symbol = TEST_SYMBOLS[i];
    const pct = ((i + 1) / TEST_SYMBOLS.length * 100).toFixed(0);
    process.stdout.write(`  [${pct}%] ${symbol} ... `);

    // Test ProviderCoordinator (all existing providers)
    const coordResult = await testProvider(
      'coordinator',
      () => coordinator.getFinancials(symbol),
      symbol,
    );
    allResults.push(coordResult);
    if (coordResult.success) coordinatorSuccess++;
    else coordinatorFail++;

    // Test Trendlyne
    const tlResult = await testProvider(
      'trendlyne',
      () => trendlyne.getFundamentals(symbol),
      symbol,
    );
    allResults.push(tlResult);
    if (tlResult.success) trendlyneSuccess++;
    else trendlyneFail++;

    const cStatus = coordResult.success ? '✓' : '✗';
    const tStatus = tlResult.success ? '✓' : '✗';
    process.stdout.write(`Coord: ${cStatus} (${coordResult.latencyMs}ms)  Trendlyne: ${tStatus} (${tlResult.latencyMs}ms)\n`);
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('  RESULTS SUMMARY');
  console.log('═'.repeat(70));

  const printProviderSummary = (name: string, success: number, fail: number, results: ProviderResult[]) => {
    const total = success + fail;
    const rate = total > 0 ? (success / total * 100).toFixed(1) : '0.0';
    const providerResults = results.filter(r => r.provider === (name === 'coordinator' ? 'coordinator' : 'trendlyne'));
    const avgLatency = providerResults.length > 0
      ? Math.round(providerResults.reduce((s, r) => s + r.latencyMs, 0) / providerResults.length)
      : 0;
    const avgFields = providerResults.filter(r => r.success).length > 0
      ? Math.round(providerResults.filter(r => r.success).reduce((s, r) => s + r.fields, 0) / providerResults.filter(r => r.success).length)
      : 0;

    console.log(`\n  📊 ${name}`);
    console.log(`     Success: ${success}/${total} (${rate}%)`);
    console.log(`     Avg Latency: ${avgLatency}ms`);
    console.log(`     Avg Fields: ${avgFields}`);

    if (fail > 0) {
      console.log(`     Failures:`);
      providerResults.filter(r => !r.success).slice(0, 5).forEach(r => {
        console.log(`       • ${r.symbol}: ${r.error}`);
      });
      if (fail > 5) console.log(`       ... and ${fail - 5} more`);
    }
  };

  printProviderSummary('coordinator', coordinatorSuccess, coordinatorFail, allResults);
  printProviderSummary('trendlyne', trendlyneSuccess, trendlyneFail, allResults);

  const totalSuccess = coordinatorSuccess + trendlyneSuccess;
  const totalTests = TEST_SYMBOLS.length * 2;
  const overallRate = (totalSuccess / totalTests * 100).toFixed(1);

  console.log(`\n  ${'═'.repeat(50)}`);
  console.log(`  OVERALL: ${totalSuccess}/${totalTests} passed (${overallRate}%)`);
  console.log(`  ${'═'.repeat(50)}`);
}

main().catch(console.error);
