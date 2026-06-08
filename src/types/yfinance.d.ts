declare module 'yfinance' {
  export interface YFinanceOptions {
    period1?: string | Date;
    period2?: string | Date;
    interval?: '1d' | '1wk' | '1mo';
    events?: string;
    includeAdjustedClose?: boolean;
    period?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';
    lang?: string;
  }

  export interface YFinanceQuote {
    symbol: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    marketCap?: number;
    currency?: string;
    exchange?: string;
    quoteType?: string;
    [key: string]: unknown;
  }

  export interface YFinanceHistoricalRow {
    date: string | Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjClose?: number;
    [key: string]: unknown;
  }

  // Class-based API
  export function Ticker(symbol: string): {
    history(options?: YFinanceOptions): Promise<YFinanceHistoricalRow[]>;
    info: Promise<Record<string, unknown>>;
    actions: Promise<Record<string, unknown>>;
    dividends: Promise<Record<string, unknown>>;
    splits: Promise<Record<string, unknown>>;
    financials: Promise<Record<string, unknown>>;
    balanceSheet: Promise<Record<string, unknown>>;
    cashflow: Promise<Record<string, unknown>>;
    earnings: Promise<Record<string, unknown>>;
    recommendations: Promise<Record<string, unknown>>;
  };

  export function download(
    symbols: string | string[],
    options?: YFinanceOptions & { groupBy?: 'ticker' | 'column'; threads?: boolean }
  ): Promise<Record<string, YFinanceHistoricalRow[]>>;

  export function historical(symbol: string, options?: YFinanceOptions): Promise<YFinanceHistoricalRow[]>;
  export function quote(symbol: string | string[]): Promise<YFinanceQuote | YFinanceQuote[]>;
  export function summary(symbol: string): Promise<Record<string, unknown>>;
  export function search(query: string): Promise<Record<string, unknown>>;
}
