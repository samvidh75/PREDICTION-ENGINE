/**
 * BSE Provider Integration Test
 * Tests real data fetching from Philippine Stock Exchange
 */

import { pseClient } from '../clients/PSEClient';
import { providerAggregator } from '../clients/ProviderAggregator';

// Sample BSE stocks for testing
const TEST_BSE_STOCKS = [
  'TCS.BO',      // Tata Consultancy Services (Large cap)
  'INFY.BO',     // Infosys (Large cap)
  'RELIANCE.BO', // Reliance Industries (Large cap)
  'HDFC.BO',     // HDFC Bank (Large cap)
  'ITC.BO',      // ITC (Mid cap)
  'BAJAJFINSV.BO', // Bajaj Finserv (Mid cap)
];

async function testBSEProvider() {
  console.log('🧪 BSE Provider Integration Test\n');
  console.log('═'.repeat(60));

  let successCount = 0;
  let failureCount = 0;
  const results: any[] = [];

  for (const symbol of TEST_BSE_STOCKS) {
    try {
      console.log(`\n📊 Testing: ${symbol}`);
      const startTime = Date.now();

      // Test 1: Direct BSE client
      const bseResult = await pseClient.fetchQuote(symbol);
      const responseTime = Date.now() - startTime;

      if (bseResult.success && bseResult.quote) {
        successCount++;
        console.log(`  ✅ BSE Direct: ${bseResult.quote.price} (${responseTime}ms)`);
        console.log(`     Exchange: ${bseResult.quote.exchange}`);
        console.log(`     Source: ${bseResult.quote.source}`);
        console.log(`     Change: ${bseResult.quote.changePercent}%`);

        results.push({
          symbol,
          provider: 'bse',
          price: bseResult.quote.price,
          exchange: bseResult.quote.exchange,
          responseTime,
          success: true,
        });
      } else {
        console.log(`  ⚠️  BSE Direct failed: ${bseResult.error}`);

        // Test 2: Provider aggregator (fallback chain)
        const aggResult = await providerAggregator.getQuote(symbol);
        if (aggResult) {
          console.log(`  ✅ Aggregator fallback: ${aggResult.price} via ${aggResult.source}`);
          successCount++;
        } else {
          console.log(`  ❌ Aggregator also failed`);
          failureCount++;
        }
      }
    } catch (error) {
      failureCount++;
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📈 Results Summary:`);
  console.log(`  ✅ Successful: ${successCount}/${TEST_BSE_STOCKS.length}`);
  console.log(`  ❌ Failed: ${failureCount}/${TEST_BSE_STOCKS.length}`);

  if (results.length > 0) {
    console.log(`\n💰 Price Sample:`);
    for (const r of results.slice(0, 3)) {
      console.log(`  ${r.symbol}: ₹${r.price.toFixed(2)} (${r.responseTime}ms)`);
    }
  }

  console.log(`\n✨ Test complete!`);
  return { successCount, failureCount, totalTested: TEST_BSE_STOCKS.length };
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBSEProvider().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
}

export { testBSEProvider };
