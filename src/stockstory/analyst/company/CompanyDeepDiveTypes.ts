/**
 * Company Deep Dive Types
 */

export interface CompanyDeepDive {
  symbol: string;
  companyIdentity: string;
  businessProfile: string | null;
  thesisSummary: string;
  businessQuality: string;
  growthProfile: string;
  valuationProfile: string;
  riskRadar: string;
  earningsQuality: string;
  governanceOwnership: string;
  liquidityTechnical: string;
  sectorPeerContext: string;
  filingsDocuments: string;
  scenarioSensitivity: string;
  whatChanged: string[];
  whatToWatch: string[];
  limitations: string[];
  methodologyNote: string;
  disclaimer: string;
  generatedAt: string;
  confidence: string;
}

export interface DeepDiveInput {
  symbol: string;
  companyName?: string | null;
  sector?: string | null;
  qualityScore?: number | null;
  valuationScore?: number | null;
  growthScore?: number | null;
  riskScore?: number | null;
  thesis?: string | null;
  whatChanged?: string[];
  peers?: string[];
  hasDocuments?: boolean;
  governanceEvidence?: boolean;
}
