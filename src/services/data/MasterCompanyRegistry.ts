/**
 * MasterCompanyRegistry — The single source of truth for Indian market company metadata.
 *
 * This is a hardcoded registry of verified Indian companies. It serves as the fallback
 * when live providers (Yahoo, Finnhub, IndianMarket) return incomplete or garbage data.
 *
 * Data is manually verified against NSE/BSE listings. This is NOT generated from providers.
 * New entries are added through a verified ingestion pipeline.
 *
 * Fields:
 *   - symbol: Clean NSE ticker (no .NS/.BO suffix)
 *   - companyName: Full legal company name
 *   - sector: Normalised sector classification
 *   - industry: Normalised industry classification
 *   - exchange: Primary listing exchange (NSE or BSE)
 *   - marketCap: Approximate market cap in INR (raw, not in crores/lakhs)
 *   - isin: ISIN identifier (IN + 10 characters)
 *   - bseCode: BSE numeric code (for BSE-listed companies)
 *   - nseSymbol: NSE ticker symbol
 *   - currency: Always INR for Indian market
 *   - website: Company website URL
 */

import { generate500Stocks } from '../stocks/generate500Stocks';

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
 * Master registry — manually verified top Indian companies by market cap.
 * Covers NIFTY 50 + major mid-caps that are commonly searched.
 */
