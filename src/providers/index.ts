export interface IDataProvider {
  name: string;
  isAvailable(): Promise<boolean>;
}

export interface IQuoteProvider extends IDataProvider {
  getQuote(symbol: string): Promise<import('@/types').Quote | null>;
}

export interface IHistoricalProvider extends IDataProvider {
  getHistory(symbol: string, range: '1D'|'5D'|'1M'|'3M'|'6M'|'1Y'|'3Y'): Promise<import('@/types').HistoricalPrice[] | null>;
}

export interface IFundamentalsProvider extends IDataProvider {
  getFundamentals(symbol: string): Promise<import('@/types').Fundamentals | null>;
}
