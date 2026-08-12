/**
 * Enhanced Mock Data with Company Info, Metrics, and Analysis
 * Provides instant, deterministic data for <500ms page loads
 * Configured for Philippine Stock Exchange (PSE) companies
 */

export interface CompanyInfo {
  name: string;
  about: string;
  sector: string;
  industry: string;
  foundedYear?: number;
  employees?: number;
  website?: string;
}

export interface KeyMetrics {
  marketCap: number; // In PHP millions,
  currentPrice: number;
  peRatio: number;
  pbRatio: number;
  bookValue: number;
  dividendYield: number;
  roe: number;
  roce: number;
  faceValue: number;
  high52Week: number;
  low52Week: number;
  avgVolume: number;
  eps: number;
  debtToEquity: number;
  currentRatio: number;
  roicPercent: number;
}

export interface StockAnalysis {
  pros: string[];
  cons: string[];
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  investmentHorizon: '3M' | '6M' | '1Y' | '3Y';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  targetPrice: number;
}

const COMPANY_DATABASE: Record<string, CompanyInfo> = {
  'SM': {
    name: 'SM Investments Corporation',
    sector: 'Financials',
    industry: 'Conglomerate',
    about: 'SM Investments Corporation is the Philippines\' largest conglomerate with dominant positions in retail (SM Retail), banking (BDO, PNB), and property (SM Prime). The Sy family\'s flagship company drives economic growth across the archipelago.',
    foundedYear: 1958,
    website: 'www.sminvestments.com'
  },
  'BDO': {
    name: 'BDO Unibank Inc.',
    sector: 'Financials',
    industry: 'Banking',
    about: 'BDO Unibank is the Philippines\' largest bank by total assets, offering comprehensive banking services including consumer banking, corporate banking, investment banking, and remittance services through an extensive branch network nationwide.',
    foundedYear: 1968,
    website: 'www.bdo.com.ph'
  },
  'ALI': {
    name: 'Ayala Land Inc.',
    sector: 'Real Estate',
    industry: 'Property Development',
    about: 'Ayala Land is the Philippines\' leading property developer, known for creating large-scale integrated mixed-use estates, residential communities, commercial centers, and office developments across the country.',
    foundedYear: 1988,
    website: 'www.ayalaland.com.ph'
  },
  'BPI': {
    name: 'Bank of the Philippine Islands',
    sector: 'Financials',
    industry: 'Banking',
    about: 'BPI is the first bank in the Philippines and one of the largest universal banks, providing a full range of financial services including consumer and corporate banking, asset management, and insurance.',
    foundedYear: 1851,
    website: 'www.bpi.com.ph'
  },
  'AC': {
    name: 'Ayala Corporation',
    sector: 'Financials',
    industry: 'Conglomerate',
    about: 'Ayala Corporation is one of the Philippines\' oldest and largest conglomerates with investments spanning real estate (Ayala Land), banking (BPI, GCash), telecommunications (Globe), water (Manila Water), and energy (AC Energy).',
    foundedYear: 1834,
    website: 'www.ayala.com.ph'
  },
  'JFC': {
    name: 'Jollibee Foods Corporation',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    about: 'Jollibee Foods Corporation is the Philippines\' largest fast-food chain operator with a global portfolio including Jollibee, Chowking, Mang Inasal, Red Ribbon, and Coffee Bean & Tea Leaf across multiple countries.',
    foundedYear: 1978,
    website: 'www.jollibee.com.ph'
  },
  'TEL': {
    name: 'PLDT Inc.',
    sector: 'Telecommunications',
    industry: 'Telecom Services',
    about: 'PLDT is the Philippines\' largest telecommunications company, providing fixed-line, wireless, broadband, and digital services to millions of customers nationwide through its extensive fiber-optic network.',
    foundedYear: 1928,
    website: 'www.pldt.com'
  },
  'GLO': {
    name: 'Globe Telecom Inc.',
    sector: 'Telecommunications',
    industry: 'Telecom Services',
    about: 'Globe Telecom is one of the Philippines\' leading mobile and broadband providers, known for innovation in digital services, mobile banking (GCash), and expanding connectivity across the archipelago.',
    foundedYear: 1935,
    website: 'www.globe.com.ph'
  },
  'MER': {
    name: 'Manila Electric Company',
    sector: 'Utilities',
    industry: 'Power Distribution',
    about: 'Meralco is the Philippines\' largest electric distribution utility, serving over 7 million customers in Metro Manila and surrounding provinces with reliable power distribution services.',
    foundedYear: 1903,
    website: 'www.meralco.com.ph'
  },
  'ICT': {
    name: 'International Container Terminal Services Inc.',
    sector: 'Industrials',
    industry: 'Logistics & Ports',
    about: 'ICTSI is the Philippines\' leading port terminal operator with a global footprint across 6 continents. The company develops, manages, and operates container terminals in key strategic locations worldwide.',
    foundedYear: 1977,
    website: 'www.ictsi.com'
  },
  'URC': {
    name: 'Universal Robina Corporation',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    about: 'Universal Robina Corporation is one of the largest food and beverage companies in the Philippines with iconic brands including Jack & Jill, C2, Great Taste, and Nissin, exporting to over 50 countries.',
    foundedYear: 1954,
    website: 'www.urc.com.ph'
  },
  'SMPH': {
    name: 'SM Prime Holdings Inc.',
    sector: 'Real Estate',
    industry: 'Property Development',
    about: 'SM Prime Holdings is the Philippines\' largest integrated property developer, operating world-class shopping malls, residential developments, office buildings, and event centers across the country.',
    foundedYear: 1985,
    website: 'www.smprime.com'
  },
  'PGOLD': {
    name: 'Puregold Price Club Inc.',
    sector: 'Consumer Goods',
    industry: 'Retail',
    about: 'Puregold is one of the Philippines\' leading retail chains operating supermarkets, hypermarkets, and discount stores nationwide, serving the everyday needs of Filipino families.',
    foundedYear: 1998,
    website: 'www.puregold.com.ph'
  },
  'CEB': {
    name: 'Cebu Pacific Air Inc.',
    sector: 'Transportation',
    industry: 'Aviation',
    about: 'Cebu Pacific is the Philippines\' leading low-cost carrier, operating the widest domestic network and key international routes, known for making air travel accessible to more Filipinos.',
    foundedYear: 1996,
    website: 'www.cebupacificair.com'
  },
};