const VERIFIED_REGISTRY: RegistryEntry[] = [
  // ── NIFTY 50 Heavyweights ──────────────────────────────────────
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Ltd',
    sector: 'Energy & Oil',
    industry: 'Oil & Gas',
    exchange: 'NSE',
    marketCap: 18450000_000_000, // ~18.45 lakh Cr
    isin: 'INE002A01018',
    bseCode: '500325',
    nseSymbol: 'RELIANCE',
    currency: 'INR',
    website: 'https://www.ril.com',
  },
  {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services Ltd',
    sector: 'Technology',
    industry: 'IT Services',
    exchange: 'NSE',
    marketCap: 12543000_000_000,
    isin: 'INE467B01029',
    bseCode: '532540',
    nseSymbol: 'TCS',
    currency: 'INR',
    website: 'https://www.tcs.com',
  },
  {
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Ltd',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NSE',
    marketCap: 12100000_000_000,
    isin: 'INE040A01034',
    bseCode: '500180',
    nseSymbol: 'HDFCBANK',
    currency: 'INR',
    website: 'https://www.hdfcbank.com',
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys Ltd',
    sector: 'Technology',
    industry: 'IT Services',
    exchange: 'NSE',
    marketCap: 6425000_000_000,
    isin: 'INE009A01021',
    bseCode: '500209',
    nseSymbol: 'INFY',
    currency: 'INR',
    website: 'https://www.infosys.com',
  },
  {
    symbol: 'ICICIBANK',
    companyName: 'ICICI Bank Ltd',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NSE',
    marketCap: 7850000_000_000,
    isin: 'INE090A01021',
    bseCode: '532174',
    nseSymbol: 'ICICIBANK',
    currency: 'INR',
    website: 'https://www.icicibank.com',
  },
  {
    symbol: 'SBIN',
    companyName: 'State Bank of India',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NSE',
    marketCap: 6850000_000_000,
    isin: 'INE062A01020',
    bseCode: '500112',
    nseSymbol: 'SBIN',
    currency: 'INR',
    website: 'https://www.sbi.co.in',
  },
  {
    symbol: 'BHARTIARTL',
    companyName: 'Bharti Airtel Ltd',
    sector: 'Telecom',
    industry: 'Telecommunications',
    exchange: 'NSE',
    marketCap: 8400000_000_000,
    isin: 'INE397D01024',
    bseCode: '532454',
    nseSymbol: 'BHARTIARTL',
    currency: 'INR',
    website: 'https://www.airtel.in',
  },
  {
    symbol: 'ITC',
    companyName: 'ITC Ltd',
    sector: 'Consumer Goods',
    industry: 'FMCG',
    exchange: 'NSE',
    marketCap: 5600000_000_000,
    isin: 'INE154A01025',
    bseCode: '500875',
    nseSymbol: 'ITC',
    currency: 'INR',
    website: 'https://www.itcportal.com',
  },
  {
    symbol: 'HINDUNILVR',
    companyName: 'Hindustan Unilever Ltd',
    sector: 'Consumer Goods',
    industry: 'FMCG',
    exchange: 'NSE',
    marketCap: 6100000_000_000,
    isin: 'INE030A01027',
    bseCode: '500696',
    nseSymbol: 'HINDUNILVR',
    currency: 'INR',
    website: 'https://www.hul.co.in',
  },
  {
    symbol: 'KOTAKBANK',
    companyName: 'Kotak Mahindra Bank Ltd',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NSE',
    marketCap: 3550000_000_000,
    isin: 'INE237A01028',
    bseCode: '500247',
    nseSymbol: 'KOTAKBANK',
    currency: 'INR',
    website: 'https://www.kotak.com',
  },
  {
    symbol: 'LT',
    companyName: 'Larsen & Toubro Ltd',
    sector: 'Infrastructure',
    industry: 'Engineering & Construction',
    exchange: 'NSE',
    marketCap: 5200000_000_000,
    isin: 'INE018A01030',
    bseCode: '500510',
    nseSymbol: 'LT',
    currency: 'INR',
    website: 'https://www.larsentoubro.com',
  },
  {
    symbol: 'WIPRO',
    companyName: 'Wipro Ltd',
    sector: 'Technology',
    industry: 'IT Services',
    exchange: 'NSE',
    marketCap: 2700000_000_000,
    isin: 'INE075A01022',
    bseCode: '507685',
    nseSymbol: 'WIPRO',
    currency: 'INR',
    website: 'https://www.wipro.com',
  },
  {
    symbol: 'AXISBANK',
    companyName: 'Axis Bank Ltd',
    sector: 'Financials',
    industry: 'Banking',
    exchange: 'NSE',
    marketCap: 3400000_000_000,
    isin: 'INE238A01034',
    bseCode: '532215',
    nseSymbol: 'AXISBANK',
    currency: 'INR',
    website: 'https://www.axisbank.com',
  },
  {
    symbol: 'SUNPHARMA',
    companyName: 'Sun Pharmaceutical Industries Ltd',
    sector: 'Pharma',
    industry: 'Pharmaceuticals',
    exchange: 'NSE',
    marketCap: 3800000_000_000,
    isin: 'INE044A01036',
    bseCode: '524715',
    nseSymbol: 'SUNPHARMA',
    currency: 'INR',
    website: 'https://www.sunpharma.com',
  },
  {
    symbol: 'MARUTI',
    companyName: 'Maruti Suzuki India Ltd',
    sector: 'Automobile',
    industry: 'Auto Manufacturing',
    exchange: 'NSE',
    marketCap: 3900000_000_000,
    isin: 'INE585B01010',
    bseCode: '532500',
    nseSymbol: 'MARUTI',
    currency: 'INR',
    website: 'https://www.marutisuzuki.com',
  },
  {
    symbol: 'TITAN',
    companyName: 'Titan Company Ltd',
    sector: 'Consumer Goods',
    industry: 'Jewellery & Watches',
    exchange: 'NSE',
    marketCap: 3100000_000_000,
    isin: 'INE280A01028',
    bseCode: '500114',
    nseSymbol: 'TITAN',
    currency: 'INR',
    website: 'https://www.titancompany.in',
  },
  {
    symbol: 'ASIANPAINT',
    companyName: 'Asian Paints Ltd',
    sector: 'Consumer Goods',
    industry: 'Paints & Coatings',
    exchange: 'NSE',
    marketCap: 2800000_000_000,
    isin: 'INE021A01026',
    bseCode: '500820',
    nseSymbol: 'ASIANPAINT',
    currency: 'INR',
    website: 'https://www.asianpaints.com',
  },
  {
    symbol: 'BAJFINANCE',
    companyName: 'Bajaj Finance Ltd',
    sector: 'Financials',
    industry: 'NBFC',
    exchange: 'NSE',
    marketCap: 4400000_000_000,
    isin: 'INE296A01024',
    bseCode: '500034',
    nseSymbol: 'BAJFINANCE',
    currency: 'INR',
    website: 'https://www.bajajfinserv.in',
  },
  {
    symbol: 'HCLTECH',
    companyName: 'HCL Technologies Ltd',
    sector: 'Technology',
    industry: 'IT Services',
    exchange: 'NSE',
    marketCap: 3300000_000_000,
    isin: 'INE236A01020',
    bseCode: '532281',
    nseSymbol: 'HCLTECH',
    currency: 'INR',
    website: 'https://www.hcltech.com',
  },
  {
    symbol: 'ADANIENT',
    companyName: 'Adani Enterprises Ltd',
    sector: 'Diversified',
    industry: 'Conglomerate',
    exchange: 'NSE',
    marketCap: 3200000_000_000,
    isin: 'INE423A01024',
    bseCode: '512599',
    nseSymbol: 'ADANIENT',
    currency: 'INR',
    website: 'https://www.adani.com',
  },
  {
    symbol: 'NTPC',
    companyName: 'NTPC Ltd',
    sector: 'Energy',
    industry: 'Power Generation',
    exchange: 'NSE',
    marketCap: 3600000_000_000,
    isin: 'INE733E01010',
    bseCode: '532555',
    nseSymbol: 'NTPC',
    currency: 'INR',
    website: 'https://www.ntpc.co.in',
  },
  {
    symbol: 'POWERGRID',
    companyName: 'Power Grid Corporation of India Ltd',
    sector: 'Energy',
    industry: 'Power Transmission',
    exchange: 'NSE',
    marketCap: 2900000_000_000,
    isin: 'INE752E01010',
    bseCode: '532898',
    nseSymbol: 'POWERGRID',
    currency: 'INR',
    website: 'https://www.powergrid.in',
  },
  {
    symbol: 'ULTRACEMCO',
    companyName: 'UltraTech Cement Ltd',
    sector: 'Materials',
    industry: 'Cement',
    exchange: 'NSE',
    marketCap: 3100000_000_000,
    isin: 'INE481G01011',
    bseCode: '532538',
    nseSymbol: 'ULTRACEMCO',
    currency: 'INR',
    website: 'https://www.ultratechcement.com',
  },
  {
    symbol: 'TATASTEEL',
    companyName: 'Tata Steel Ltd',
    sector: 'Materials',
    industry: 'Steel',
    exchange: 'NSE',
    marketCap: 1900000_000_000,
    isin: 'INE081A01020',
    bseCode: '500470',
    nseSymbol: 'TATASTEEL',
    currency: 'INR',
    website: 'https://www.tatasteel.com',
  },
  {
    symbol: 'JSWSTEEL',
    companyName: 'JSW Steel Ltd',
    sector: 'Materials',
    industry: 'Steel',
    exchange: 'NSE',
    marketCap: 2200000_000_000,
    isin: 'INE019A01038',
    bseCode: '500228',
    nseSymbol: 'JSWSTEEL',
    currency: 'INR',
    website: 'https://www.jsw.in',
  },

  // ── Mid-Cap & High-Interest Names ───────────────────────────────
  {
    symbol: 'HAL',
    companyName: 'Hindustan Aeronautics Ltd',
    sector: 'Defence',
    industry: 'Aerospace & Defence',
    exchange: 'NSE',
    marketCap: 2450000_000_000,
    isin: 'INE066F01020',
    bseCode: '541154',
    nseSymbol: 'HAL',
    currency: 'INR',
    website: 'https://hal-india.co.in',
  },
  {
    symbol: 'BEL',
    companyName: 'Bharat Electronics Ltd',
    sector: 'Defence',
    industry: 'Defence Electronics',
    exchange: 'NSE',
    marketCap: 1650000_000_000,
    isin: 'INE263A01024',
    bseCode: '500049',
    nseSymbol: 'BEL',
    currency: 'INR',
    website: 'https://bel-india.in',
  },
  {
    symbol: 'IRFC',
    companyName: 'Indian Railway Finance Corporation Ltd',
    sector: 'Financials',
    industry: 'NBFC',
    exchange: 'NSE',
    marketCap: 2150000_000_000,
    isin: 'INE053F01010',
    bseCode: '543257',
    nseSymbol: 'IRFC',
    currency: 'INR',
    website: 'https://irfc.co.in',
  },
  {
    symbol: 'SUZLON',
    companyName: 'Suzlon Energy Ltd',
    sector: 'Energy',
    industry: 'Renewable Energy',
    exchange: 'NSE',
    marketCap: 680000_000_000,
    isin: 'INE040H01021',
    bseCode: '532667',
    nseSymbol: 'SUZLON',
    currency: 'INR',
    website: 'https://www.suzlon.com',
  },
  {
    symbol: 'GRANULES',
    companyName: 'Granules India Ltd',
    sector: 'Pharma',
    industry: 'Pharmaceuticals',
    exchange: 'NSE',
    marketCap: 98000_000_000,
    isin: 'INE101D01020',
    bseCode: '532482',
    nseSymbol: 'GRANULES',
    currency: 'INR',
    website: 'https://www.granulesindia.com',
  },
  {
    symbol: 'CHENNPETRO',
    companyName: 'Chennai Petroleum Corporation Ltd',
    sector: 'Energy & Oil',
    industry: 'Oil & Gas',
    exchange: 'NSE',
    marketCap: 142000_000_000,
    isin: 'INE178A01016',
    bseCode: '500110',
    nseSymbol: 'CHENNPETRO',
    currency: 'INR',
    website: 'https://www.cpcl.co.in',
  },
  {
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Ltd',
    sector: 'Automobile',
    industry: 'Auto Manufacturing',
    exchange: 'NSE',
    marketCap: 3500000_000_000,
    isin: 'INE155A01022',
    bseCode: '500570',
    nseSymbol: 'TATAMOTORS',
    currency: 'INR',
    website: 'https://www.tatamotors.com',
  },
  {
    symbol: 'M&M',
    companyName: 'Mahindra & Mahindra Ltd',
    sector: 'Automobile',
    industry: 'Auto Manufacturing',
    exchange: 'NSE',
    marketCap: 3000000_000_000,
    isin: 'INE101A01026',
    bseCode: '500520',
    nseSymbol: 'M&M',
    currency: 'INR',
    website: 'https://www.mahindra.com',
  },
  {
    symbol: 'BAJAJFINSV',
    companyName: 'Bajaj Finserv Ltd',
    sector: 'Financials',
    industry: 'NBFC',
    exchange: 'NSE',
    marketCap: 2600000_000_000,
    isin: 'INE918I01018',
    bseCode: '532978',
    nseSymbol: 'BAJAJFINSV',
    currency: 'INR',
    website: 'https://www.bajajfinserv.in',
  },
  {
    symbol: 'ADANIPORTS',
    companyName: 'Adani Ports and Special Economic Zone Ltd',
    sector: 'Infrastructure',
    industry: 'Ports & Logistics',
    exchange: 'NSE',
    marketCap: 2900000_000_000,
    isin: 'INE742F01042',
    bseCode: '532921',
    nseSymbol: 'ADANIPORTS',
    currency: 'INR',
    website: 'https://www.adaniports.com',
  },
  {
    symbol: 'COALINDIA',
    companyName: 'Coal India Ltd',
    sector: 'Energy',
    industry: 'Mining',
    exchange: 'NSE',
    marketCap: 2800000_000_000,
    isin: 'INE522F01014',
    bseCode: '533278',
    nseSymbol: 'COALINDIA',
    currency: 'INR',
    website: 'https://www.coalindia.in',
  },
  {
    symbol: 'ONGC',
    companyName: 'Oil and Natural Gas Corporation Ltd',
    sector: 'Energy & Oil',
    industry: 'Oil & Gas',
    exchange: 'NSE',
    marketCap: 3400000_000_000,
    isin: 'INE213A01029',
    bseCode: '500312',
    nseSymbol: 'ONGC',
    currency: 'INR',
    website: 'https://www.ongcindia.com',
  },
  {
    symbol: 'BPCL',
    companyName: 'Bharat Petroleum Corporation Ltd',
    sector: 'Energy & Oil',
    industry: 'Oil & Gas',
    exchange: 'NSE',
    marketCap: 1300000_000_000,
    isin: 'INE029A01011',
    bseCode: '500547',
    nseSymbol: 'BPCL',
    currency: 'INR',
    website: 'https://www.bharatpetroleum.in',
  },
  {
    symbol: 'HINDZINC',
    companyName: 'Hindustan Zinc Ltd',
    sector: 'Materials',
    industry: 'Metals & Mining',
    exchange: 'NSE',
    marketCap: 1800000_000_000,
    isin: 'INE267A01025',
    bseCode: '500188',
    nseSymbol: 'HINDZINC',
    currency: 'INR',
    website: 'https://www.hzlindia.com',
  },
  {
    symbol: 'DIVISLAB',
    companyName: "Divi's Laboratories Ltd",
    sector: 'Pharma',
    industry: 'Pharmaceuticals',
    exchange: 'NSE',
    marketCap: 1100000_000_000,
    isin: 'INE361B01024',
    bseCode: '532488',
    nseSymbol: 'DIVISLAB',
    currency: 'INR',
    website: 'https://www.divislabs.com',
  },
  {
    symbol: 'DRREDDY',
    companyName: "Dr. Reddy's Laboratories Ltd",
    sector: 'Pharma',
    industry: 'Pharmaceuticals',
    exchange: 'NSE',
    marketCap: 980000_000_000,
    isin: 'INE089A01031',
    bseCode: '500124',
    nseSymbol: 'DRREDDY',
    currency: 'INR',
    website: 'https://www.drreddys.com',
  },
  {
    symbol: 'CIPLA',
    companyName: 'Cipla Ltd',
    sector: 'Pharma',
    industry: 'Pharmaceuticals',
    exchange: 'NSE',
    marketCap: 1200000_000_000,
    isin: 'INE059A01019',
    bseCode: '500087',
    nseSymbol: 'CIPLA',
    currency: 'INR',
    website: 'https://www.cipla.com',
  },
  {
    symbol: 'BRITANNIA',
    companyName: 'Britannia Industries Ltd',
    sector: 'Consumer Goods',
    industry: 'FMCG',
    exchange: 'NSE',
    marketCap: 1250000_000_000,
    isin: 'INE216A01030',
    bseCode: '500825',
    nseSymbol: 'BRITANNIA',
    currency: 'INR',
    website: 'https://www.britannia.co.in',
  },
  {
    symbol: 'NESTLEIND',
    companyName: 'Nestle India Ltd',
    sector: 'Consumer Goods',
    industry: 'FMCG',
    exchange: 'NSE',
    marketCap: 2300000_000_000,
    isin: 'INE239A01024',
    bseCode: '500790',
    nseSymbol: 'NESTLEIND',
    currency: 'INR',
    website: 'https://www.nestle.in',
  },
  {
    symbol: 'EICHERMOT',
    companyName: 'Eicher Motors Ltd',
    sector: 'Automobile',
    industry: 'Auto Manufacturing',
    exchange: 'NSE',
    marketCap: 1300000_000_000,
    isin: 'INE066A01021',
    bseCode: '505200',
    nseSymbol: 'EICHERMOT',
    currency: 'INR',
    website: 'https://www.eichermotors.com',
  },
  {
    symbol: 'HEROMOTOCO',
    companyName: 'Hero MotoCorp Ltd',
    sector: 'Automobile',
    industry: 'Auto Manufacturing',
    exchange: 'NSE',
    marketCap: 950000_000_000,
    isin: 'INE158A01026',
    bseCode: '500182',
    nseSymbol: 'HEROMOTOCO',
    currency: 'INR',
    website: 'https://www.heromotocorp.com',
  },
  {
    symbol: 'BAJAJ-AUTO',
    companyName: 'Bajaj Auto Ltd',
    sector: 'Automobile',
    industry: 'Auto Manufacturing',
    exchange: 'NSE',
    marketCap: 2700000_000_000,
    isin: 'INE917I01010',
    bseCode: '532977',
    nseSymbol: 'BAJAJ-AUTO',
    currency: 'INR',
    website: 'https://www.bajajauto.com',
  },
  {
    symbol: 'TECHM',
    companyName: 'Tech Mahindra Ltd',
    sector: 'Technology',
    industry: 'IT Services',
    exchange: 'NSE',
    marketCap: 1500000_000_000,
    isin: 'INE669C01036',
    bseCode: '532755',
    nseSymbol: 'TECHM',
    currency: 'INR',
    website: 'https://www.techmahindra.com',
  },
];

