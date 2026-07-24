/**
 * Philippine Stock Exchange (PSE) Universe
 *
 * Sourced from the live phisix-api3.appspot.com feed (the public PSE quote
 * mirror already used elsewhere in this codebase — see api/stock/[symbol].ts).
 * This list is the full common-share listing returned by that feed at the
 * time it was generated (preferred shares, warrants, notes, and rights
 * excluded). Prices/volumes are NOT stored here — this file is the static
 * symbol/name universe for search & autocomplete; live quotes are fetched
 * per-symbol at request time.
 */

export interface PSEStock {
  symbol: string;
  name: string;
}

// PSEi — the PSE's flagship 30-company composite index (free-float market
// cap weighted). Verified against the live feed and Wikipedia's PSE
// Composite Index constituent table.
export const PSEI_30: string[] = [
  "AC", "ACEN", "AEV", "ALI", "AREIT", "BDO", "BPI", "CBC", "CNPF", "CNVRG",
  "DMC", "EMI", "GLO", "GTCAP", "ICT", "JFC", "JGS", "LTG", "MBT", "MER",
  "MONDE", "PGOLD", "PLUS", "RCR", "SCC", "SM", "SMC", "SMPH", "TEL", "URC",
];

// Best-effort classification of the PSEi 30 into the PSE's own six sector
// groupings (Financials, Industrial, Holding Firms, Property, Services,
// Mining & Oil). Unlike the ticker list above this is not pulled from a
// verified feed — treat as a reasonable default, not an authoritative
// source, and correct against pse.com.ph's official sector pages if exact
// classification matters.
export const PSE_SECTORS: Record<string, string[]> = {
  financials: ["BDO", "BPI", "CBC", "MBT"],
  industrial: ["ACEN", "AEV", "CNPF", "EMI", "MER", "MONDE", "SMC", "URC"],
  holdingFirms: ["AC", "DMC", "GTCAP", "JGS", "LTG", "SM"],
  property: ["ALI", "AREIT", "RCR", "SMPH"],
  services: ["CNVRG", "GLO", "ICT", "JFC", "PGOLD", "PLUS", "TEL"],
  miningAndOil: ["SCC"],
};

