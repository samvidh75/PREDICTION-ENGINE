import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";

export type DiscoveryEntityKind =
  | "stock"
  | "sector"
  | "theme"
  | "market_narrative"
  | "institutional_environment"
  | "behavioural_condition"
  | "macro_trend";

export type DiscoveryEntity = {
  id: string;
  kind: DiscoveryEntityKind;

  // editorial identifiers for UI
  title: string;
  shortNarrative: string;

  // keywords used for adaptive matching
  keywords: string[];

  // relationship hints used for “narrative relationship engine”
  relationshipTags: string[];

  // optional details for detail view
  details?: {
    executiveNarrative?: string;
    confidenceEnvironmentHint?: string;
    marketContextHint?: string;
    relatedSectors?: string[];
    volatilityHint?: string;
    liquidityHint?: string;
    institutionalHint?: string;
    behaviouralHint?: string;
  };
};

export type DiscoveryResult = {
  id: string;
  kind: DiscoveryEntityKind;

  title: string;
  narrativeSummary: string;

  confidenceEnvironment: string;
  marketContext: string;

  relationshipIndicators: string[];

  /**
   * Optional intelligence card fields (used by the universal discovery overlay).
   * Kept optional so discovery entities can remain lightweight.
   */
  ticker?: string; // e.g. RELIANCE
  companyName?: string; // e.g. Reliance Industries Limited
  sector?: string; // e.g. Energy & Retail / Banking / IT Services
  miniChartSeed?: string; // stable seed key for mini spark previews
};

export type DiscoverySearchInput = {
  query: string;
  confidenceState: ConfidenceState;
  marketStateLabel: string; // educational label / string union from ConfidenceEngine marketState
  narrativeKey: number;

  preferredSectors?: string[];
  preferredThemes?: string[];
};

export type DiscoveryMemory = {
  preferredSectors: string[];
  preferredThemes: string[];
  lastUpdatedAt: number;
};