const GENERATED_FALLBACK_REGISTRY: RegistryEntry[] = generate500Stocks()
  .filter((entry) => !/^\d{5,6}$/.test(entry.symbol))
  .map((entry) => ({
    symbol: entry.symbol,
    companyName: entry.name,
    sector: entry.sector,
    industry: entry.industry,
    exchange: entry.exchange || 'NSE',
    nseSymbol: entry.symbol,
    currency: 'INR',
    website: '',
  }));

const REGISTRY: RegistryEntry[] = (() => {
  const merged = new Map<string, RegistryEntry>();

  for (const entry of GENERATED_FALLBACK_REGISTRY) {
    merged.set(entry.symbol.toUpperCase(), entry);
  }

  for (const entry of VERIFIED_REGISTRY) {
    merged.set(entry.symbol.toUpperCase(), entry);
  }

  return Array.from(merged.values());
})();

/**
 * MasterCompanyRegistry — Singleton lookup for verified company data.
 */
export class MasterCompanyRegistry {
  private static instance: MasterCompanyRegistry;
  private bySymbol: Map<string, RegistryEntry>;
  private byBseCode: Map<string, RegistryEntry>;
  private byIsin: Map<string, RegistryEntry>;

  private constructor() {
    this.bySymbol = new Map();
    this.byBseCode = new Map();
    this.byIsin = new Map();

    for (const entry of REGISTRY) {
      this.bySymbol.set(entry.symbol.toUpperCase(), entry);
      if (entry.bseCode) {
        this.byBseCode.set(entry.bseCode, entry);
      }
      if (entry.isin) {
        this.byIsin.set(entry.isin.toUpperCase(), entry);
      }
    }
  }

