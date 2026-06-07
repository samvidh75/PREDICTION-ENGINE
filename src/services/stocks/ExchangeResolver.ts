import { StockRegistry } from './StockRegistry';

export class ExchangeResolver {
  /**
   * Resolves exchange source (NSE, BSE, SME) based on the symbol
   */
  public static resolve(symbol: string): 'NSE' | 'BSE' | 'SME' {
    const stock = StockRegistry.getStock(symbol);
    return stock ? stock.exchange : 'NSE';
  }
}

export default ExchangeResolver;
