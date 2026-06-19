export interface ProviderHealthSnapshot {
  providerName: string;
  status: "healthy" | "degraded" | "unavailable" | "unknown";
  lastCheck: string;
  latencyMs: number | null;
  error: string | null;
}

export interface DataQualityDashboard {
  symbolCount: number;
  quoteCoverage: number;
  fundamentalsCoverage: number;
  historyCoverage: number;
  highQualityCount: number;
  mediumQualityCount: number;
  lowQualityCount: number;
  insufficientCount: number;
  missingFeatureCounts: Record<string, number>;
}

export interface EngineConfidenceReport {
  methodologyVersion: string;
  totalScored: number;
  averageConfidence: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  topFactorDrivers: Record<string, number>;
  missingInputFrequency: Record<string, number>;
}
