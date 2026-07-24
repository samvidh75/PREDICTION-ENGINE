export interface SectorInfo {
  slug: string;
  name: string;
  description: string;
  companyCount: number;
  icon?: string;
}

export interface SectorContent {
  slug: string;
  name: string;
  summary: string;
  overview: string;
  keyMetrics: string[];
  risks: string[];
  opportunities: string[];
}

export const SECTORS: SectorInfo[] = [
  { slug: "banking", name: "Banking", description: "PSX banking sector including public and private banks.", companyCount: 12 },
  { slug: "it", name: "IT Services", description: "Information technology and software services companies.", companyCount: 8 },
  { slug: "pharma", name: "Pharmaceuticals", description: "Pharmaceutical and drug manufacturing companies.", companyCount: 10 },
  { slug: "auto", name: "Automotive", description: "Automobile manufacturers and auto component makers.", companyCount: 9 },
  { slug: "fmcg", name: "FMCG", description: "Fast-moving consumer goods companies.", companyCount: 7 },
  { slug: "oil-gas", name: "Oil & Gas", description: "Oil, gas, and energy sector companies.", companyCount: 6 },
  { slug: "metal", name: "Metals & Mining", description: "Metal producers and mining companies.", companyCount: 5 },
  { slug: "power", name: "Power & Utilities", description: "Power generation and utility companies.", companyCount: 6 },
  { slug: "telecom", name: "Telecom", description: "Telecommunications service providers.", companyCount: 4 },
  { slug: "realty", name: "Real Estate", description: "Real estate development and construction companies.", companyCount: 5 },
  { slug: "consumer-durables", name: "Consumer Durables", description: "Consumer durable goods manufacturers.", companyCount: 6 },
  { slug: "infra", name: "Infrastructure", description: "Infrastructure and construction companies.", companyCount: 5 },
  { slug: "chemicals", name: "Chemicals", description: "Chemical manufacturing and processing companies.", companyCount: 6 },
  { slug: "textiles", name: "Textiles", description: "Textile and apparel manufacturing companies.", companyCount: 4 },
  { slug: "healthcare", name: "Healthcare", description: "Healthcare services and hospital chains.", companyCount: 5 },
];
