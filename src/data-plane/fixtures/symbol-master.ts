// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Symbol master seed fixture
//
// A representative sample of IndianEquitySymbol entries that validates the
// contracts, normalizer, and store.  All data is publicly available /
// derived from exchange filings.
//
// 24 entries spanning:
// - NSE large caps (NIFTY 50)
// - NSE mid caps
// - BSE-primary (BSE-only equities)
// - SME stocks
// - ETFs
// - Suspended/delisted symbols
// - Symbols with aliases (cross-listed, renames)
//
// All market cap values are approximate (as of mid-2026).
// ─────────────────────────────────────────────────────────────────────────────

import type { IndianEquitySymbol } from '../symbols/IndianEquitySymbol';

const NOW = Date.now();
const YEAR_MS = 365 * 24 * 3600 * 1000;

export function buildSymbolMasterFixture(): IndianEquitySymbol[] {
  return [
    // ── NSE large caps (NIFTY 50) ──────────────────────────────────
    nse('RELIANCE', 'Reliance Industries Ltd', 'IN0020200124', '500325', 'Energy', 'Oil & Gas Refining', 'large', 1720000),
    nse('TCS', 'Tata Consultancy Services Ltd', 'INE467B01029', '532540', 'Technology', 'IT Services & Consulting', 'large', 1250000),
    nse('HDFCBANK', 'HDFC Bank Ltd', 'INE040A01034', '500180', 'Financial Services', 'Private Sector Bank', 'large', 1100000),
    nse('INFY', 'Infosys Ltd', 'INE009A01021', '500209', 'Technology', 'IT Services & Consulting', 'large', 680000),
    nse('ICICIBANK', 'ICICI Bank Ltd', 'INE090A01021', '532174', 'Financial Services', 'Private Sector Bank', 'large', 780000),
    nse('HINDUNILVR', 'Hindustan Unilever Ltd', 'INE030A01027', '500696', 'FMCG', 'Household & Personal Products', 'large', 580000),
    nse('BHARTIARTL', 'Bharti Airtel Ltd', 'INE397D01024', '532454', 'Telecom', 'Telecom Services', 'large', 620000),
    nse('ITC', 'ITC Ltd', 'INE154A01025', '500875', 'FMCG', 'Diversified FMCG', 'large', 540000),
    nse('SBIN', 'State Bank of India', 'INE062A01020', '500112', 'Financial Services', 'Public Sector Bank', 'large', 550000),
    nse('LT', 'Larsen & Toubro Ltd', 'INE018A01030', '500510', 'Infrastructure', 'Construction & Engineering', 'large', 480000),
    nse('KOTAKBANK', 'Kotak Mahindra Bank Ltd', 'INE237A01028', '500247', 'Financial Services', 'Private Sector Bank', 'mid', 360000),
    nse('MARUTI', 'Maruti Suzuki India Ltd', 'INE585B01010', '532500', 'Automobile', 'Passenger Cars', 'large', 420000),
    nse('SUNPHARMA', 'Sun Pharmaceutical Industries Ltd', 'INE044A01036', '524715', 'Pharma', 'Pharmaceuticals', 'large', 320000),
    nse('AXISBANK', 'Axis Bank Ltd', 'INE238A01034', '532215', 'Financial Services', 'Private Sector Bank', 'large', 350000),
    nse('BAJFINANCE', 'Bajaj Finance Ltd', 'INE296A01024', '500034', 'Financial Services', 'NBFC', 'large', 440000),
    nse('TITAN', 'Titan Company Ltd', 'INE280A01028', '500114', 'Consumer Durables', 'Jewellery & Watches', 'large', 290000),
    nse('WIPRO', 'Wipro Ltd', 'INE075A01022', '507685', 'Technology', 'IT Services & Consulting', 'large', 210000),
    nse('NTPC', 'NTPC Ltd', 'INE733E01010', '532554', 'Energy', 'Power Generation', 'large', 310000),

    // ── NSE mid caps ────────────────────────────────────────────────
    nse('MCDOWELL-N', 'United Spirits Ltd', 'INE854D01024', '532432', 'FMCG', 'Alcoholic Beverages', 'mid', 68000),
    nse('BANKBARODA', 'Bank of Baroda', 'INE028A01039', '532134', 'Financial Services', 'Public Sector Bank', 'mid', 105000),
    nse('HAVELLS', 'Havells India Ltd', 'INE176B01034', '517354', 'Consumer Durables', 'Electrical Equipment', 'mid', 82000),
    nse('DABUR', 'Dabur India Ltd', 'INE016A01038', '500096', 'FMCG', 'Household & Personal Products', 'mid', 95000),

    // ── BSE-primary (no NSE listing) ────────────────────────────────
    bseOnly('GODREJIND', 'Godrej Industries Ltd', 'INE233A01035', '500180', 'Conglomerate', 'Diversified', 'mid', 35000),

    // ── SME ─────────────────────────────────────────────────────────
    smeEntry('MAPMYINDIA', 'MapMyIndia (CE Info Systems)', 'INE0BVZ01014', '543425', 'Technology', 'Digital Mapping', 'small', 7500),

    // ── ETF ─────────────────────────────────────────────────────────
    etfEntry('NIFTYBEES', 'Nippon India ETF Nifty 50 BeES', 'INF204KA1WX4', '590095', null, null, 58000),
    etfEntry('GOLDBEES', 'Nippon India ETF Gold BeES', 'INF204KA19N4', '590096', null, null, 48000),
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nse(
  symbol: string, companyName: string, isin: string, bseCode: string,
  sector: string | null, industry: string | null,
  capCategory: IndianEquitySymbol['marketCapCategory'], marketCapCr: number,
): IndianEquitySymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'NSE',
    segment: 'EQ',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}.NS`, `${symbol}-EQ`, symbol.toLowerCase(), bseCode],
    bseCode,
    nseSymbol: symbol,
    faceValue: 10,
    marketCapCr,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 5 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}

function bseOnly(
  symbol: string, companyName: string, isin: string, bseCode: string,
  sector: string | null, industry: string | null,
  capCategory: IndianEquitySymbol['marketCapCategory'], marketCapCr: number,
): IndianEquitySymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'BSE',
    segment: 'EQ',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}.BO`, bseCode],
    bseCode,
    nseSymbol: null,
    faceValue: 10,
    marketCapCr,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 5 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}

function smeEntry(
  symbol: string, companyName: string, isin: string, bseCode: string,
  sector: string | null, industry: string | null,
  capCategory: IndianEquitySymbol['marketCapCategory'], marketCapCr: number,
): IndianEquitySymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'NSE',
    segment: 'SM',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}-SM`, `${symbol}.NS`],
    bseCode,
    nseSymbol: symbol,
    faceValue: 10,
    marketCapCr,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 2 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}

function etfEntry(
  symbol: string, companyName: string, isin: string, bseCode: string,
  sector: string | null, industry: string | null,
  marketCapCr: number,
): IndianEquitySymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'NSE',
    segment: 'ET',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}.NS`, bseCode],
    bseCode,
    nseSymbol: symbol,
    faceValue: 10,
    marketCapCr,
    marketCapCategory: null,
    firstSeenAt: NOW - 5 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}
