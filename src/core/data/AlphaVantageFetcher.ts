/**
 * Alpha Vantage Data Fetcher
 * Handles all communication with Alpha Vantage API
 */

import { ICompanyTelemetry, MarketDataResponse } from '../../types/market';
import { MarketConfig, getSecureApiConfig } from '../MarketConfig';

const buildAlphaVantageUrl = (symbol: string, apiKey: string): string => {
  const params = new URLSearchParams({
    function: 'GLOBAL_QUOTE',
    symbol: symbol.toUpperCase(),
    apikey: apiKey,
    datatype: 'json',
  });

  return `${MarketConfig.alphaVantageBaseUrl}?${params.toString()}`;
};

export const fetchFromAlphaVantage = async (
  symbol: string
): Promise<MarketDataResponse> => {
  try {
    const config = getSecureApiConfig();

    if (!config.alphaVantage.enabled || !config.alphaVantage.key) {
      return {
        success: false,
        data: null,
        error: 'Alpha Vantage API not configured',
      };
    }

    const url = buildAlphaVantageUrl(symbol, config.alphaVantage.key);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API rate limit or error response
    if (data['Error Message'] || data['Note']) {
      return {
        success: false,
        data: null,
        error: data['Error Message'] || data['Note'],
      };
    }

    const quote = data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      return {
        success: false,
        data: null,
        error: 'No quote data returned from Alpha Vantage',
      };
    }

    const telemetry: ICompanyTelemetry = {
      symbol: quote['01. symbol'] || symbol.toUpperCase(),
      companyName: symbol.toUpperCase(),
      sector: 'Unknown',
      currentPrice: parseFloat(quote['05. price'] || '0'),
      previousClose: parseFloat(quote['08. previous close'] || '0'),
      priceChange: parseFloat(quote['09. change'] || '0'),
      priceChangePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
      volume: parseInt(quote['06. volume'] || '0', 10),
      avgVolume: parseInt(quote['06. volume'] || '0', 10),
      marketCap: 0,
      peRatio: 0,
      pbRatio: 0,
      dividendYield: 0,
      timestamp: Date.now(),
      dataSource: 'ALPHA_VANTAGE',
      lastUpdated: new Date().toISOString(),
      isLive: true,
    };

    return {
      success: true,
      data: telemetry,
      cacheHit: false,
    };
  } catch (error) {
    console.error('Alpha Vantage fetch error:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Batch fetch multiple symbols from Alpha Vantage
 * Respects API rate limits (5 requests per minute for free tier)
 */
export const fetchMultipleFromAlphaVantage = async (
  symbols: string[],
  delayMs: number = 1200 // 1200ms delay ensures ~50 requests per minute
): Promise<Map<string, MarketDataResponse>> => {
  const results = new Map<string, MarketDataResponse>();

  for (const symbol of symbols) {
    const result = await fetchFromAlphaVantage(symbol);
    results.set(symbol, result);

    // Delay between requests to respect rate limits
    if (symbols.indexOf(symbol) < symbols.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
};
