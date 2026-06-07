// live_validation.ts
import { MarketDataGateway } from '../services/data/MarketDataGateway';

const symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HAL.NS'];

async function validate() {
  const results: any = {};
  for (const sym of symbols) {
    const key = sym.replace('.NS', '').replace('.BO', '');
    try {
      const quote = await MarketDataGateway.getQuote(key);
      const metadata = await MarketDataGateway.getCompany(key);
      const history = await MarketDataGateway.getHistory(key);
      results[sym] = { quote, metadata, history, status: 'success' };
    } catch (e) {
      results[sym] = { error: (e as Error).message, status: 'failure' };
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

validate();
