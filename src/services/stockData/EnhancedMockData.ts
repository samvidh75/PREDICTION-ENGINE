/**
 * Enhanced Mock Data with Company Info, Metrics, and Analysis
 * Provides instant, deterministic data for <500ms page loads
 * Now configured for Pakistan Stock Exchange (PSX) companies
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
  marketCap: number; // In PKR millions
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
  'HBL': {
    name: 'Habib Bank Limited',
    sector: 'Financials',
    industry: 'Banking',
    about: 'Habib Bank Limited is Pakistan\'s largest private sector bank, providing a wide range of banking and financial services including retail banking, corporate banking, investment banking, and Islamic banking. HBL operates through a vast network across Pakistan and internationally.',
    foundedYear: 1941,
    website: 'www.hbl.com'
  },
  'ENGRO': {
    name: 'Engro Corporation Limited',
    sector: 'Conglomerate',
    industry: 'Diversified',
    about: 'Engro Corporation is one of Pakistan\'s largest conglomerates with investments in fertilizers, food, energy, petrochemicals, and telecommunications. The company drives innovation across Pakistan\'s critical infrastructure sectors.',
    foundedYear: 1965,
    website: 'www.engro.com'
  },
  'UBL': {
    name: 'United Bank Limited',
    sector: 'Financials',
    industry: 'Banking',
    about: 'United Bank Limited is one of Pakistan\'s leading commercial banks, offering a comprehensive range of banking services through its extensive domestic and international branch network.',
    foundedYear: 1959,
    website: 'www.ubldirect.com'
  },
  'MCB': {
    name: 'MCB Bank Limited',
    sector: 'Financials',
    industry: 'Banking',
    about: 'MCB Bank is one of Pakistan\'s oldest and largest banks, providing retail banking, corporate banking, and Islamic banking services. Known for its strong asset quality and consistent dividend payouts.',
    foundedYear: 1947,
    website: 'www.mcb.com.pk'
  },
  'OGDC': {
    name: 'Oil & Gas Development Company Limited',
    sector: 'Energy',
    industry: 'Oil & Gas Exploration',
    about: 'OGDCL is Pakistan\'s largest exploration and production company, responsible for over 40% of the country\'s oil and gas production. The company holds the largest portfolio of recoverable hydrocarbon reserves in Pakistan.',
    foundedYear: 1961,
    website: 'www.ogdcl.com'
  },
  'FFC': {
    name: 'Fauji Fertilizer Company Limited',
    sector: 'Fertilizer',
    industry: 'Fertilizer Manufacturing',
    about: 'Fauji Fertilizer Company is Pakistan\'s largest urea manufacturer, playing a critical role in the country\'s agricultural sector. The company consistently delivers strong dividends to shareholders.',
    foundedYear: 1978,
    website: 'www.ffc.com.pk'
  },
  'LUCK': {
    name: 'Lucky Cement Limited',
    sector: 'Materials',
    industry: 'Cement',
    about: 'Lucky Cement is Pakistan\'s largest cement manufacturer and exporter, with a strong presence in both domestic and international markets. The company is a key supplier for major infrastructure projects.',
    foundedYear: 1993,
    website: 'www.lucky-cement.com'
  },
  'PPL': {
    name: 'Pakistan Petroleum Limited',
    sector: 'Energy',
    industry: 'Oil & Gas Exploration',
    about: 'Pakistan Petroleum Limited is a leading exploration and production company operating Pakistan\'s largest gas field at Sui. PPL manages a diverse portfolio of exploration blocks across the country.',
    foundedYear: 1950,
    website: 'www.ppl.com.pk'
  },
};

export function generateEnhancedMockData(symbol: string) {
  const hash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const normalizedHash = (hash % 1000) / 1000;

  const basePrice = 50 + (hash % 300);
  const marketCap = 5000000 + (hash % 500000000); // In PKR millions
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
      about: `${symbol} is a leading Pakistan Stock Exchange-listed company in its sector, delivering value to stakeholders through innovative products and services.`,
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
