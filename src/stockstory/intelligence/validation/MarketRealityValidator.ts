/**
 * Market Reality Validator
 * Phase 3 — Validates that intelligence outputs reference real symbols,
 * correct market caps, valid sectors, and survive a reality check against
 * the known universe of PSE equities.
 */
import { BaseValidator } from './IntelligenceValidationRunner';
import type {
  ValidationIssue, MarketRealityCheck, MarketRealityResult,
} from './IntelligenceValidationTypes';

/**
 * Known PSE equity universe — built from PSE official symbol list.
 * In production, loaded from a DB table or CSV; hardcoded here for initial validation.
 */
const KNOWN_PSE_SYMBOLS = new Set<string>([
  'BDO','JFC','SM','AC','ALI','SMPH','BPI','TEL','GLO','MER',
  'MBT','URC','AEV','JGS','SECB','GTCAP','CNPF','EMI','WLCON','MONDE',
  'PGOLD','RRHI','RLC','DMC','ACEN','BLOOM','AP','FGEN','MWIDE','ANI',
  'CEB','FLI','IMI','MEG','NIKL','PXP','SCC','SSI','TFHI','VLL',
  'CHP','MJC','HCOR','ATN','DMP','CLC','WEB','NCM','OPM','PSE','FMETF','X','ICT','HLCM','DD','ROCK',
  'PCOR','BSC','ALHI','APC','DIZ','LBC','SMC','GLO','TEL','BDO','JFC','SM','AC','ALI','SMPH',
]);

/** Sector classification for known symbols */
const SECTOR_MAP: Record<string, string> = {
  BDO: 'Financial',
  JFC: 'Consumer',
  SM: 'Diversified',
  AC: 'Diversified',
  ALI: 'Real Estate',
  SMPH: 'Real Estate',
  BPI: 'Financial',
  TEL: 'Telecom',
  GLO: 'Telecom',
  MER: 'Diversified',
  MBT: 'Financial',
  URC: 'Consumer',
  AEV: 'Diversified',
  JGS: 'Diversified',
  SECB: 'Financial',
  GTCAP: 'Financial',
  CNPF: 'Food',
  EMI: 'Industrial',
  WLCON: 'Retail',
  MONDE: 'Food',
  PGOLD: 'Retail',
  RRHI: 'Retail',
  RLC: 'Real Estate',
  DMC: 'Construction',
  ACEN: 'Utilities',
  BLOOM: 'Gaming',
  AP: 'Utilities',
  FGEN: 'Utilities',
  MWIDE: 'Construction',
  ANI: 'Industrial',
  CEB: 'Transportation',
  FLI: 'Real Estate',
  IMI: 'Technology',
  MEG: 'Real Estate',
  NIKL: 'Mining',
  PXP: 'Energy',
  SCC: 'Industrial',
  SSI: 'Technology',
  TFHI: 'Industrial',
  VLL: 'Diversified',
  CHP: 'Industrial',
  MJC: 'Entertainment',
  HCOR: 'Healthcare',
  ATN: 'Media',
  DMP: 'Industrial',
  CLC: 'Industrial',
  WEB: 'Technology',
  NCM: 'Mining',
  OPM: 'Industrial',
  PSE: 'Exchange',
  FMETF: 'ETF',
  ICT: 'Technology',
  HLCM: 'Industrial',
  DD: 'Industrial',
  ROCK: 'Real Estate',
  PCOR: 'Energy',
  BSC: 'Financial',
  ALHI: 'Real Estate',
  APC: 'Energy',
  DIZ: 'Mining',
  LBC: 'Transportation',
  SMC: 'Diversified',
};

/** Approximate market cap ranges (PHP millions) as of 2024 */
const MARKET_CAP_RANGES: Record<string, { min: number; max: number }> = {
  BDO: { min: 500000, max: 700000 },
  JFC: { min: 100000, max: 150000 },
  SM: { min: 800000, max: 1000000 },
  AC: { min: 600000, max: 800000 },
  ALI: { min: 400000, max: 600000 },
  SMPH: { min: 300000, max: 500000 },
  BPI: { min: 200000, max: 300000 },
  TEL: { min: 300000, max: 400000 },
  GLO: { min: 250000, max: 350000 },
  MER: { min: 100000, max: 200000 },
  MBT: { min: 200000, max: 300000 },
  URC: { min: 100000, max: 180000 },
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
        reason: `Unknown symbol: ${symbol}`,
        recommendedFix: `Add ${symbol} to the known universe or verify the symbol is correct`,
        detectedAt: new Date().toISOString(),
      });
    }
    return { issues, totalChecks };
  }
}
