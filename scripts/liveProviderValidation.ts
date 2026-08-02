// scripts/liveProviderValidation.ts
import { MarketDataGateway } from "../src/services/data/MarketDataGateway";

const symbols = [
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'HAL.NS',
];

async function validate() {
  const results: any[] = [];
  for (const sym of symbols) {
    const symbol = sym.replace('.NS', '').replace('.BO', '');
    try {
      const price = await MarketDataGateway.getQuote(sym);
      const metadata = await MarketDataGateway.getCompany(sym);
      const history = await MarketDataGateway.getHistory(sym);
      results.push({
        symbol,
        success: !!(price && metadata && history),
        recordsReturned: {
            quote: !!price,
            metadata: !!metadata,
            historical: Array.isArray(history) ? history.length : 0,
            financials: false, // Not called
            news: false // Not called
        },
        provider: 'Yahoo',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      results.push({
        symbol,
        success: false,
        recordsReturned: null,
        error: (e as Error).message,
        provider: 'Yahoo',
        timestamp: new Date().toISOString(),
      });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

validate();
