/**
 * Sector Adapter
 * 
 * Provides sector-specific thresholds for valuation, margins, and stability
 * to eliminate sector bias in scoring.
 * 
 * Banks, insurers, tech, FMCG, pharma, and utilities each get custom profiles.
 * Unrecognised sectors fall back to "General" profile.
 */

export type SectorProfile = {
  name: string;
  // Valuation: PE thresholds (cheap, fair, expensive, extreme)
  peCheap: number;
  peFair: number;
  peExpensive: number;
  peExtreme: number;
  // Valuation: PB thresholds
  pbCheap: number;
  pbFair: number;
  pbExpensive: number;
  pbExtreme: number;
  // Valuation: EV/EBITDA thresholds
  evCheap: number;
  evFair: number;
  evExpensive: number;
  evExtreme: number;
  // Skip EV/EBITDA entirely (for financials where it doesn't apply)
  skipEvEbitda: boolean;
  // Quality: margin thresholds
  gmLow: number;
  gmFair: number;
  gmHigh: number;
  gmPremium: number;
  omLow: number;
  omFair: number;
  omHigh: number;
  omPremium: number;
  // Stability: D/E thresholds
  deLow: number;
  deModerate: number;
  deElevated: number;
  deExtreme: number;
  // Stability: current ratio thresholds
  crTight: number;
  crAdequate: number;
  crHealthy: number;
  // Quality: ROE thresholds
  roeLow: number;
  roeFair: number;
  roeHigh: number;
  roeExceptional: number;
  // Primary valuation metric (for weighting)
  primaryMetric: 'pe' | 'pb' | 'evEbitda';
  // Whether to use gross margin in quality scoring
  useGrossMargin: boolean;
};

const PROFILES: Record<string, SectorProfile> = {
  Banking: {
    name: 'Banking',
    peCheap: 8, peFair: 14, peExpensive: 20, peExtreme: 30,
    pbCheap: 0.8, pbFair: 1.5, pbExpensive: 2.5, pbExtreme: 4.0,
    evCheap: 0, evFair: 0, evExpensive: 0, evExtreme: 0,
    skipEvEbitda: true,
    gmLow: 0, gmFair: 0, gmHigh: 0, gmPremium: 0,
    omLow: 0.15, omFair: 0.25, omHigh: 0.35, omPremium: 0.45,
    deLow: 5.0, deModerate: 8.0, deElevated: 12.0, deExtreme: 15.0,
    crTight: 0.8, crAdequate: 1.0, crHealthy: 1.2,
    roeLow: 0.05, roeFair: 0.10, roeHigh: 0.15, roeExceptional: 0.18,
    primaryMetric: 'pb',
    useGrossMargin: false,
  },
  Insurance: {
    name: 'Insurance',
    peCheap: 8, peFair: 15, peExpensive: 22, peExtreme: 30,
    pbCheap: 1.0, pbFair: 2.0, pbExpensive: 3.5, pbExtreme: 5.0,
    evCheap: 0, evFair: 0, evExpensive: 0, evExtreme: 0,
    skipEvEbitda: true,
    gmLow: 0, gmFair: 0, gmHigh: 0, gmPremium: 0,
    omLow: 0.05, omFair: 0.10, omHigh: 0.15, omPremium: 0.20,
    deLow: 3.0, deModerate: 5.0, deElevated: 7.0, deExtreme: 10.0,
    crTight: 0.8, crAdequate: 1.0, crHealthy: 1.2,
    roeLow: 0.05, roeFair: 0.10, roeHigh: 0.15, roeExceptional: 0.18,
    primaryMetric: 'pb',
    useGrossMargin: false,
  },
  Technology: {
    name: 'Technology',
    peCheap: 15, peFair: 25, peExpensive: 35, peExtreme: 50,
    pbCheap: 2.0, pbFair: 4.0, pbExpensive: 7.0, pbExtreme: 10.0,
    evCheap: 10, evFair: 18, evExpensive: 25, evExtreme: 35,
    skipEvEbitda: false,
    gmLow: 0.40, gmFair: 0.55, gmHigh: 0.70, gmPremium: 0.80,
    omLow: 0.10, omFair: 0.20, omHigh: 0.28, omPremium: 0.35,
    deLow: 0.3, deModerate: 0.6, deElevated: 1.0, deExtreme: 1.5,
    crTight: 1.0, crAdequate: 1.5, crHealthy: 2.5,
    roeLow: 0.10, roeFair: 0.18, roeHigh: 0.25, roeExceptional: 0.35,
    primaryMetric: 'pe',
    useGrossMargin: true,
  },
  FMCG: {
    name: 'FMCG',
    peCheap: 20, peFair: 35, peExpensive: 50, peExtreme: 65,
    pbCheap: 3.0, pbFair: 6.0, pbExpensive: 10.0, pbExtreme: 15.0,
    evCheap: 12, evFair: 20, evExpensive: 28, evExtreme: 38,
    skipEvEbitda: false,
    gmLow: 0.30, gmFair: 0.45, gmHigh: 0.55, gmPremium: 0.65,
    omLow: 0.12, omFair: 0.18, omHigh: 0.25, omPremium: 0.30,
    deLow: 0.3, deModerate: 0.6, deElevated: 1.0, deExtreme: 1.5,
    crTight: 1.0, crAdequate: 1.5, crHealthy: 2.0,
    roeLow: 0.15, roeFair: 0.25, roeHigh: 0.35, roeExceptional: 0.45,
    primaryMetric: 'pe',
    useGrossMargin: true,
  },
  Pharma: {
    name: 'Pharma',
    peCheap: 12, peFair: 22, peExpensive: 32, peExtreme: 45,
    pbCheap: 1.5, pbFair: 3.0, pbExpensive: 5.0, pbExtreme: 8.0,
    evCheap: 8, evFair: 16, evExpensive: 24, evExtreme: 32,
    skipEvEbitda: false,
    gmLow: 0.40, gmFair: 0.55, gmHigh: 0.68, gmPremium: 0.78,
    omLow: 0.12, omFair: 0.20, omHigh: 0.25, omPremium: 0.30,
    deLow: 0.3, deModerate: 0.6, deElevated: 1.0, deExtreme: 1.5,
    crTight: 1.0, crAdequate: 1.5, crHealthy: 2.0,
    roeLow: 0.08, roeFair: 0.15, roeHigh: 0.22, roeExceptional: 0.30,
    primaryMetric: 'pe',
    useGrossMargin: true,
  },
  Utilities: {
    name: 'Utilities',
    peCheap: 8, peFair: 15, peExpensive: 22, peExtreme: 30,
    pbCheap: 0.8, pbFair: 1.5, pbExpensive: 2.5, pbExtreme: 4.0,
    evCheap: 6, evFair: 12, evExpensive: 18, evExtreme: 25,
    skipEvEbitda: false,
    gmLow: 0.20, gmFair: 0.35, gmHigh: 0.45, gmPremium: 0.55,
    omLow: 0.10, omFair: 0.18, omHigh: 0.25, omPremium: 0.30,
    deLow: 1.0, deModerate: 2.0, deElevated: 3.0, deExtreme: 5.0,
    crTight: 0.8, crAdequate: 1.0, crHealthy: 1.5,
    roeLow: 0.05, roeFair: 0.10, roeHigh: 0.14, roeExceptional: 0.18,
    primaryMetric: 'evEbitda',
    useGrossMargin: true,
  },
};

