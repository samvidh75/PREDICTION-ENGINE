/**
 * Market configuration.
 *
 * TRACK-8E removed legacy provider configuration. Live market
 * data is routed through ProviderCoordinator and provider-specific services.
 */

interface MarketConfigType {
  queryCacheTime: number;
  staleTime: number;
  gcTime: number;
  enableMockData: boolean;
  predictionEngineTimeout: number;
  confidenceThreshold: number;
}

export const MarketConfig: MarketConfigType = {
  queryCacheTime: 0,
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  enableMockData: false,
  predictionEngineTimeout: 5_000,
  confidenceThreshold: 0.65,
};

export const validateMarketConfig = (): boolean => true;

export const getSecureApiConfig = () => ({});

export default MarketConfig;