// Full common-share universe — all PSE-listed common stocks available on
// the live feed. Includes PSEi members plus the broader listed board.
export const PSE_STOCKS: PSEStock[] = [
  { symbol: "AAA", name: "Asia Amalgamated Holdings Corporation" },
  { symbol: "AB", name: "Atok-Big Wedge Co., Inc." },
  { symbol: "ABA", name: "AbaCore Capital Holdings, Inc." },
  { symbol: "ABG", name: "Asiabest Group International Inc." },
  { symbol: "ABS", name: "ABS-CBN Corporation" },
  { symbol: "ABSP", name: "ABS-CBN Holdings Corporation - Philippine Deposit Receipts" },
  { symbol: "AC", name: "Ayala Corporation" },
  { symbol: "ACE", name: "Acesite (Phils.) Hotel Corporation" },
  { symbol: "ACEN", name: "ACEN CORPORATION" },
  { symbol: "ACR", name: "Alsons Consolidated Resources, Inc." },
  { symbol: "AEV", name: "Aboitiz Equity Ventures, Inc." },
  { symbol: "AGI", name: "Alliance Global Group, Inc." },
  { symbol: "ALCO", name: "Arthaland Corporation" },
  { symbol: "ALHI", name: "Anchor Land Holdings, Inc." },
  { symbol: "ALI", name: "Ayala Land, Inc." },
  { symbol: "ALLDY", name: "AllDay Marts, Inc." },
  { symbol: "ALLHC", name: "AyalaLand Logistics Holdings Corp." },
  { symbol: "ALTER", name: "Alternergy Holdings Corporation" },
  { symbol: "ANI", name: "AgriNurture, Inc." },
  { symbol: "ANS", name: "A. Soriano Corporation" },
  { symbol: "AP", name: "Aboitiz Power Corporation" },
  { symbol: "APC", name: "APC Group, Inc." },
  { symbol: "APL", name: "Apollo Global Capital, Inc." },
  { symbol: "APO", name: "Anglo Philippine Holdings Corporation" },
  { symbol: "APVI", name: "Altus Property Ventures, Inc." },
  { symbol: "APX", name: "Apex Mining Co., Inc." },
  { symbol: "AR", name: "Abra Mining & Industrial Corporation" },
  { symbol: "ARA", name: "Araneta Properties, Inc." },
  { symbol: "AREIT", name: "AREIT, Inc." },
  { symbol: "ASLAG", name: "Raslag Corp." },
  { symbol: "AT", name: "Atlas Consolidated Mining and Development Corporation" },
  { symbol: "ATN", name: "ATN Holdings, Inc. ``A``" },
  { symbol: "ATNB", name: "ATN Holdings, Inc. ``B``" },
  { symbol: "AUB", name: "Asia United Bank Corporation" },
  { symbol: "AXLM", name: "Axelum Resources Corp." },
  { symbol: "BALAI", name: "Balai Ni Fruitas Inc." },
  { symbol: "BC", name: "Benguet Corporation ``A``" },
  { symbol: "BCB", name: "Benguet Corporation ``B``" },
  { symbol: "BCOR", name: "Berjaya Philippines, Inc." },
  { symbol: "BDO", name: "BDO Unibank, Inc." },
  { symbol: "BEL", name: "Belle Corporation" },
  { symbol: "BH", name: "BHI Holdings, Inc." },
  { symbol: "BHI", name: "Boulevard Holdings, Inc." },
  { symbol: "BLOOM", name: "Bloomberry Resorts Corporation" },
  { symbol: "BMM", name: "Bogo-Medellin Milling Co., Inc." },
  { symbol: "BNCOM", name: "Bank of Commerce" },
  { symbol: "BPI", name: "Bank of the Philippine Islands" },
  { symbol: "BRN", name: "A Brown Company, Inc." },
  { symbol: "BSC", name: "Basic Energy Corporation" },
  { symbol: "C", name: "Chelsea Logistics and Infrastructure Holdings Corp." },
  { symbol: "CA", name: "Concrete Aggregates Corp. ``A``" },
  { symbol: "CAB", name: "Concrete Aggregates Corp. ``B``" },
  { symbol: "CAT", name: "Central Azucarera de Tarlac, Inc." },
  { symbol: "CBC", name: "China Banking Corporation" },
  { symbol: "CDC", name: "Cityland Development Corporation" },
  { symbol: "CEB", name: "Cebu Air, Inc." },
  { symbol: "CEI", name: "Crown Equities, Inc." },
  { symbol: "CEU", name: "Centro Escolar University" },
  { symbol: "CHP", name: "Concreat Holdings Philippines, Inc." },
  { symbol: "CIC", name: "Concepcion Industrial Corporation" },
  { symbol: "CLI", name: "Cebu Landmasters, Inc." },
  { symbol: "CNPF", name: "Century Pacific Food, Inc." },
  { symbol: "CNVRG", name: "Converge Information and Communications Technology Solutions, Inc." },
  { symbol: "COAL", name: "Coal Asia Holdings Incorporated" },
  { symbol: "COL", name: "COL Financial Group, Inc." },
  { symbol: "COSCO", name: "Cosco Capital, Inc." },
  { symbol: "CPG", name: "Century Properties Group Inc." },
  { symbol: "CPM", name: "Century Peak Holdings Corporation" },
  { symbol: "CREC", name: "Citicore Renewable Energy Corporation" },
  { symbol: "CREIT", name: "Citicore Energy REIT Corp." },
  { symbol: "CROWN", name: "Crown Asia Chemicals Corporation" },
  { symbol: "CSB", name: "Citystate Savings Bank, Inc." },
  { symbol: "CTS", name: "CTS Global Equity Group, Inc." },
  { symbol: "CYBR", name: "Cyber Bay Corporation" },
  { symbol: "DD", name: "DoubleDragon Corporation" },
  { symbol: "DDMPR", name: "DDMP REIT, Inc." },
  { symbol: "DELM", name: "Del Monte Pacific Limited" },
  { symbol: "DFNN", name: "DFNN, Inc." },
  { symbol: "DHI", name: "Dominion Holdings, Inc." },
  { symbol: "DITO", name: "DITO CME Holdings Corp." },
  { symbol: "DIZ", name: "Dizon Copper-Silver Mines, Inc." },
  { symbol: "DMC", name: "DMCI Holdings, Inc." },
  { symbol: "DMPA1", name: "Del Monte Pacific Limited U.S. Dollar-Denominated Series A-1 Preference Shares" },
  { symbol: "DMPA2", name: "Del Monte Pacific Limited U.S. Dollar-Denominated Series A-2 Preference Shares" },
  { symbol: "DMPI", name: "DEL MONTE PHILIPPINES, INC." },
  { symbol: "DMW", name: "D.M. Wenceslao & Associates, Incorporated" },
  { symbol: "DNL", name: "D&L Industries, Inc." },
  { symbol: "DTEL", name: "PLDT INC. -USD" },
  { symbol: "DWC", name: "Discovery World Corporation" },
  { symbol: "ECP", name: "Easycall Communications Philippines, Inc." },
  { symbol: "ECVC", name: "East Coast Vulcan Mining Corporation" },
  { symbol: "EEI", name: "EEI Corporation" },
  { symbol: "EG", name: "IP E-Game Ventures, Inc." },
  { symbol: "EGRN", name: "Everwoods Green Resources and Holdings, Inc." },
  { symbol: "ELI", name: "Empire East Land Holdings, Inc." },
  { symbol: "EMI", name: "Emperador Inc." },
  { symbol: "ENEX", name: "ENEX Energy Corp." },
  { symbol: "EURO", name: "Euro-Med Laboratories Phil., Inc." },
  { symbol: "EW", name: "East West Banking Corporation" },
  { symbol: "FAF", name: "First Abacus Financial Holdings Corp." },
  { symbol: "FB", name: "San Miguel Food and Beverage, Inc." },
  { symbol: "FCG", name: "Figaro Culinary Group, Inc." },
  { symbol: "FDC", name: "Filinvest Development Corporation" },
  { symbol: "FERRO", name: "Ferronoux Holdings, Inc." },
  { symbol: "FEU", name: "Far Eastern University, Incorporated" },
  { symbol: "FFI", name: "Filipino Fund, Inc." },
  { symbol: "FGEN", name: "First Gen Corporation" },
  { symbol: "FILRT", name: "Filinvest REIT Corp." },
  { symbol: "FJP", name: "F&J Prince Holdings Corporation ``A``" },
  { symbol: "FJPB", name: "F&J Prince Holdings Corporation ``B``" },
  { symbol: "FLI", name: "Filinvest Land, Inc." },
  { symbol: "FMETF", name: "First Metro Philippine Equity Exchange Traded Fund, Inc." },
  { symbol: "FNI", name: "Global Ferronickel Holdings, Inc." },
  { symbol: "FOOD", name: "Alliance Select Foods International, Inc." },
  { symbol: "FPH", name: "First Philippine Holdings Corporation" },
  { symbol: "FPI", name: "Forum Pacific, Inc." },
  { symbol: "FRUIT", name: "Fruitas Holdings, Inc." },
  { symbol: "FYN", name: "Filsyn Corporation ``A``" },
  { symbol: "FYNB", name: "Filsyn Corporation ``B``" },
  { symbol: "GEO", name: "GEOGRACE Resources Philippines, Inc." },
  { symbol: "GERI", name: "Global-Estate Resorts, Inc." },
  { symbol: "GLO", name: "Globe Telecom, Inc." },
  { symbol: "GMA7", name: "GMA Network, Inc." },
  { symbol: "GMAP", name: "GMA Holdings, Inc. - Philippine Deposit Receipts" },
  { symbol: "GPH", name: "Grand Plaza Hotel Corporation" },
  { symbol: "GREEN", name: "Greenergy Holdings Incorporated" },
  { symbol: "GSMI", name: "Ginebra San Miguel, Inc." },
  { symbol: "GTCAP", name: "GT Capital Holdings, Inc." },
  { symbol: "HI", name: "House of Investments, Inc." },
  { symbol: "HOME", name: "AllHome Corp." },
  { symbol: "HTI", name: "Haus Talk, Inc." },
  { symbol: "I", name: "I-Remit, Inc." },
  { symbol: "ICT", name: "International Container Terminal Services, Inc." },
  { symbol: "IDC", name: "Italpinas Development Corporation" },
  { symbol: "IMI", name: "Integrated Micro-Electronics, Inc." },
  { symbol: "IMP", name: "Imperial Resources, Inc." },
  { symbol: "INFRA", name: "Philippine Infradev Holdings Inc." },
  { symbol: "ION", name: "Ionics, Inc." },
  { symbol: "IPM", name: "IPM Holdings, Inc." },
  { symbol: "IPO", name: "iPeople, Inc." },
  { symbol: "IS", name: "Island Information & Technology, Inc." },
  { symbol: "JAS", name: "Jackstones, Inc." },
  { symbol: "JFC", name: "Jollibee Foods Corporation" },
  { symbol: "JGS", name: "JG Summit Holdings, Inc." },
  { symbol: "JOH", name: "Jolliville Holdings Corporation" },
  { symbol: "KEEPR", name: "The Keepers Holdings, Inc." },
  { symbol: "KEP", name: "Keppel Philippines Properties, Inc." },
  { symbol: "KPPI", name: "Kepwealth Property Phils., Inc." },
  { symbol: "LBC", name: "LBC Express Holdings, Inc." },
  { symbol: "LC", name: "Lepanto Consolidated Mining Company ``A``" },
  { symbol: "LCB", name: "Lepanto Consolidated Mining Company ``B``" },
  { symbol: "LFM", name: "Liberty Flour Mills, Inc." },
  { symbol: "LMG", name: "LMG Corp." },
  { symbol: "LODE", name: "Lodestar Investment Holdings Corporation" },
  { symbol: "LOTO", name: "Pacific Online Systems Corporation" },
  { symbol: "LPC", name: "LFM Properties Corporation" },
  { symbol: "LPZ", name: "Lopez Holdings Corporation" },
  { symbol: "LSC", name: "Lorenzo Shipping Corporation" },
  { symbol: "LTG", name: "LT Group, Inc." },
  { symbol: "MA", name: "Manila Mining Corporation ``A``" },
  { symbol: "MAB", name: "Manila Mining Corporation ``B``" },
  { symbol: "MAC", name: "MacroAsia Corporation" },
  { symbol: "MACAY", name: "Macay Holdings, Inc." },
  { symbol: "MAH", name: "Metro Alliance Holdings & Equities Corp. ``A``" },
  { symbol: "MAHB", name: "Metro Alliance Holdings & Equities Corp. ``B``" },
  { symbol: "MARC", name: "Marcventures Holdings, Inc." },
  { symbol: "MAXS", name: "Max`s Group, Inc." },
  { symbol: "MB", name: "Manila Bulletin Publishing Corporation" },
  { symbol: "MBC", name: "Manila Broadcasting Company" },
  { symbol: "MBT", name: "Metropolitan Bank & Trust Company" },
  { symbol: "MED", name: "Medco Holdings, Inc." },
  { symbol: "MEDIC", name: "Medilines Distributors Incorporated" },
  { symbol: "MEG", name: "Megaworld Corporation" },
  { symbol: "MER", name: "Manila Electric Company" },
  { symbol: "MFC", name: "Manulife Financial Corporation" },
  { symbol: "MFIN", name: "Makati Finance Corporation" },
  { symbol: "MG", name: "Millennium Global Holdings, Inc." },
  { symbol: "MGH", name: "Metro Global Holdings Corporation" },
  { symbol: "MHC", name: "Mabuhay Holdings Corporation" },
  { symbol: "MJC", name: "Manila Jockey Club, Inc." },
  { symbol: "MJIC", name: "MJC Investments Corporation" },
  { symbol: "MM", name: "MerryMart Consumer Corp." },
  { symbol: "MONDE", name: "Monde Nissin Corporation" },
  { symbol: "MRC", name: "MRC Allied, Inc." },
  { symbol: "MREIT", name: "MREIT, Inc." },
  { symbol: "MRSGI", name: "Metro Retail Stores Group, Inc." },
  { symbol: "MVC", name: "Mabuhay Vinyl Corporation" },
  { symbol: "MWC", name: "Manila Water Company, Inc." },
  { symbol: "MWIDE", name: "Megawide Construction Corporation" },
  { symbol: "MYNLD", name: "Maynilad Water Services, Inc." },
  { symbol: "NI", name: "NiHAO Mineral Resources International, Inc." },
  { symbol: "NIKL", name: "Nickel Asia Corporation" },
  { symbol: "NOW", name: "Now Corporation" },
  { symbol: "NRCP", name: "National Reinsurance Corporation of the Philippines" },
  { symbol: "NXGEN", name: "NextGenesis Corporation" },
  { symbol: "OGP", name: "OceanaGold (Philippines), Inc." },
  { symbol: "OM", name: "Omico Corporation" },
  { symbol: "OPM", name: "Oriental Petroleum and Minerals Corporation ``A``" },
  { symbol: "OPMB", name: "Oriental Petroleum and Minerals Corporation ``B``" },
  { symbol: "ORE", name: "Oriental Peninsula Resources Group, Inc." },
  { symbol: "OV", name: "The Philodrill Corporation" },
  { symbol: "PA", name: "Pacifica Holdings, Inc." },
  { symbol: "PAL", name: "PAL Holdings, Inc." },
  { symbol: "PAX", name: "Paxys, Inc." },
  { symbol: "PBB", name: "Philippine Business Bank, Inc., A Savings Bank" },
  { symbol: "PBC", name: "Philippine Bank of Communications" },
  { symbol: "PCOR", name: "Petron Corporation" },
  { symbol: "PERC", name: "PetroEnergy Resources Corporation" },
  { symbol: "PGOLD", name: "Puregold Price Club, Inc." },
  { symbol: "PHA", name: "Premiere Horizon Alliance Corporation" },
  { symbol: "PHC", name: "Philcomsat Holdings Corporation" },
  { symbol: "PHES", name: "Philippine Estates Corporation" },
  { symbol: "PHN", name: "Phinma Corporation" },
  { symbol: "PHR", name: "PH Resorts Group Holdings, Inc." },
  { symbol: "PIZZA", name: "Shakey`s Pizza Asia Ventures Inc." },
  { symbol: "PLUS", name: "DigiPlus Interactive Corp." },
  { symbol: "PMPC", name: "Panasonic Manufacturing Philippines Corporation" },
  { symbol: "PNB", name: "Philippine National Bank" },
  { symbol: "PNC", name: "Philippine National Construction Corporation" },
  { symbol: "PNX", name: "P-H-O-E-N-I-X PETROLEUM PHILIPPINES, INC." },
  { symbol: "PORT", name: "Globalport 900, Inc." },
  { symbol: "PPC", name: "Pryce Corporation" },
  { symbol: "PRC", name: "Philippine Racing Club, Inc." },
  { symbol: "PREIT", name: "Premiere Island Power REIT Corporation" },
  { symbol: "PRIM", name: "Prime Media Holdings, Inc." },
  { symbol: "PRMX", name: "Primex Corporation" },
  { symbol: "PSB", name: "Philippine Savings Bank" },
  { symbol: "PSE", name: "The Philippine Stock Exchange, Inc." },
  { symbol: "PTC", name: "Philippine Trust Company" },
  { symbol: "PTT", name: "PT&T Corp." },
  { symbol: "PX", name: "Philex Mining Corporation" },
  { symbol: "PXP", name: "PXP Energy Corporation" },
  { symbol: "RCB", name: "Rizal Commercial Banking Corporation" },
  { symbol: "RCI", name: "Roxas and Company, Inc." },
  { symbol: "RCR", name: "RL Commercial REIT, Inc." },
  { symbol: "REDC", name: "Repower Energy Development Corporation" },
  { symbol: "REG", name: "Republic Glass Holdings Corporation" },
  { symbol: "RFM", name: "RFM Corporation" },
  { symbol: "RLC", name: "Robinsons Land Corporation" },
  { symbol: "RLT", name: "Philippine Realty and Holdings Corporation" },
  { symbol: "ROCK", name: "Rockwell Land Corporation" },
  { symbol: "ROX", name: "Roxas Holdings, Inc." },
  { symbol: "RRHI", name: "Robinsons Retail Holdings, Inc." },
  { symbol: "SBS", name: "SBS Philippines Corporation" },
  { symbol: "SCC", name: "Semirara Mining and Power Corporation" },
  { symbol: "SECB", name: "Security Bank Corporation" },
  { symbol: "SEVN", name: "Philippine Seven Corporation" },
  { symbol: "SFI", name: "Swift Foods, Inc." },
  { symbol: "SGI", name: "Solid Group, Inc." },
  { symbol: "SGP", name: "Synergy Grid & Development Phils., Inc." },
  { symbol: "SHLPH", name: "Shell Pilipinas Corporation" },
  { symbol: "SHNG", name: "Shang Properties, Inc." },
  { symbol: "SLF", name: "Sun Life Financial Inc." },
  { symbol: "SLI", name: "Sta. Lucia Land, Inc." },
  { symbol: "SM", name: "SM Investments Corporation" },
  { symbol: "SMC", name: "San Miguel Corporation" },
  { symbol: "SMPH", name: "SM Prime Holdings, Inc." },
  { symbol: "SOC", name: "SOCResources, Inc." },
  { symbol: "SPC", name: "SPC Power Corporation" },
  { symbol: "SPM", name: "Seafront Resources Corporation" },
  { symbol: "SPNEC", name: "SP New Energy Corporation" },
  { symbol: "SRDC", name: "Supercity Realty Development Corporation" },
  { symbol: "SSI", name: "SSI Group, Inc." },
  { symbol: "STI", name: "STI Education Systems Holdings, Inc." },
  { symbol: "STN", name: "Steniel Manufacturing Corporation" },
  { symbol: "STR", name: "Vistamalls, Inc." },
  { symbol: "SUN", name: "Suntrust Resort Holdings, Inc." },
  { symbol: "T", name: "TKC Metals Corporation" },
  { symbol: "TBGI", name: "Transpacific Broadband Group Int`l. Inc." },
  { symbol: "TECH", name: "Cirtek Holdings Philippines Corporation" },
  { symbol: "TEL", name: "PLDT Inc." },
  { symbol: "TFC", name: "PTFC Redevelopment Corporation" },
  { symbol: "TFHI", name: "Top Frontier Investment Holdings, Inc." },
  { symbol: "TOP", name: "Top Line Business Development Corp." },
  { symbol: "TUGS", name: "Harbor Star Shipping Services, Inc." },
  { symbol: "UBP", name: "Union Bank of the Philippines" },
  { symbol: "UNH", name: "Uniholdings Inc." },
  { symbol: "UPM", name: "United Paragon Mining Corporation" },
  { symbol: "UPSON", name: "Upson International Corp." },
  { symbol: "URC", name: "Universal Robina Corporation" },
  { symbol: "V", name: "Vantage Equities, Inc." },
  { symbol: "VITA", name: "Vitarich Corporation" },
  { symbol: "VLC", name: "Villar Land Holdings Corp." },
  { symbol: "VLL", name: "Vista Land & Lifescapes, Inc." },
  { symbol: "VMC", name: "Victorias Milling Company, Inc." },
  { symbol: "VREIT", name: "VistaREIT, Inc." },
  { symbol: "VVT", name: "Vivant Corporation" },
  { symbol: "WEB", name: "Philweb Corporation" },
  { symbol: "WIN", name: "Wellex Industries, Inc." },
  { symbol: "WLCON", name: "Wilcon Depot, Inc." },
  { symbol: "WPI", name: "Waterfront Philippines, Incorporated" },
  { symbol: "X", name: "Xurpas Inc." },
  { symbol: "XG", name: "NexGen Energy Corp." },
  { symbol: "ZHI", name: "Zeus Holdings, Inc." },];

