/**
 * SectorAdapter — provides sector-specific threshold profiles for scoring engines.
 *
 * Maps sector names to their financial threshold profiles for:
 * - ROE tiers (exceptional, high, fair, low)
 * - Gross margin tiers (premium, high, fair, low)
 * - Operating margin tiers (premium, high, fair, low)
 * - PE tiers (cheap, fair, expensive, extreme)
 * - PB tiers (cheap, fair, expensive, extreme)
 * - EV/EBITDA tiers (cheap, fair, expensive, extreme)
 * - Debt-to-Equity tiers (low, moderate, elevated, extreme)
 * - Current ratio tiers (healthy, adequate, tight)
 */

export interface SectorProfile {
  name: string;
  roeExceptional: number;
  roeHigh: number;
  roeFair: number;
  roeLow: number;
  useGrossMargin: boolean;
  gmPremium: number;
  gmHigh: number;
  gmFair: number;
  gmLow: number;
  omPremium: number;
  omHigh: number;
  omFair: number;
  omLow: number;
  primaryMetric: 'pe' | 'pb' | 'evEbitda';
  peCheap: number;
  peFair: number;
  peExpensive: number;
  peExtreme: number;
  pbCheap: number;
  pbFair: number;
  pbExpensive: number;
  pbExtreme: number;
  skipEvEbitda: boolean;
  evCheap: number;
  evFair: number;
  evExpensive: number;
  evExtreme: number;
  deLow: number;
  deModerate: number;
  deElevated: number;
  deExtreme: number;
  crHealthy: number;
  crAdequate: number;
  crTight: number;
}

const GENERAL_PROFILE: SectorProfile = {
  name: 'General',
  roeExceptional: 0.20,
  roeHigh: 0.15,
  roeFair: 0.10,
  roeLow: 0.05,
  useGrossMargin: true,
  gmPremium: 0.60,
  gmHigh: 0.40,
  gmFair: 0.25,
  gmLow: 0.15,
  omPremium: 0.25,
  omHigh: 0.18,
  omFair: 0.12,
  omLow: 0.06,
  primaryMetric: 'pe',
  peCheap: 12,
  peFair: 18,
  peExpensive: 25,
  peExtreme: 40,
  pbCheap: 1.5,
  pbFair: 3.0,
  pbExpensive: 5.0,
  pbExtreme: 8.0,
  skipEvEbitda: false,
  evCheap: 8,
  evFair: 14,
  evExpensive: 20,
  evExtreme: 30,
  deLow: 0.3,
  deModerate: 0.8,
  deElevated: 1.5,
  deExtreme: 3.0,
  crHealthy: 2.0,
  crAdequate: 1.5,
  crTight: 1.0,
};

const FINANCIAL_SECTOR: SectorProfile = {
  ...GENERAL_PROFILE,
  name: 'Financials',
  roeExceptional: 0.15,
  roeHigh: 0.12,
  roeFair: 0.08,
  roeLow: 0.04,
  primaryMetric: 'pb',
  useGrossMargin: false,
  peCheap: 8,
  peFair: 14,
  peExpensive: 20,
  peExtreme: 30,
  pbCheap: 0.8,
  pbFair: 1.5,
  pbExpensive: 2.5,
  pbExtreme: 4.0,
  skipEvEbitda: true,
  deLow: 2.0,
  deModerate: 5.0,
  deElevated: 8.0,
  deExtreme: 12.0,
};

const TECHNOLOGY_SECTOR: SectorProfile = {
  ...GENERAL_PROFILE,
  name: 'Technology',
  roeExceptional: 0.22,
  roeHigh: 0.16,
  roeFair: 0.10,
  roeLow: 0.04,
  useGrossMargin: true,
  gmPremium: 0.70,
  gmHigh: 0.55,
  gmFair: 0.35,
  gmLow: 0.20,
  omPremium: 0.30,
  omHigh: 0.22,
  omFair: 0.15,
  omLow: 0.08,
  primaryMetric: 'pe',
  peCheap: 15,
  peFair: 25,
  peExpensive: 35,
  peExtreme: 60,
  deLow: 0.2,
  deModerate: 0.5,
  deElevated: 1.0,
  deExtreme: 2.0,
};

const SECTOR_PROFILES: Record<string, SectorProfile> = {
  general: GENERAL_PROFILE,
  financials: FINANCIAL_SECTOR,
  financial: FINANCIAL_SECTOR,
  banking: FINANCIAL_SECTOR,
  banks: FINANCIAL_SECTOR,
  nbfc: FINANCIAL_SECTOR,
  insurance: FINANCIAL_SECTOR,
  technology: TECHNOLOGY_SECTOR,
  tech: TECHNOLOGY_SECTOR,
  it: TECHNOLOGY_SECTOR,
  software: TECHNOLOGY_SECTOR,
};

/**
 * Get the sector profile for a given sector name.
 * Falls back to General if no specific profile exists.
 */
export function getSectorProfile(sectorName: string): SectorProfile {
  const key = sectorName.toLowerCase().trim();
  return SECTOR_PROFILES[key] ?? GENERAL_PROFILE;
}

export default { getSectorProfile };
