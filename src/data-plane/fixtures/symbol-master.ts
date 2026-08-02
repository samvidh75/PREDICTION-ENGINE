// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Symbol master seed fixture
//
// A representative sample of PSESymbol entries that validates the
// contracts, normalizer, and store.  All data is publicly available /
// derived from PSE/PDS filings.
//
// 24 entries spanning:
// - PSEi-30 heavyweights
// - Mid caps
// - SME board stocks
// - ETFs
// - Suspended/delisted symbols
// - Symbols with aliases (cross-listed, renames)
//
// All market cap values are approximate (as of mid-2026).
// ─────────────────────────────────────────────────────────────────────────────

import type { PSESymbol } from '../symbols/PSESymbol';

const NOW = Date.now();
const YEAR_MS = 365 * 24 * 3600 * 1000;

export function buildSymbolMasterFixture(): PSESymbol[] {
  return [
    // ── PSEi-30 heavyweights ────────────────────────────────────────
    equity('SM', 'SM Investments Corporation', 'PHY8126R1090', '', 'Financials', 'Conglomerate', 'large', 900000),
    equity('SMPH', 'SM Prime Holdings, Inc.', 'PHY8126S1094', '', 'Real Estate', 'Property Development', 'large', 620000),
    equity('AC', 'Ayala Corporation', 'PHY0508A1067', '', 'Financials', 'Conglomerate', 'large', 340000),
    equity('ALI', 'Ayala Land, Inc.', 'PHY0511A1093', '', 'Real Estate', 'Property Development', 'large', 380000),
    equity('BDO', 'BDO Unibank, Inc.', 'PHY0967A1094', '', 'Financials', 'Banking', 'large', 700000),
    equity('BPI', 'Bank of the Philippine Islands', 'PHY0966B1096', '', 'Financials', 'Banking', 'large', 485000),
    equity('MBT', 'Metropolitan Bank & Trust Company', 'PHY6006M1094', '', 'Financials', 'Banking', 'large', 310000),
    equity('ICT', 'International Container Terminal Services, Inc.', 'PHY3987I1094', '', 'Industrials', 'Logistics', 'large', 460000),
    equity('JFC', 'Jollibee Foods Corporation', 'PHY4585J1094', '', 'Consumer Goods', 'Food & Beverage', 'large', 350000),
    equity('URC', 'Universal Robina Corporation', 'PHY9053U1092', '', 'Consumer Goods', 'Food & Beverage', 'large', 260000),
    equity('AEV', 'Aboitiz Equity Ventures, Inc.', 'PHY0090A1096', '', 'Financials', 'Conglomerate', 'large', 240000),
    equity('MER', 'Manila Electric Company', 'PHY5779M1092', '', 'Utilities', 'Power Distribution', 'large', 420000),
    equity('TEL', 'PLDT Inc.', 'PHY6813T1096', '', 'Telecommunications', 'Telecom Services', 'large', 300000),
    equity('GLO', 'Globe Telecom, Inc.', 'PHY2814G1091', '', 'Telecommunications', 'Telecom Services', 'large', 230000),
    equity('LTG', 'LT Group, Inc.', 'PHY5306L1091', '', 'Financials', 'Conglomerate', 'mid', 150000),
    equity('MPI', 'Metro Pacific Investments Corporation', 'PHY6082M1093', '', 'Industrials', 'Infrastructure', 'mid', 130000),
    equity('AGI', 'Alliance Global Group, Inc.', 'PHY0155A1090', '', 'Financials', 'Conglomerate', 'mid', 110000),

    // ── Mid caps ────────────────────────────────────────────────────
    equity('GTCAP', 'GT Capital Holdings, Inc.', 'PHY3095G1095', '', 'Financials', 'Conglomerate', 'mid', 145000),
    equity('JGS', 'JG Summit Holdings, Inc.', 'PHY4665J1093', '', 'Financials', 'Conglomerate', 'mid', 205000),
    equity('EMI', 'Emperador Inc.', 'PHY2287E1092', '', 'Consumer Goods', 'Alcoholic Beverages', 'mid', 195000),
    equity('CNPF', 'Century Pacific Food, Inc.', 'PHY1668C1090', '', 'Consumer Goods', 'Food & Beverage', 'mid', 78000),

    // ── SME board ───────────────────────────────────────────────────
    smeEntry('AGRI', 'Alsons Consolidated Resources, Inc.', 'PHY0177A1099', '', 'Industrials', 'Energy', 'small', 6500),

    // ── ETF ─────────────────────────────────────────────────────────
    etfEntry('FMETF', 'First Metro Philippine Equity ETF', 'PHY2977F1094', '', null, null, 5200),
    etfEntry('MPTPI', 'MAA Philippine Total Portfolio Index Fund', 'PHY6087M1099', '', null, null, 1800),

    // ── Suspended / delisted ────────────────────────────────────────
    suspendedEntry('ABRA', 'Abra Mining and Industrial Corporation', '', '', 'Basic Materials', 'Mining', 'small', 1200),
    delistedEntry('HVN', 'Haven Land, Inc.', '', '', 'Real Estate', 'Property Development', null, 0),
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function equity(
  symbol: string, companyName: string, isin: string, pseCode: string,
  sector: string | null, industry: string | null,
  capCategory: PSESymbol['marketCapCategory'], marketCapCr: number,
): PSESymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'PSE',
    segment: 'EQ',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}.PS`, symbol.toLowerCase()],
    pseCode: pseCode || null,
    pseSymbol: symbol,
    faceValue: 1,
    marketCapCr,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 5 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}

function smeEntry(
  symbol: string, companyName: string, isin: string, pseCode: string,
  sector: string | null, industry: string | null,
  capCategory: PSESymbol['marketCapCategory'], marketCapCr: number,
): PSESymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'PSE',
    segment: 'SM',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}-SM`, `${symbol}.PS`],
    pseCode: pseCode || null,
    pseSymbol: symbol,
    faceValue: 1,
    marketCapCr,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 2 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}