export const PSE_SYMBOLS: string[] = PSE_STOCKS.map((s) => s.symbol);

// Real-time data structure for a single stock, used by the aggregation
// layer (api/_lib/services/stockDataAggregator.ts) and typed responses.
export interface CompleteStockData {
  // Identity
  symbol: string;
  isin: string;
  name: string;
  sector: string;
  industry: string;
  exchange: "PSE";


  // Price Data (Real-time)
  price: {
    current: number;
    open: number;
    high: number;
    low: number;
    close: number;
    previousClose: number;
    changeAbs: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    timestamp: string;
  };

  // Technical Indicators (All 50+)
  technicals: {
    // Momentum Indicators
    rsi: number; // 14-period
    rsi9: number;
    rsi21: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;

    // Trend Indicators
    sma20: number;
    sma50: number;
    sma100: number;
    sma200: number;
    ema12: number;
    ema26: number;

    // Volatility Indicators
    atr: number;
    bollinger: { upper: number; middle: number; lower: number };
    keltnerChannel: { upper: number; lower: number };

    // Volume Indicators
    obv: number;
    vpt: number;

    // Other Indicators
    stochastic: { k: number; d: number };
    williams: number;
    cci: number;
    adx: number;
    beta: number;
    correlation: number;
    volatility: number;
    beta52w: number;
  };

