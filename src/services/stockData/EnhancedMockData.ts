/**
 * Enhanced Mock Data with Company Info, Metrics, and Analysis
 * Provides instant, deterministic data for <500ms page loads
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
  marketCap: number; // In crores
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

// Comprehensive company database
const COMPANY_DATABASE: Record<string, CompanyInfo> = {
  'HDFCBANK': {
    name: 'HDFC Bank Limited',
    sector: 'Financial Services',
    industry: 'Banking',
    about: `HDFC Bank Limited is one of India's leading private sector banks, providing a wide range of banking and financial services including retail banking, corporate banking, and investment banking. The bank operates through a strong network across India serving millions of customers.`,
    foundedYear: 1994,
    website: 'www.hdfcbank.com'
  },
  'INFY': {
    name: 'Infosys Limited',
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    about: `Infosys is a global leader in next-generation digital services and consulting. The company provides consulting, technology, and outsourcing services that help clients navigate their digital transformation.`,
    foundedYear: 1981,
    website: 'www.infosys.com'
  },
  'RELIANCE': {
    name: 'Reliance Industries Limited',
    sector: 'Energy & Petrochemicals',
    industry: 'Oil & Gas, Petrochemicals',
    about: `Reliance Industries is a diversified conglomerate with presence in exploration & production, petroleum refining, petrochemicals, retail, and telecom sectors. It is one of India's largest companies by revenue and market capitalization.`,
    foundedYear: 1973,
    website: 'www.ril.com'
  },
  'TCS': {
    name: 'Tata Consultancy Services Limited',
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    about: `TCS is a leading global IT services, consulting and business solutions organization. It delivers IT solutions and business consulting services to enterprises globally, helping them to compete and win in the digital economy.`,
    foundedYear: 1968,
    website: 'www.tcs.com'
  },
  'WIPRO': {
    name: 'Wipro Limited',
    sector: 'Information Technology',
    industry: 'IT Services & Consulting',
    about: `Wipro is a leading technology services and consulting company that provides a comprehensive portfolio of services to Global 2000 companies and emerging companies across key verticals including financial services, health care, telecommunications, media and entertainment.`,
    foundedYear: 1980,
    website: 'www.wipro.com'
  },
  'MARUTI': {
    name: 'Maruti Suzuki India Limited',
    sector: 'Automobiles',
    industry: 'Car Manufacturing',
    about: `Maruti Suzuki is India's leading passenger car manufacturer with a strong market share. The company manufactures a wide range of vehicles from economy cars to utility vehicles, serving diverse customer segments.`,
    foundedYear: 1981,
    website: 'www.marutisuzuki.com'
  },
  'CHANDRAPRABHU': {
    name: 'Chandraprabhu Limited',
    sector: 'Pharmaceuticals',
    industry: 'Pharmaceutical Manufacturing',
    about: `Chandraprabhu Limited is engaged in the manufacture and marketing of pharmaceutical products, focusing on ethical pharmaceuticals for various therapeutic areas including cardiovascular, gastrointestinal, and respiratory segments.`,
    foundedYear: 1995,
  },
  'CHENNPETRO': {
    name: 'Chennai Petroleum Corporation Limited',
    sector: 'Energy',
    industry: 'Oil Refining & Petrochemicals',
    about: `Chennai Petroleum Corporation Limited is in the business of refining crude oil to produce & supply various petroleum products and manufacture and sale of lubricating oil additives. The main products include LPG, Motor Spirit, Superior Kerosene, Aviation Turbine Fuel, High Speed Diesel, Naphtha, Fuel Oil, Lube Base Stocks and Bitumen. Speciality products include Paraffin Wax, Mineral Turpentine Oil (MTO), Hexane, Petrochemical feedstocks, and Petroleum Coke.`,
    foundedYear: 1983,
  },
  'GRANULES': {
    name: 'Granules India Limited',
    sector: 'Pharmaceuticals',
    industry: 'Pharmaceutical Manufacturing',
    about: `Granules India Limited is engaged in manufacturing and marketing of pharmaceutical products. The company is a supplier of Active Pharmaceutical Ingredients (API) and pharmaceutical formulations across various therapeutic segments globally.`,
    foundedYear: 1994,
  },
};

// Generate deterministic metrics based on symbol
export function generateEnhancedMockData(symbol: string) {
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const normalizedHash = (hash % 1000) / 1000;

  // Base metrics
  const basePrice = 100 + (hash % 3000);
  const marketCap = 10000 + (hash % 500000); // In crores
  const peRatio = 10 + normalizedHash * 30;
  const roe = 5 + normalizedHash * 40;
  const roce = 8 + normalizedHash * 45;

  return {
    // Basic quote
    quote: {
      symbol,
      exchange: 'NSE' as const,
      price: basePrice,
      change: (Math.sin(hash / 100) * 5),
      changePercent: (Math.sin(hash / 100) * 5) / basePrice * 100,
      high: basePrice * 1.02,
      low: basePrice * 0.98,
      volume: 1000000 + (hash % 5000000),
    },

    // Key metrics (instant render, no API needed)
    metrics: {
      marketCap,
      currentPrice: basePrice,
      peRatio: parseFloat(peRatio.toFixed(2)),
      pbRatio: 1 + normalizedHash * 5,
      bookValue: basePrice / (1.5 + normalizedHash),
      dividendYield: 0.2 + normalizedHash * 3,
      roe: parseFloat(roe.toFixed(1)),
      roce: parseFloat(roce.toFixed(1)),
      faceValue: 10 + (hash % 100),
      high52Week: basePrice * (1.3 + normalizedHash * 0.2),
      low52Week: basePrice * (0.7 - normalizedHash * 0.2),
      avgVolume: (2000000 + (hash % 8000000)) / 1e6,
      eps: basePrice / peRatio,
      debtToEquity: 0.3 + normalizedHash * 2,
      currentRatio: 1.0 + normalizedHash * 2,
      roicPercent: 8 + normalizedHash * 30,
    } as KeyMetrics,

    // Company info
    company: COMPANY_DATABASE[symbol] || {
      name: symbol,
      about: `${symbol} is a leading company in its sector, delivering value to stakeholders through innovative products and services.`,
      sector: 'Miscellaneous',
      industry: 'General',
    } as CompanyInfo,

    // Analysis (rule-based, instant)
    analysis: {
      pros: [
        peRatio < 20 ? '✓ Attractive valuation at P/E below 20x' : '',
        roe > 15 ? '✓ Strong ROE (>15%) indicates quality earnings' : '',
        roce > 15 ? '✓ High ROCE suggests efficient capital deployment' : '',
        (Math.random() > 0.5 ? '✓ Strong market position and competitive moat' : ''),
      ].filter(Boolean),

      cons: [
        peRatio > 35 ? '✗ High valuation at P/E >35x' : '',
        roe < 10 ? '✗ Low ROE may indicate profitability challenges' : '',
        normalizedHash < 0.3 ? '✗ High debt levels require monitoring' : '',
        (Math.random() > 0.7 ? '✗ Sector cyclicality poses risks' : ''),
      ].filter(Boolean),

      recommendation:
        peRatio < 15 && roe > 20 ? 'BUY' :
        peRatio > 30 || roe < 10 ? 'SELL' : 'HOLD',

      investmentHorizon: normalizedHash > 0.7 ? '3Y' : normalizedHash > 0.4 ? '1Y' : '6M',
      riskLevel: normalizedHash < 0.3 ? 'HIGH' : normalizedHash < 0.7 ? 'MEDIUM' : 'LOW',

      targetPrice: basePrice * (0.9 + normalizedHash * 0.4),
    } as StockAnalysis,
  };
}

// Get company name safely (never return numbers)
export function getCompanyName(symbol: string): string {
  const company = COMPANY_DATABASE[symbol];
  if (company?.name) return company.name;

  // Fallback: use symbol if no mapping found
  return symbol;
}

// Get all company names (for validation)
export function getAllCompanyNames(): Record<string, string> {
  const names: Record<string, string> = {};
  for (const [symbol, company] of Object.entries(COMPANY_DATABASE)) {
    names[symbol] = company.name;
  }
  return names;
}