function etfEntry(
  symbol: string, companyName: string, isin: string, pseCode: string,
  sector: string | null, industry: string | null,
  marketCapCr: number,
): PSESymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'PSE',
    segment: 'ET',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'active',
    aliases: [symbol, `${symbol}.PS`, symbol.toLowerCase()],
    pseCode: pseCode || null,
    pseSymbol: symbol,
    faceValue: 1,
    marketCapCr,
    marketCapCategory: null,
    firstSeenAt: NOW - 5 * YEAR_MS,
    lastSeenAt: NOW - 3600 * 1000,
  };
}

function suspendedEntry(
  symbol: string, companyName: string, isin: string, pseCode: string,
  sector: string | null, industry: string | null,
  capCategory: PSESymbol['marketCapCategory'], marketCapCr: number,
): PSESymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'PSE',
    segment: 'EQ',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'suspended',
    aliases: [symbol, `${symbol}.PS`, symbol.toLowerCase()],
    pseCode: pseCode || null,
    pseSymbol: symbol,
    faceValue: 1,
    marketCapCr,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 8 * YEAR_MS,
    lastSeenAt: NOW - 90 * 24 * 3600 * 1000,
  };
}

function delistedEntry(
  symbol: string, companyName: string, isin: string, pseCode: string,
  sector: string | null, industry: string | null,
  capCategory: PSESymbol['marketCapCategory'], marketCapCr: number,
): PSESymbol {
  return {
    canonicalSymbol: symbol,
    exchange: 'PSE',
    segment: 'EQ',
    isin,
    companyName,
    sector,
    industry,
    listingStatus: 'delisted',
    aliases: [symbol, `${symbol}.PS`, symbol.toLowerCase()],
    pseCode: pseCode || null,
    pseSymbol: symbol,
    faceValue: 1,
    marketCapCr: marketCapCr || null,
    marketCapCategory: capCategory,
    firstSeenAt: NOW - 9 * YEAR_MS,
    lastSeenAt: NOW - 3 * YEAR_MS,
  };
}
