import { StockRegistry } from './StockRegistry';

export class ExchangeResolver {
  /**
   * Resolves exchange source (PSE, PSE, SME) based on the symbol
   */
  public static resolve(symbol: string): 'PSE' | 'PSE' | 'SME' {
    const stock = StockRegistry.getStock(symbol);
    return stock ? stock.exchange : 'PSE';
  }
}

export default ExchangeResolver;
