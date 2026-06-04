// src/services/providers/ProviderInterfaces.ts
// Re-export all provider interfaces and data types for convenient imports.

export type { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from '../data/types';
export type { PriceProvider } from './PriceProvider';
export type { MetadataProvider } from './MetadataProvider';
export type { HistoricalProvider } from './HistoricalProvider';
export type { NewsProvider, NewsItem } from './NewsProvider';
export type { FinancialProvider } from './FinancialProvider';
