/**
 * Market Reality Validator
 * Phase 3 — Validates that intelligence outputs reference real symbols,
 * correct market caps, valid sectors, and survive a reality check against
 * the known universe of Philippine equities.
 */
import { BaseValidator } from './IntelligenceValidationRunner';
import type {
  ValidationIssue, MarketRealityCheck, MarketRealityResult,
} from './IntelligenceValidationTypes';

/**
 * Known PSE equity universe — built from PSE/PSE master list.
 * In production, loaded from a DB table or CSV; hardcoded here for initial validation.
 */
const KNOWN_PSE_SYMBOLS = new Set<string>([
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
  'ITC', 'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'BAJFINANCE',
  'AXISBANK', 'WIPRO', 'ASIANPAINT', 'MARUTI', 'SUNPHARMA',
  'TITAN', 'ULTRACEMCO', 'NESTLEIND', 'NTPC', 'ONGC', 'POWERGRID',
  'ADANIENT', 'ADANIPORTS', 'JSWSTEEL', 'TATASTEEL', 'TECHM',
  'HCLTECH', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'APOLLOHOSP',
  'EICHERMOT', 'BAJAJFINSV', 'INDUSINDBK', 'BRITANNIA',
  'HEROMOTOCO', 'GRASIM', 'COALINDIA', 'HINDALCO', 'TATAMOTORS',
  'BAJAJ-AUTO', 'BEL', 'TRENT', 'DMART', 'IRFC', 'HAL',
  'VBL', 'ZOMATO', 'ADANIGREEN', 'ADANIPOWER', 'M&M',
  'SIEMENS', 'PIDILITIND', 'ABBOTINDIA', 'BERGEPAINT',
  'HAVELLS', 'DABUR', 'MARICO', 'GODREJCP', 'TATACONSUM',
  'COLPAL', 'PAGEIND', 'SRF', 'PIDILITIND', 'SHREECEM',
]);

/** Sector classification for known symbols */
const SECTOR_MAP: Record<string, string> = {
  RELIANCE: 'Oil & Gas',
  TCS: 'IT Services',
  HDFCBANK: 'Banking',
  INFY: 'IT Services',
  ICICIBANK: 'Banking',
  HINDUNILVR: 'FMCG',
  ITC: 'FMCG',
  SBIN: 'Banking',
  BHARTIARTL: 'Telecom',
  KOTAKBANK: 'Banking',
  LT: 'Infrastructure',
  BAJFINANCE: 'Financial Services',
  AXISBANK: 'Banking',
  WIPRO: 'IT Services',
  ASIANPAINT: 'Paints',
  MARUTI: 'Automobile',
  SUNPHARMA: 'Pharmaceuticals',
  TITAN: 'Consumer Durables',
  ULTRACEMCO: 'Cement',
  NESTLEIND: 'FMCG',
  NTPC: 'Power',
  ONGC: 'Oil & Gas',
  POWERGRID: 'Power',
  ADANIENT: 'Diversified',
  ADANIPORTS: 'Infrastructure',
  JSWSTEEL: 'Steel',
  TATASTEEL: 'Steel',
  TECHM: 'IT Services',
  HCLTECH: 'IT Services',
  DIVISLAB: 'Pharmaceuticals',
  DRREDDY: 'Pharmaceuticals',
  CIPLA: 'Pharmaceuticals',
  APOLLOHOSP: 'Healthcare',
  EICHERMOT: 'Automobile',
  BAJAJFINSV: 'Financial Services',
  INDUSINDBK: 'Banking',
  BRITANNIA: 'FMCG',
  HEROMOTOCO: 'Automobile',
  GRASIM: 'Cement',
  COALINDIA: 'Mining',
  HINDALCO: 'Metals',
  TATAMOTORS: 'Automobile',
  BAJAJ_AUTO: 'Automobile',
  BEL: 'Defence',
  TRENT: 'Retail',
  DMART: 'Retail',
  IRFC: 'Financial Services',
  HAL: 'Defence',
  VBL: 'FMCG',
  ZOMATO: 'Internet',
  ADANIGREEN: 'Power',
  ADANIPOWER: 'Power',
  M_M: 'Automobile',
  SIEMENS: 'Capital Goods',
  PIDILITIND: 'Chemicals',
  ABBOTINDIA: 'Pharmaceuticals',
  BERGEPAINT: 'Paints',
  HAVELLS: 'Consumer Durables',
  DABUR: 'FMCG',
  MARICO: 'FMCG',
  GODREJCP: 'FMCG',
  TATACONSUM: 'FMCG',
  COLPAL: 'FMCG',
  PAGEIND: 'Textiles',
  SRF: 'Chemicals',
  SHREECEM: 'Cement',
};

