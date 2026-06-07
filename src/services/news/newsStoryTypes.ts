import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../synthesis/neuralMarketSynthesisTypes";
import type { CompanyUniverseModel } from "../../types/CompanyUniverse";

export type NewsStoryLayerId = "major" | "sector" | "company" | "macro" | "earnings" | "educational";

export type NewsEventKind =
  | "major_development"
  | "sector_movement"
  | "company_update"
  | "macro_event"
  | "earnings_development"
  | "educational_context";

export type NewsEvent = {
  id: string;
  kind: NewsEventKind;
  title: string;

  /**
   * 1-2 sentences summary (educational; no certainty language).
   */
  summary: string;

  /**
   * Why it matters explanation (pacing + interpretation framing).
   */
  impactExplanation: string;

  affectedSectors: string[];
  relatedCompanies: string[];

  /**
   * Optional historical parallels to help interpret “what changed?”
   */
  historicalParallels?: string[];

  confidenceTone: ConfidenceState;
};

export type NewsEducationalPanel = {
  headline: string;
  body: string;

  glossary: Array<{
    term: string;
    definition: string;
  }>;

  trustLine: string;
};

export type BuiltNewsStory = {
  narrativeSeed: number;

  layers: Record<NewsStoryLayerId, NewsEvent[]>;

  educational: NewsEducationalPanel;
};

export type BuildNewsStoryInputs = {
  synthesis: NeuralMarketSynthesis;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner: boolean;

  /**
   * Optional company context to generate “company-specific intelligence” layer.
   */
  company?: CompanyUniverseModel | null;

  /**
   * Used to deterministically vary copy across sessions.
   */
  narrativeKey: number;
};