const GENERAL_PROFILE: SectorProfile = {
  name: 'General',
  peCheap: 10, peFair: 20, peExpensive: 30, peExtreme: 50,
  pbCheap: 1.0, pbFair: 2.5, pbExpensive: 4.5, pbExtreme: 7.0,
  evCheap: 7, evFair: 14, evExpensive: 22, evExtreme: 30,
  skipEvEbitda: false,
  gmLow: 0.15, gmFair: 0.30, gmHigh: 0.45, gmPremium: 0.60,
  omLow: 0.08, omFair: 0.15, omHigh: 0.22, omPremium: 0.30,
  deLow: 0.4, deModerate: 0.8, deElevated: 1.5, deExtreme: 3.0,
  crTight: 1.0, crAdequate: 1.5, crHealthy: 2.5,
  roeLow: 0.10, roeFair: 0.18, roeHigh: 0.25, roeExceptional: 0.35,
  primaryMetric: 'pe',
  useGrossMargin: true,
};

/**
 * Memoization cache for sector profile lookups.
 */
const profileCache = new Map<string, SectorProfile>();

/**
 * Get sector profile for a given sector name.
 * Falls back to General profile for unrecognised sectors.
 */
export function getSectorProfile(sectorName: string): SectorProfile {
  const key = sectorName.toLowerCase().trim();
  if (profileCache.has(key)) return profileCache.get(key)!;

  // Try exact match, then case-insensitive
  for (const [name, profile] of Object.entries(PROFILES)) {
    if (name.toLowerCase() === key) {
      profileCache.set(key, profile);
      return profile;
    }
  }

  // Partial match for common aliases
  const aliases: Record<string, string> = {
    'it': 'Technology',
    'information technology': 'Technology',
    'consumer': 'FMCG',
    'fmcg': 'FMCG',
    'pharmaceuticals': 'Pharma',
    'power': 'Utilities',
    'energy': 'Utilities',
    'bank': 'Banking',
    'financial': 'Banking',
    'nbfc': 'Banking',
  };

  const matched = aliases[key];
  if (matched && PROFILES[matched]) {
    profileCache.set(key, PROFILES[matched]);
    return PROFILES[matched];
  }

  // Try substring match
  for (const [name, profile] of Object.entries(PROFILES)) {
    if (key.includes(name.toLowerCase()) || name.toLowerCase().includes(key)) {
      profileCache.set(key, profile);
      return profile;
    }
  }

  profileCache.set(key, GENERAL_PROFILE);
  return GENERAL_PROFILE;
}

/**
 * List all known sector profiles.
 */
export function listSectorProfiles(): string[] {
  return Object.keys(PROFILES);
}

export default { getSectorProfile, listSectorProfiles, PROFILES };
