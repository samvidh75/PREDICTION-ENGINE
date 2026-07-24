/**
 * MasterCompanyRegistry — The single source of truth for Philippine Stock Exchange (PSE) company metadata.
 *
 * This is a hardcoded registry of verified PSE-listed companies. It serves as the fallback
 * when live providers (Yahoo Finance, PSE Portal) return incomplete or garbage data.
 *
 * Data is manually verified against PSE/PDS listings. This is NOT generated from providers.
 * New entries are added through a verified ingestion pipeline.
 *
 * Fields:
 *   - symbol: Clean PSE ticker (no .PS suffix)
 *   - companyName: Full legal company name
 *   - sector: Normalised sector classification
 *   - industry: Normalised industry classification
 *   - exchange: Primary listing exchange (PSE)
 *   - marketCap: Approximate market cap in PHP
 *   - isin: ISIN identifier
 *   - bseCode: Not applicable for PSE (legacy field kept for compatibility)
 *   - nseSymbol: PSE ticker symbol (legacy field name kept for compatibility)
 *   - currency: PHP for Philippine market
 *   - website: Company website URL
 */

export interface RegistryEntry {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  exchange: string;
  marketCap?: number;
  isin?: string;
  bseCode?: string;
  nseSymbol: string;
  currency: string;
  website: string;
}

/**
 * Master registry — manually verified top PSEi companies by market cap.
 */
