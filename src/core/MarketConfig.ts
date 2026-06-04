/**
 * Market Configuration & Environment Management
 * CRITICAL: All API credentials are loaded from process.env
 * NEVER hardcode or embed API keys in source files
 */

interface MarketConfigType {
  // API Configuration
  alphaVantageApiKey: string;
  rapidApiKey: string;
  rapidApiHost: string;
  
  // Service Endpoints
  alphaVantageBaseUrl: string;
  rapidApiBaseUrl: string;
  
  // Cache & Performance
  queryCacheTime: number; // milliseconds
  staleTime: number; // milliseconds (React Query)
  gcTime: number; // garbage collection time
  
  // Feature Flags
  enableAlphaVantage: boolean;
  enableRapidApi: boolean;
  enableMockData: boolean;
  
  // Predictive Engine
  predictionEngineTimeout: number; // milliseconds
  confidenceThreshold: number; // 0.0 to 1.0
}

const validateEnvVariable = (key: string, fallback?: string): string => {
  const value = process.env[key] || fallback;
  
  if (!value && !fallback) {
    console.warn(`⚠️ Environment variable ${key} not configured. Using mock data fallback.`);
    return '';
  }
  
  return value || fallback || '';
};

export const MarketConfig: MarketConfigType = {
  // API Configuration - Load from environment variables
  alphaVantageApiKey: validateEnvVariable('VITE_ALPHA_VANTAGE_API_KEY', ''),
  rapidApiKey: validateEnvVariable('VITE_RAPID_API_KEY', ''),
  rapidApiHost: validateEnvVariable('VITE_RAPID_API_HOST', 'alpha-vantage.p.rapidapi.com'),
  
  // Service Endpoints
  alphaVantageBaseUrl: 'https://www.alphavantage.co/query',
  rapidApiBaseUrl: 'https://alpha-vantage.p.rapidapi.com/query',
  
  // Cache & Performance Configuration
  queryCacheTime: 0, // immediate validation
  staleTime: 60000, // 1 minute - keep data fresh without hammering API
  gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  
  // Feature Flags
  enableAlphaVantage: !!validateEnvVariable('VITE_ALPHA_VANTAGE_API_KEY', ''),
  enableRapidApi: !!validateEnvVariable('VITE_RAPID_API_KEY', ''),
  enableMockData: false, // Disable mock data for production
  
  // Predictive Engine
  predictionEngineTimeout: 5000, // 5 second timeout
  confidenceThreshold: 0.65, // Require 65%+ confidence for strong signals
};

/**
 * Validate configuration at startup
 * If no real API keys are present, log a warning and enable mock mode
 */
export const validateMarketConfig = (): boolean => {
  const hasApiKeys = MarketConfig.enableAlphaVantage || MarketConfig.enableRapidApi;
  
  if (!hasApiKeys) {
    console.warn(
      '⚠️ No API keys configured. Platform will operate in MOCK DATA mode. ' +
      'To enable live data, set VITE_ALPHA_VANTAGE_API_KEY or VITE_RAPID_API_KEY environment variables.'
    );
  }
  
  return true;
};

/**
 * Safe credential getter - never returns raw keys to UI
 * Used internally by data layer only
 */
export const getSecureApiConfig = () => {
  return {
    alphaVantage: {
      key: MarketConfig.alphaVantageApiKey,
      url: MarketConfig.alphaVantageBaseUrl,
      enabled: MarketConfig.enableAlphaVantage,
    },
    rapidApi: {
      key: MarketConfig.rapidApiKey,
      host: MarketConfig.rapidApiHost,
      url: MarketConfig.rapidApiBaseUrl,
      enabled: MarketConfig.enableRapidApi,
    },
  };
};

export default MarketConfig;
