export interface FeatureFlags {
  localAi: {
    enabled: boolean;
  };
  researchBot: {
    enabled: boolean;
    maxSessionLength: number;
  };
  scoreExplanations: {
    enabled: boolean;
  };
  stockSnapshots: {
    enabled: boolean;
    parallelism: number;
  };
  stockComparison: {
    enabled: boolean;
    maxStocks: number;
  };
  scannerTheses: {
    enabled: boolean;
    cacheTtlHours: number;
    batchSize: number;
  };
  thesisTracking: {
    enabled: boolean;
    minScoreChange: number;
  };
}

export function loadFeatureFlags(): FeatureFlags {
  return {
    localAi: {
      enabled: process.env.LOCAL_AI_ENABLED === 'true',
    },
    researchBot: {
      enabled: process.env.ENABLE_RESEARCH_BOT !== 'false',
      maxSessionLength: parseInt(process.env.RESEARCH_BOT_MAX_SESSION || '20', 10),
    },
    scoreExplanations: {
      enabled: process.env.ENABLE_SCORE_EXPLANATIONS !== 'false',
    },
    stockSnapshots: {
      enabled: process.env.ENABLE_STOCK_SNAPSHOTS !== 'false',
      parallelism: parseInt(process.env.SNAPSHOT_PARALLELISM || '4', 10),
    },
    stockComparison: {
      enabled: process.env.ENABLE_STOCK_COMPARISON !== 'false',
      maxStocks: parseInt(process.env.COMPARISON_MAX_STOCKS || '10', 10),
    },
    scannerTheses: {
      enabled: process.env.ENABLE_SCANNER_THESES !== 'false',
      cacheTtlHours: parseInt(process.env.THESIS_CACHE_TTL_HOURS || '24', 10),
      batchSize: parseInt(process.env.THESIS_BATCH_SIZE || '50', 10),
    },
    thesisTracking: {
      enabled: process.env.ENABLE_THESIS_TRACKING !== 'false',
      minScoreChange: parseInt(process.env.THESIS_MIN_SCORE_CHANGE || '5', 10),
    },
  };
}

export const featureFlags = loadFeatureFlags();