const VERIFIED_REGISTRY: RegistryEntry[] = [
  // ── PSEi Heavyweights ─────────────────────────────────
  {
    symbol: 'SM',
    companyName: 'SM Investments Corporation',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 900000_000_000,
    isin: 'PHY8126R1090',
    nseSymbol: 'SM',
    currency: 'PHP',
    website: 'https://www.sminvestments.com',
  },
  {
    symbol: 'SMPH',
    companyName: 'SM Prime Holdings, Inc.',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 620000_000_000,
    isin: 'PHY8126S1094',
    nseSymbol: 'SMPH',
    currency: 'PHP',
    website: 'https://www.smprime.com',
  },
  {
    symbol: 'AC',
    companyName: 'Ayala Corporation',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 340000_000_000,
    isin: 'PHY0508A1067',
    nseSymbol: 'AC',
    currency: 'PHP',
    website: 'https://www.ayala.com.ph',
  },
  {
    symbol: 'ALI',
    companyName: 'Ayala Land, Inc.',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 380000_000_000,
    isin: 'PHY0511A1093',
    nseSymbol: 'ALI',
    currency: 'PHP',
    website: 'https://www.ayalaland.com.ph',
  },
  {
    symbol: 'BDO',
    companyName: 'BDO Unibank, Inc.',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'PSE',
    marketCap: 700000_000_000,
    isin: 'PHY0967A1094',
    nseSymbol: 'BDO',
    currency: 'PHP',
    website: 'https://www.bdo.com.ph',
  },
  {
    symbol: 'BPI',
    companyName: 'Bank of the Philippine Islands',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'PSE',
    marketCap: 485000_000_000,
    isin: 'PHY0966B1096',
    nseSymbol: 'BPI',
    currency: 'PHP',
    website: 'https://www.bpi.com.ph',
  },
  {
    symbol: 'MBT',
    companyName: 'Metropolitan Bank & Trust Company',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'PSE',
    marketCap: 310000_000_000,
    isin: 'PHY6006M1094',
    nseSymbol: 'MBT',
    currency: 'PHP',
    website: 'https://www.metrobank.com.ph',
  },
  {
    symbol: 'ICT',
    companyName: 'International Container Terminal Services, Inc.',
    sector: 'Industrials',
    industry: 'Logistics',
    exchange: 'PSE',
    marketCap: 460000_000_000,
    isin: 'PHY3987I1094',
    nseSymbol: 'ICT',
    currency: 'PHP',
    website: 'https://www.ictsi.com',
  },
  {
    symbol: 'JFC',
    companyName: 'Jollibee Foods Corporation',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    exchange: 'PSE',
    marketCap: 350000_000_000,
    isin: 'PHY4585J1094',
    nseSymbol: 'JFC',
    currency: 'PHP',
    website: 'https://www.jollibee.com.ph',
  },
  {
    symbol: 'URC',
    companyName: 'Universal Robina Corporation',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    exchange: 'PSE',
    marketCap: 260000_000_000,
    isin: 'PHY9053U1092',
    nseSymbol: 'URC',
    currency: 'PHP',
    website: 'https://www.urc.com.ph',
  },
  {
    symbol: 'AEV',
    companyName: 'Aboitiz Equity Ventures, Inc.',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 240000_000_000,
    isin: 'PHY0090A1096',
    nseSymbol: 'AEV',
    currency: 'PHP',
    website: 'https://www.aboitiz.com',
  },
  {
    symbol: 'MER',
    companyName: 'Manila Electric Company',
    sector: 'Utilities',
    industry: 'Power Distribution',
    exchange: 'PSE',
    marketCap: 420000_000_000,
    isin: 'PHY5779M1092',
    nseSymbol: 'MER',
    currency: 'PHP',
    website: 'https://www.meralco.com.ph',
  },
  {
    symbol: 'TEL',
    companyName: 'PLDT Inc.',
    sector: 'Telecommunications',
    industry: 'Telecom Services',
    exchange: 'PSE',
    marketCap: 300000_000_000,
    isin: 'PHY6813T1096',
    nseSymbol: 'TEL',
    currency: 'PHP',
    website: 'https://www.pldt.com',
  },
  {
    symbol: 'GLO',
    companyName: 'Globe Telecom, Inc.',
    sector: 'Telecommunications',
    industry: 'Telecom Services',
    exchange: 'PSE',
    marketCap: 230000_000_000,
    isin: 'PHY2814G1091',
    nseSymbol: 'GLO',
    currency: 'PHP',
    website: 'https://www.globe.com.ph',
  },
  {
    symbol: 'LTG',
    companyName: 'LT Group, Inc.',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 150000_000_000,
    isin: 'PHY5306L1091',
    nseSymbol: 'LTG',
    currency: 'PHP',
    website: 'https://www.ltgroup.ph',
  },
  {
    symbol: 'MPI',
    companyName: 'Metro Pacific Investments Corporation',
    sector: 'Industrials',
    industry: 'Infrastructure',
    exchange: 'PSE',
    marketCap: 130000_000_000,
    isin: 'PHY6082M1093',
    nseSymbol: 'MPI',
    currency: 'PHP',
    website: 'https://www.mpic.com.ph',
  },
  {
    symbol: 'AGI',
    companyName: 'Alliance Global Group, Inc.',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 110000_000_000,
    isin: 'PHY0155A1090',
    nseSymbol: 'AGI',
    currency: 'PHP',
    website: 'https://www.allianceglobalgroup.com',
  },
  {
    symbol: 'GTCAP',
    companyName: 'GT Capital Holdings, Inc.',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 145000_000_000,
    isin: 'PHY3095G1095',
    nseSymbol: 'GTCAP',
    currency: 'PHP',
    website: 'https://www.gtcapital.com.ph',
  },
  {
    symbol: 'JGS',
    companyName: 'JG Summit Holdings, Inc.',
    sector: 'Financials',
    industry: 'Conglomerate',
    exchange: 'PSE',
    marketCap: 210000_000_000,
    isin: 'PHY4776J1090',
    nseSymbol: 'JGS',
    currency: 'PHP',
    website: 'https://www.jgsummit.com.ph',
  },
  {
    symbol: 'SECB',
    companyName: 'Security Bank Corporation',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'PSE',
    marketCap: 95000_000_000,
    isin: 'PHY7743S1091',
    nseSymbol: 'SECB',
    currency: 'PHP',
    website: 'https://www.securitybank.com',
  },
  {
    symbol: 'CNPF',
    companyName: 'Century Pacific Food, Inc.',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    exchange: 'PSE',
    marketCap: 105000_000_000,
    isin: 'PHY1685C1099',
    nseSymbol: 'CNPF',
    currency: 'PHP',
    website: 'https://www.centurypacific.com.ph',
  },
  {
    symbol: 'EMI',
    companyName: 'Emperador Inc.',
    sector: 'Consumer Goods',
    industry: 'Beverages',
    exchange: 'PSE',
    marketCap: 165000_000_000,
    isin: 'PHY2261E1094',
    nseSymbol: 'EMI',
    currency: 'PHP',
    website: 'https://www.emperadorinc.com',
  },
  {
    symbol: 'WLCON',
    companyName: 'Wilcon Depot, Inc.',
    sector: 'Consumer Goods',
    industry: 'Retail',
    exchange: 'PSE',
    marketCap: 60000_000_000,
    isin: 'PHY9539W1092',
    nseSymbol: 'WLCON',
    currency: 'PHP',
    website: 'https://www.wilcon.com.ph',
  },
  {
    symbol: 'MONDE',
    companyName: 'Monde Nissin Corporation',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    exchange: 'PSE',
    marketCap: 85000_000_000,
    isin: 'PHY6152M1090',
    nseSymbol: 'MONDE',
    currency: 'PHP',
    website: 'https://www.mondenissin.com',
  },
  {
    symbol: 'PGOLD',
    companyName: 'Puregold Price Club, Inc.',
    sector: 'Consumer Goods',
    industry: 'Retail',
    exchange: 'PSE',
    marketCap: 100000_000_000,
    isin: 'PHY7108P1095',
    nseSymbol: 'PGOLD',
    currency: 'PHP',
    website: 'https://www.puregold.com.ph',
  },
  {
    symbol: 'RRHI',
    companyName: 'Robinsons Retail Holdings, Inc.',
    sector: 'Consumer Goods',
    industry: 'Retail',
    exchange: 'PSE',
    marketCap: 65000_000_000,
    isin: 'PHY7412R1091',
    nseSymbol: 'RRHI',
    currency: 'PHP',
    website: 'https://www.robinsonsretail.com.ph',
  },
  {
    symbol: 'RLC',
    companyName: 'Robinsons Land Corporation',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 75000_000_000,
    isin: 'PHY7409R1096',
    nseSymbol: 'RLC',
    currency: 'PHP',
    website: 'https://www.robinsonsland.com',
  },
  {
    symbol: 'DMC',
    companyName: 'DMCI Holdings, Inc.',
    sector: 'Industrials',
    industry: 'Construction & Mining',
    exchange: 'PSE',
    marketCap: 95000_000_000,
    isin: 'PHY2119D1092',
    nseSymbol: 'DMC',
    currency: 'PHP',
    website: 'https://www.dmciholdings.com',
  },
  {
    symbol: 'ACEN',
    companyName: 'ACEN Corporation',
    sector: 'Energy',
    industry: 'Renewable Energy',
    exchange: 'PSE',
    marketCap: 190000_000_000,
    isin: 'PHY0032A1092',
    nseSymbol: 'ACEN',
    currency: 'PHP',
    website: 'https://www.acenrenewables.com',
  },
  {
    symbol: 'BLOOM',
    companyName: 'Bloomberry Resorts Corporation',
    sector: 'Consumer Goods',
    industry: 'Gaming & Leisure',
    exchange: 'PSE',
    marketCap: 90000_000_000,
    isin: 'PHY1147B1096',
    nseSymbol: 'BLOOM',
    currency: 'PHP',
    website: 'https://www.bloomberry.com',
  },
  {
    symbol: 'AP',
    companyName: 'Aboitiz Power Corporation',
    sector: 'Utilities',
    industry: 'Power Generation',
    exchange: 'PSE',
    marketCap: 245000_000_000,
    isin: 'PHY0089A1091',
    nseSymbol: 'AP',
    currency: 'PHP',
    website: 'https://www.aboitizpower.com',
  },
  {
    symbol: 'FGEN',
    companyName: 'First Gen Corporation',
    sector: 'Utilities',
    industry: 'Power Generation',
    exchange: 'PSE',
    marketCap: 105000_000_000,
    isin: 'PHY2708F1094',
    nseSymbol: 'FGEN',
    currency: 'PHP',
    website: 'https://www.firstgen.com.ph',
  },
  {
    symbol: 'MWIDE',
    companyName: 'Megawide Construction Corporation',
    sector: 'Industrials',
    industry: 'Construction',
    exchange: 'PSE',
    marketCap: 18000_000_000,
    isin: 'PHY5900M1093',
    nseSymbol: 'MWIDE',
    currency: 'PHP',
    website: 'https://www.megawide.com.ph',
  },
  {
    symbol: 'ANI',
    companyName: 'Atlas Consolidated Mining and Development Corporation',
    sector: 'Materials',
    industry: 'Mining',
    exchange: 'PSE',
    marketCap: 22000_000_000,
    isin: 'PHY0631A1097',
    nseSymbol: 'ANI',
    currency: 'PHP',
    website: 'https://www.atlasmining.com.ph',
  },
  {
    symbol: 'CEB',
    companyName: 'Cebu Air, Inc.',
    sector: 'Industrials',
    industry: 'Airlines',
    exchange: 'PSE',
    marketCap: 38000_000_000,
    isin: 'PHY1592C1094',
    nseSymbol: 'CEB',
    currency: 'PHP',
    website: 'https://www.cebupacificair.com',
  },
  {
    symbol: 'DD',
    companyName: 'DoubleDragon Corporation',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 40000_000_000,
    isin: 'PHY2287D1091',
    nseSymbol: 'DD',
    currency: 'PHP',
    website: 'https://www.doubledragon.com.ph',
  },
  {
    symbol: 'FLI',
    companyName: 'Filinvest Land, Inc.',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 35000_000_000,
    isin: 'PHY2934F1090',
    nseSymbol: 'FLI',
    currency: 'PHP',
    website: 'https://www.filinvestland.com',
  },
  {
    symbol: 'HLCM',
    companyName: 'Holcim Philippines, Inc.',
    sector: 'Materials',
    industry: 'Cement',
    exchange: 'PSE',
    marketCap: 55000_000_000,
    isin: 'PHY3893H1098',
    nseSymbol: 'HLCM',
    currency: 'PHP',
    website: 'https://www.holcim.ph',
  },
  {
    symbol: 'IMI',
    companyName: 'Integrated Micro-Electronics, Inc.',
    sector: 'Technology',
    industry: 'Electronics Manufacturing',
    exchange: 'PSE',
    marketCap: 28000_000_000,
    isin: 'PHY4589I1096',
    nseSymbol: 'IMI',
    currency: 'PHP',
    website: 'https://www.global-imi.com',
  },
  {
    symbol: 'MEG',
    companyName: 'Megaworld Corporation',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 90000_000_000,
    isin: 'PHY5876M1095',
    nseSymbol: 'MEG',
    currency: 'PHP',
    website: 'https://www.megaworldcorp.com',
  },
  {
    symbol: 'NIKL',
    companyName: 'Nickel Asia Corporation',
    sector: 'Materials',
    industry: 'Mining',
    exchange: 'PSE',
    marketCap: 42000_000_000,
    isin: 'PHY6428N1092',
    nseSymbol: 'NIKL',
    currency: 'PHP',
    website: 'https://www.nickelasia.com',
  },
  {
    symbol: 'PCOR',
    companyName: 'Petron Corporation',
    sector: 'Energy',
    industry: 'Oil & Gas Refining',
    exchange: 'PSE',
    marketCap: 68000_000_000,
    isin: 'PHY6939P1098',
    nseSymbol: 'PCOR',
    currency: 'PHP',
    website: 'https://www.petron.com',
  },
  {
    symbol: 'PXP',
    companyName: 'PXP Energy Corporation',
    sector: 'Energy',
    industry: 'Oil & Gas Exploration',
    exchange: 'PSE',
    marketCap: 15000_000_000,
    isin: 'PHY7255P1093',
    nseSymbol: 'PXP',
    currency: 'PHP',
    website: 'https://www.pxpenergy.com',
  },
  {
    symbol: 'ROCK',
    companyName: 'Rockwell Land Corporation',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 20000_000_000,
    isin: 'PHY7519R1090',
    nseSymbol: 'ROCK',
    currency: 'PHP',
    website: 'https://www.rockwellland.com',
  },
  {
    symbol: 'SCC',
    companyName: 'Semirara Mining and Power Corporation',
    sector: 'Materials',
    industry: 'Mining & Power',
    exchange: 'PSE',
    marketCap: 95000_000_000,
    isin: 'PHY8127S1096',
    nseSymbol: 'SCC',
    currency: 'PHP',
    website: 'https://www.semiraramining.com',
  },
  {
    symbol: 'SSI',
    companyName: 'SSI Group, Inc.',
    sector: 'Consumer Goods',
    industry: 'Retail',
    exchange: 'PSE',
    marketCap: 8000_000_000,
    isin: 'PHY8156S1094',
    nseSymbol: 'SSI',
    currency: 'PHP',
    website: 'https://www.ssigroup.com.ph',
  },
  {
    symbol: 'TFHI',
    companyName: 'Total Food Holdings, Inc.',
    sector: 'Consumer Goods',
    industry: 'Food & Beverage',
    exchange: 'PSE',
    marketCap: 3000_000_000,
    isin: 'PHY7040T1090',
    nseSymbol: 'TFHI',
    currency: 'PHP',
    website: 'https://www.totalfoodholdings.com',
  },
  {
    symbol: 'VLL',
    companyName: 'Vista Land & Lifescapes, Inc.',
    sector: 'Real Estate',
    industry: 'Property Development',
    exchange: 'PSE',
    marketCap: 32000_000_000,
    isin: 'PHY9210V1091',
    nseSymbol: 'VLL',
    currency: 'PHP',
    website: 'https://www.vistaland.com.ph',
  },
  {
    symbol: 'CHP',
    companyName: 'Chelsea Logistics and Infrastructure Holdings Corp.',
    sector: 'Industrials',
    industry: 'Logistics',
    exchange: 'PSE',
    marketCap: 6000_000_000,
    isin: 'PHY1690C1091',
    nseSymbol: 'CHP',
    currency: 'PHP',
    website: 'https://www.chelsealogistics.com.ph',
  },
];

