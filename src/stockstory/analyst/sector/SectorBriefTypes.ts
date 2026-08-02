/**
 * Sector Brief Types
 */

export interface SectorBrief {
  sector: string;
  sectorSummary: string;
  qualityLeaders: Array<{ symbol: string; note: string }>;
  valuationContext: string;
  riskThemes: string[];
  earningsThemes: string[];
  momentumThemes: string[];
  filingsEventsToReview: string[];
  peerDislocations: string[];
  scannerOpportunities: string[];
  limitations: string[];
  disclaimer: string;
  generatedAt: string;
  confidence: string;
}

export interface SectorCompanyMetric {
  symbol: string;
  qualityScore?: number | null;
  valuationScore?: number | null;
  momentumScore?: number | null;
}