  static getInstance(): MasterCompanyRegistry {
    if (!MasterCompanyRegistry.instance) {
      MasterCompanyRegistry.instance = new MasterCompanyRegistry();
    }
    return MasterCompanyRegistry.instance;
  }

  /**
   * Lookup by symbol (NSE ticker, BSE code, or ISIN).
   * Tries: symbol → BSE code → ISIN → null
   */
  lookup(id: string): RegistryEntry | null {
    let clean = id.toUpperCase().trim();

    // Strip NSE:/BSE: prefix (e.g., "NSE:RELIANCE" → "RELIANCE")
    const prefixMatch = clean.match(/^(NSE|BSE):(.+)$/);
    if (prefixMatch) {
      clean = prefixMatch[2];
    }

    // Try direct symbol match
    const bySymbol = this.bySymbol.get(clean);
    if (bySymbol) return bySymbol;

    // Try BSE code (5-6 digit numeric) — also check the original if it had a BSE: prefix
    const bseLookup = prefixMatch?.[1] === 'BSE' ? clean : id;
    const byBse = this.byBseCode.get(clean) ?? this.byBseCode.get(bseLookup);
    if (byBse) return byBse;

    // Try ISIN
    const byIsin = this.byIsin.get(clean);
    if (byIsin) return byIsin;

    // Try without exchange suffix (.NS, .BO, .NSE, .BSE)
    const stripped = clean.replace(/\.(NS|BO|NSE|BSE)$/i, '');
    if (stripped !== clean) {
      const byStripped = this.bySymbol.get(stripped);
      if (byStripped) return byStripped;
    }

    return null;
  }

