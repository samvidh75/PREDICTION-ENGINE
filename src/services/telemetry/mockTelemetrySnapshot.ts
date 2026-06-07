import { TelemetrySnapshot } from '../../types/stock';

export const mockTelemetrySnapshot: TelemetrySnapshot = {
  healthScore: 78,
  healthStatus: "healthy",

  confidenceScore: 81,
  confidenceStatus: "strong",

  valuationScore: 65,
  valuationStatus: "fairlyPriced",

  momentumScore: 73,
  momentumStatus: "accelerating",

  lastUpdated: new Date().toISOString(),
};

export default mockTelemetrySnapshot;