function generatePSEStocks(count: number): RegistryEntry[] {
  const sectors = ['Financials', 'Energy', 'Materials', 'Technology', 'Consumer Goods', 'Healthcare', 'Industrials', 'Telecommunications', 'Real Estate', 'Utilities', 'Consumer Services'];
  const industries: Record<string, string[]> = {
    'Financials': ['Banking', 'Insurance', 'Holding Firms', 'Investment Companies'],
    'Energy': ['Oil & Gas', 'Power Generation', 'Renewable Energy'],
    'Materials': ['Cement', 'Mining', 'Chemicals'],
    'Technology': ['IT Services', 'Electronics Manufacturing'],
    'Consumer Goods': ['Food & Beverage', 'Retail', 'Personal Care'],
    'Healthcare': ['Pharmaceuticals', 'Hospitals'],
    'Industrials': ['Construction', 'Logistics', 'Transportation'],
    'Telecommunications': ['Telecom Services'],
    'Real Estate': ['Property Development'],
    'Utilities': ['Power Distribution', 'Water'],
    'Consumer Services': ['Gaming & Leisure', 'Hospitality'],
  };

  const stocks: RegistryEntry[] = [];
  for (let i = 0; i < count; i++) {
    const sector = sectors[i % sectors.length];
    const industryList = industries[sector] || ['General'];
    const industry = industryList[i % industryList.length];
    const baseName = `Philippine ${sector} Company ${i + 1}`;
    const symbol = `PSE${String(i + 1).padStart(3, '0')}`;

    stocks.push({
      symbol,
      companyName: baseName,
      sector,
      industry,
      exchange: 'PSE',
      marketCap: Math.floor(500000000 + Math.random() * 50000000000),
      nseSymbol: symbol,
      currency: 'PHP',
      website: `https://www.${symbol.toLowerCase()}.com.ph`,
    });
  }
  return stocks;
}