  // Fundamental Metrics (All 100+)
  fundamentals: {
    // Valuation
    pe: number;
    pb: number;
    ps: number;
    peg: number;
    pcf: number;
    payout: number;
    div: number;
    dividendYield: number;

    // Profitability
    roe: number;
    roa: number;
    roce: number;
    roic: number;
    npm: number;
    opm: number;
    gm: number;

    // Growth Metrics
    revenueGrowth1y: number;
    revenueGrowth3y: number;
    revenueGrowth5y: number;
    earningsGrowth1y: number;
    earningsGrowth3y: number;
    earningsGrowth5y: number;
    epsCagr5y: number;

    // Financial Health
    debtToEquity: number;
    debt: number;
    equity: number;
    cash: number;
    cashToDebt: number;
    currentRatio: number;
    quickRatio: number;
    workingCapital: number;

    // Efficiency
    assetTurnover: number;
    inventoryTurnover: number;
    receivableTurnover: number;
    operatingCycle: number;

    // Coverage
    interestCoverage: number;
    debtServiceCoverage: number;

    // Per Share Metrics
    eps: number;
    bookValue: number;
    freeCashFlow: number;
    cashFlow: number;
  };

  // 52-Week Data
  performance52w: {
    high: number;
    low: number;
    highDate: string;
    lowDate: string;
    changePercent: number;
    volatility: number;
  };

