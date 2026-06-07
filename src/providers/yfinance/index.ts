/**
 * TRACK-38A — YFinance Provider Module
 * Barrel exports for the yfinance ingestion layer.
 */

export { YFinanceProvider } from './YFinanceProvider';
export { YFinanceBatchProvider } from './YFinanceBatchProvider';
export { YFinanceValidator } from './YFinanceValidator';
export { YFinanceHealthEngine } from './YFinanceHealthEngine';
export { IndianSymbolMapper } from './IndianSymbolMapper';
export { HistoricalPriceBackfill } from './HistoricalPriceBackfill';
export { DailyMarketUpdater } from './DailyMarketUpdater';
export { MarketDataIntegrityEngine } from './MarketDataIntegrityEngine';
export { ProviderFailoverConfig } from './ProviderFailoverConfig';
export { CorporateActionsEngine } from './CorporateActionsEngine';
export { HistoricalUniversePopulator } from './HistoricalUniversePopulator';

export type {
  YahooHistoricalRow,
  YahooDividendRow,
  YahooSplitRow,
  YahooTickerInfo,
  DailyPriceRecord,
  CorporateAction,
  BackfillRange,
  BatchIngestionResult,
  QualityCheck,
  QualityScore,
  MarketDataProvider,
} from './types';

export { BACKFILL_RANGES } from './types';