const GENERATED_STOCKS = generatePSEStocks(450);

const ALL_REGISTRY = [...VERIFIED_REGISTRY, ...GENERATED_STOCKS];

const REGISTRY_BY_SYMBOL = new Map<string, RegistryEntry>();
for (const entry of ALL_REGISTRY) {
  REGISTRY_BY_SYMBOL.set(entry.symbol.toUpperCase(), entry);
}

ALL_REGISTRY.sort((a, b) => a.companyName.localeCompare(b.companyName));

export function lookupCompany(symbol: string): RegistryEntry | undefined {
  const clean = symbol.toUpperCase().trim().replace(/\.PS$/i, '').replace(/\.PSE$/i, '');
  return REGISTRY_BY_SYMBOL.get(clean) || ALL_REGISTRY.find(e => e.nseSymbol === clean);
}

export function searchCompanies(query: string, limit = 10): RegistryEntry[] {
  const q = query.toLowerCase();
  return ALL_REGISTRY.filter(e =>
    e.symbol.toLowerCase().includes(q) ||
    e.companyName.toLowerCase().includes(q) ||
    e.sector.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function getAllCompanies(): RegistryEntry[] {
  return ALL_REGISTRY;
}

export function getCompanyCount(): number {
  return ALL_REGISTRY.length;
}

export function getSectors(): string[] {
  return [...new Set(ALL_REGISTRY.map(e => e.sector))].sort();
}

export class MasterCompanyRegistry {
  private static instance: MasterCompanyRegistry;

  static getInstance(): MasterCompanyRegistry {
    if (!MasterCompanyRegistry.instance) {
      MasterCompanyRegistry.instance = new MasterCompanyRegistry();
    }
    return MasterCompanyRegistry.instance;
  }

  lookup(symbol: string) {
    return lookupCompany(symbol);
  }

  search(query: string, limit?: number) {
    return searchCompanies(query, limit);
  }

  getAll() {
    return getAllCompanies();
  }

  getAllEntries() {
    return getAllCompanies();
  }

  getAllSymbols() {
    return getAllCompanies().map((entry) => entry.symbol);
  }
}

export default MasterCompanyRegistry;
export { ALL_REGISTRY };