  // Financial Statements
  financials: {
    annual: {
      revenue: Array<{ year: number; value: number }>;
      profit: Array<{ year: number; value: number }>;
      ebitda: Array<{ year: number; value: number }>;
      operatingCash: Array<{ year: number; value: number }>;
    };
    quarterly: {
      revenue: Array<{ quarter: string; value: number }>;
      profit: Array<{ quarter: string; value: number }>;
      ebitda: Array<{ quarter: string; value: number }>;
    };
  };

  // Shareholding
  shareholding: {
    promoter: number;
    fii: number;
    dii: number;
    retail: number;
    others: number;
    trends: Array<{ period: string; promoter: number; fii: number; dii: number }>;
  };

  // Market Data
  market: {
    pe: number;
    industryPe: number;
    industryPb: number;
    industryDiv: number;
    competitorPe: number[];
  };

  // Analysis
  consensus: {
    rating: "BUY" | "HOLD" | "SELL";
    targetPrice: number;
    upside: number;
    analysts: number;
    buyCount: number;
    holdCount: number;
    sellCount: number;
  };

  // Health Score (350 parameters)
  healthScore: {
    overall: number;
    valuation: number;
    quality: number;
    growth: number;
    momentum: number;
    risk: number;
    health: number;
    trend: "improving" | "stable" | "declining";
  };

  // Metadata
  metadata: {
    lastUpdated: string;
    dataSource: string;
    updateFrequency: "realtime" | "hourly" | "daily";
  };
}

export const TECHNICAL_INDICATORS = [
  "rsi", "rsi9", "rsi21", "macd", "macdSignal", "macdHistogram",
  "sma20", "sma50", "sma100", "sma200", "ema12", "ema26",
  "atr", "bollingerUpper", "bollingerLower", "keltnerChannel",
  "obv", "vpt", "stochastic", "williams", "cci", "adx",
  "beta", "correlation", "volatility"
];

export const FUNDAMENTAL_INDICATORS = [
  "pe", "pb", "ps", "peg", "pcf", "payout", "dividendYield",
  "roe", "roa", "roce", "roic", "npm", "opm", "gm",
  "revenueGrowth1y", "revenueGrowth3y", "revenueGrowth5y",
  "earningsGrowth1y", "earningsGrowth3y", "earningsGrowth5y",
  "debtToEquity", "debt", "equity", "cash", "currentRatio", "quickRatio",
  "assetTurnover", "inventoryTurnover", "receivableTurnover",
  "interestCoverage", "eps", "bookValue", "freeCashFlow"
];