export function generateEnhancedMockData(symbol: string) {
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const normalizedHash = (hash % 1000) / 1000;

  const basePrice = 50 + (hash % 300);
  const marketCap = 5000000 + (hash % 500000000); // In PHP millions
  const peRatio = 3 + normalizedHash * 25;
  const roe = 5 + normalizedHash * 35;
  const roce = 8 + normalizedHash * 40;

  return {
    quote: {
      symbol,
      exchange: 'PSX' as const,
      price: basePrice,
      change: (Math.sin(hash / 100) * 5),
      changePercent: ((Math.sin(hash / 100) * 5) / basePrice) * 100,
      high: basePrice * 1.02,
      low: basePrice * 0.98,
      volume: 500000 + (hash % 5000000),
    },
    metrics: {
      marketCap,
      currentPrice: basePrice,
      peRatio: parseFloat(peRatio.toFixed(2)),
      pbRatio: 0.5 + normalizedHash * 4,
      bookValue: basePrice / (1.5 + normalizedHash),
      dividendYield: 3 + normalizedHash * 12,
      roe: parseFloat(roe.toFixed(1)),
      roce: parseFloat(roce.toFixed(1)),
      faceValue: 10,
      high52Week: basePrice * (1.3 + normalizedHash * 0.2),
      low52Week: basePrice * (0.7 - normalizedHash * 0.2),
      avgVolume: (200000 + (hash % 8000000)) / 1e6,
      eps: basePrice / peRatio,
      debtToEquity: 0.1 + normalizedHash * 1.5,
      currentRatio: 1.0 + normalizedHash * 2,
      roicPercent: 8 + normalizedHash * 25,
    } as KeyMetrics,
    company: COMPANY_DATABASE[symbol] || {
      name: symbol,
      about: `${symbol} is a Philippine Stock Exchange-listed company in its sector, delivering value to stakeholders through innovative products and services.`,
      sector: 'General',
      industry: 'General',
    } as CompanyInfo,
    analysis: {
      pros: [
        peRatio < 12 ? '✓ Attractive valuation at P/E below 12x' : '',
        roe > 15 ? '✓ Strong ROE (>15%) indicates quality earnings' : '',
        roce > 15 ? '✓ High ROCE suggests efficient capital deployment' : '',
        '✓ Strong market position and competitive moat',
      ].filter(Boolean),
      cons: [
        peRatio > 25 ? '✗ High valuation at P/E >25x' : '',
        roe < 8 ? '✗ Low ROE may indicate profitability challenges' : '',
        normalizedHash < 0.25 ? '✗ High debt levels require monitoring' : '',
        '✗ Sector cyclicality poses risks',
      ].filter(Boolean).slice(0, 3),
      recommendation:
        peRatio < 10 && roe > 20 ? 'BUY' :
        peRatio > 25 || roe < 8 ? 'SELL' : 'HOLD',
      investmentHorizon: normalizedHash > 0.7 ? '3Y' : normalizedHash > 0.4 ? '1Y' : '6M' as '3M' | '6M' | '1Y' | '3Y',
      riskLevel: normalizedHash < 0.3 ? 'HIGH' : normalizedHash < 0.7 ? 'MEDIUM' : 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
      targetPrice: basePrice * (0.9 + normalizedHash * 0.4),
    } as StockAnalysis,
  };
}

export function getCompanyName(symbol: string): string {
  const company = COMPANY_DATABASE[symbol];
  if (company?.name) return company.name;
  return symbol;
}

export function getAllCompanyNames(): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [symbol, company] of Object.entries(COMPANY_DATABASE)) {
    names[symbol] = company.name;
  }
  return names;
}
