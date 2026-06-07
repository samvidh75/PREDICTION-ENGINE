/**
 * Mock Data Fetcher
 * Provides realistic placeholder telemetry for development & testing
 * When enabled, supplies consistent demo data across the platform
 */

import { ICompanyTelemetry, MarketDataResponse } from '../../types/market';

const MOCK_COMPANIES: Record<string, Partial<ICompanyTelemetry>> = {
  INFY: {
    companyName: 'Infosys Limited',
    sector: 'Information Technology',
    currentPrice: 1847.50,
    previousClose: 1839.00,
    priceChange: 8.50,
    priceChangePercent: 0.46,
    volume: 1245600,
    avgVolume: 1189400,
    marketCap: 763000000000,
    peRatio: 28.5,
    pbRatio: 5.2,
    dividendYield: 1.35,
  },
  TCS: {
    companyName: 'Tata Consultancy Services',
    sector: 'Information Technology',
    currentPrice: 3642.80,
    previousClose: 3628.50,
    priceChange: 14.30,
    priceChangePercent: 0.39,
    volume: 652300,
    avgVolume: 725400,
    marketCap: 1197000000000,
    peRatio: 31.2,
    pbRatio: 4.8,
    dividendYield: 1.62,
  },
  HDFCBANK: {
    companyName: 'HDFC Bank Limited',
    sector: 'Financial Services',
    currentPrice: 1649.95,
    previousClose: 1638.25,
    priceChange: 11.70,
    priceChangePercent: 0.71,
    volume: 2845100,
    avgVolume: 2912300,
    marketCap: 1372000000000,
    peRatio: 22.4,
    pbRatio: 3.2,
    dividendYield: 2.45,
  },
  RELIANCE: {
    companyName: 'Reliance Industries Limited',
    sector: 'Energy',
    currentPrice: 2389.60,
    previousClose: 2368.40,
    priceChange: 21.20,
    priceChangePercent: 0.90,
    volume: 1876200,
    avgVolume: 1934500,
    marketCap: 1821000000000,
    peRatio: 16.8,
    pbRatio: 2.1,
    dividendYield: 3.15,
  },
  ITC: {
    companyName: 'ITC Limited',
    sector: 'Consumer Goods',
    currentPrice: 443.25,
    previousClose: 438.90,
    priceChange: 4.35,
    priceChangePercent: 0.99,
    volume: 3642100,
    avgVolume: 3485600,
    marketCap: 542000000000,
    peRatio: 18.5,
    pbRatio: 2.8,
    dividendYield: 4.82,
  },
};

/**
 * Generate synthetic price movement for mock data
 * Creates realistic, time-based variation
 */
const generateSyntheticMovement = (basePrice: number): { change: number; percent: number } => {
  const now = Date.now();
  const seed = now % 10000; // Deterministic variation per 10-second window
  const volatility = (seed - 5000) / 100000; // Range: -0.05 to +0.05
  const change = basePrice * volatility;

  return {
    change: parseFloat(change.toFixed(2)),
    percent: parseFloat(((change / basePrice) * 100).toFixed(2)),
  };
};

export const fetchMockCompanyData = (symbol: string): MarketDataResponse => {
  try {
    const upperSymbol = symbol.toUpperCase();
    const mockBase = MOCK_COMPANIES[upperSymbol];

    if (!mockBase) {
      return {
        success: false,
        data: null,
        error: `Mock data not available for symbol ${upperSymbol}. Available symbols: ${Object.keys(MOCK_COMPANIES).join(', ')}`,
      };
    }

    // Generate synthetic movement based on current time
    const movement = generateSyntheticMovement(mockBase.currentPrice || 0);

    const telemetry: ICompanyTelemetry = {
      symbol: upperSymbol,
      companyName: mockBase.companyName || upperSymbol,
      sector: mockBase.sector || 'Unknown',
      currentPrice: (mockBase.currentPrice || 0) + movement.change,
      previousClose: mockBase.previousClose || 0,
      priceChange: movement.change,
      priceChangePercent: movement.percent,
      volume: mockBase.volume || 1000000,
      avgVolume: mockBase.avgVolume || 1000000,
      marketCap: mockBase.marketCap || 0,
      peRatio: mockBase.peRatio || 0,
      pbRatio: mockBase.pbRatio || 0,
      dividendYield: mockBase.dividendYield || 0,
      timestamp: Date.now(),
      dataSource: 'MOCK',
      lastUpdated: new Date().toISOString(),
      isLive: true,
    };

    return {
      success: true,
      data: telemetry,
      cacheHit: false,
    };
  } catch (error) {
    console.error('Mock data fetch error:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Batch fetch mock data for multiple symbols
 */
export const fetchMultipleMockData = (symbols: string[]): Map<string, MarketDataResponse> => {
  const results = new Map<string, MarketDataResponse>();

  for (const symbol of symbols) {
    results.set(symbol, fetchMockCompanyData(symbol));
  }

  return results;
};

/**
 * Get list of available mock symbols
 */
export const getAvailableMockSymbols = (): string[] => {
  return Object.keys(MOCK_COMPANIES);
};