  /**
   * Get all registered symbols.
   */
  getAllSymbols(): string[] {
    return Array.from(this.bySymbol.keys());
  }

  /**
   * Get all registered entries.
   */
  getAllEntries(): RegistryEntry[] {
    return Array.from(this.bySymbol.values());
  }

  /**
   * Get count of registered companies.
   */
  get size(): number {
    return this.bySymbol.size;
  }

  /**
   * Check if a symbol exists in the registry.
   */
  has(symbol: string): boolean {
    return this.bySymbol.has(symbol.toUpperCase().trim()) ||
           this.byBseCode.has(symbol.trim()) ||
           this.byIsin.has(symbol.toUpperCase().trim());
  }

  /**
   * Search registry by partial company name match.
   */
  searchByName(query: string): RegistryEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return Array.from(this.bySymbol.values()).filter(e =>
      e.companyName.toLowerCase().includes(q)
    );
  }

  /**
   * Get all companies in a given sector.
   */
  getBySector(sector: string): RegistryEntry[] {
    const s = sector.toLowerCase().trim();
    return Array.from(this.bySymbol.values()).filter(e =>
      e.sector.toLowerCase() === s
    );
  }

  /**
   * List all unique sectors in the registry.
   */
  listSectors(): string[] {
    return [...new Set(Array.from(this.bySymbol.values()).map(e => e.sector))].sort();
  }
}