/** Approximate market cap ranges (INR crores) as of 2024 */
const MARKET_CAP_RANGES: Record<string, { min: number; max: number }> = {
  RELIANCE: { min: 1800000, max: 2200000 },
  TCS: { min: 1400000, max: 1700000 },
  HDFCBANK: { min: 1100000, max: 1400000 },
  INFY: { min: 700000, max: 850000 },
  ICICIBANK: { min: 700000, max: 850000 },
  HINDUNILVR: { min: 550000, max: 700000 },
  ITC: { min: 500000, max: 650000 },
  SBIN: { min: 500000, max: 650000 },
  BHARTIARTL: { min: 600000, max: 750000 },
  KOTAKBANK: { min: 350000, max: 450000 },
};

export class MarketRealityValidator extends BaseValidator {
  readonly id = 'market-reality';
  readonly name = 'Market Reality Validator';

  private knownSymbols: Set<string>;
  private sectorMap: Record<string, string>;
  private marketCapRanges: Record<string, { min: number; max: number }>;

  constructor(
    symbols?: Set<string>,
    sectors?: Record<string, string>,
    caps?: Record<string, { min: number; max: number }>,
  ) {
    super();
    this.knownSymbols = symbols ?? KNOWN_PSE_SYMBOLS;
    this.sectorMap = sectors ?? SECTOR_MAP;
    this.marketCapRanges = caps ?? MARKET_CAP_RANGES;
  }

  protected async runChecks(
    symbol: string,
    data: unknown,
  ): Promise<{ issues: ValidationIssue[]; totalChecks: number }> {
    const issues: ValidationIssue[] = [];
    const payload = data as Record<string, unknown> || {};
    let totalChecks = 0;

    // Check 1: Symbol exists in known universe
    totalChecks++;
    if (!this.knownSymbols.has(symbol)) {
      issues.push({
        id: `mr-unknown-${symbol}`,
        severity: 'error',
        module: this.id,
        symbol,
        reason: `Symbol "${symbol}" not found in known PSE universe`,
        recommendedFix: 'Verify symbol against PSE master list; remove if fake or add if newly listed',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check 2: Sector classification matches known map
    totalChecks++;
    const claimedSector = payload.sector as string | undefined;
    const knownSector = this.sectorMap[symbol];
    if (claimedSector && knownSector && claimedSector !== knownSector) {
      issues.push({
        id: `mr-sector-${symbol}`,
        severity: 'warning',
        module: this.id,
        symbol,
        reason: `Sector mismatch: claimed "${claimedSector}", known "${knownSector}"`,
        recommendedFix: `Use known sector classification "${knownSector}" or update sector map`,
        detectedAt: new Date().toISOString(),
      });
    }

    // Check 3: Market cap is plausible
    totalChecks++;
    const claimedCap = payload.marketCap as number | undefined;
    const knownCap = this.marketCapRanges[symbol];
    if (claimedCap != null && knownCap) {
      if (claimedCap < knownCap.min * 0.7 || claimedCap > knownCap.max * 1.3) {
        issues.push({
          id: `mr-cap-${symbol}`,
          severity: 'warning',
          module: this.id,
          symbol,
          reason: `Market cap outlier: claimed ₹${claimedCap}cr, expected range ₹${knownCap.min}cr–₹${knownCap.max}cr`,
          recommendedFix: 'Verify market cap from latest exchange data or allow if legitimately changed',
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Check 4: Company name/ISIN fields present if available
    totalChecks++;
    const companyName = payload.companyName as string | undefined;
    const isin = payload.isin as string | undefined;
    if (!companyName && !isin) {
      issues.push({
        id: `mr-identity-${symbol}`,
        severity: 'info',
        module: this.id,
        symbol,
        reason: 'No companyName or ISIN provided for symbol',
        recommendedFix: 'Include company name for human readability',
        detectedAt: new Date().toISOString(),
      });
    }

    return { issues, totalChecks };
  }

  /**
   * Build a MarketRealityResult for async reporting.
   */
  buildResult(symbol: string, checks: MarketRealityCheck[]): MarketRealityResult {
    const symbolExists = !checks.some(c => c.field === 'symbol-exists' && !c.passed);
    const marketCapValid = !checks.some(c => c.field === 'market-cap' && !c.passed);
    const sectorValid = !checks.some(c => c.field === 'sector' && !c.passed);
    const allPassed = checks.every(c => c.passed);

    return {
      symbol,
      symbolExists,
      marketCapValid,
      sectorValid,
      checks,
      status: allPassed ? 'pass' : 'fail',
    };
  }
}
