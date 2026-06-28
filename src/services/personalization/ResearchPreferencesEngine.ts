/**
 * Research Preferences Engine
 *
 * Uses the UserResearchProfile to personalize research output.
 * Focuses on filtering, sorting, and highlighting — never advice.
 * Compliance: No suitability claims, no personalized recommendations.
 */
import type {
  UserResearchProfile,
  SectorPreference,
  CompanyFactorScoresView,
  ScannerResultView,
  AlertChangeView,
  CompanyThesisView,
} from '../../research/contracts/productContracts';
import { getProfile } from './researchProfileStore';

export interface PrioritisedCompany {
  symbol: string;
  companyName: string;
  score: number | null;
  priority: 'high' | 'medium' | 'low';
  reasons: string[];
}

export class ResearchPreferencesEngine {
  private profile: UserResearchProfile;

  constructor(profile?: UserResearchProfile) {
    this.profile = profile ?? getProfile();
  }

  /**
   * Filter scanner results by user's sector preferences
   */
  filterBySectorPreference(results: ScannerResultView[]): ScannerResultView[] {
    const interestedSectors = this.profile.sectorPreferences
      .filter(s => s.interested)
      .map(s => s.sector);

    if (interestedSectors.length === 0) return results;

    return results.filter(r => {
      if (!r.sector) return false;
      return interestedSectors.includes(r.sector);
    });
  }

  /**
   * Sort companies by relevance to user's preferences
   */
  prioritiseCompanies(
    companies: ScannerResultView[],
  ): PrioritisedCompany[] {
    const interestedSectors = this.profile.sectorPreferences
      .filter(s => s.interested)
      .map(s => s.sector);

    return companies.map(c => {
      const reasons: string[] = [];
      let priority: 'high' | 'medium' | 'low' = 'low';

      if (c.sector && interestedSectors.includes(c.sector)) {
        reasons.push(`Matches your interest in ${c.sector}`);
        priority = 'high';
      }

      if (c.score !== null && c.score >= 75) {
        reasons.push('High research score');
        if (priority === 'low') priority = 'medium';
      }

      if (c.riskMarker === null || c.riskMarker === 'Low') {
        reasons.push('Within your risk comfort');
        if (priority === 'low') priority = 'medium';
      }

      if (this.profile.researchTopics.some(t =>
        c.keyReason.toLowerCase().includes(t.toLowerCase()) ||
        c.oneLineThesis.toLowerCase().includes(t.toLowerCase()),
      )) {
        reasons.push('Matches your research topics');
        if (priority !== 'high') priority = 'high';
      }

      return {
        symbol: c.symbol,
        companyName: c.companyName,
        score: c.score,
        priority,
        reasons,
      };
    }).sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  /**
   * Check if a company exceeds user's risk tolerance
   */
  isWithinRiskComfort(factorScores: CompanyFactorScoresView): boolean {
    const riskScore = factorScores.riskScore;
    if (riskScore === null) return true;

    switch (this.profile.maxRiskLevel) {
      case 'High': return true;
      case 'Moderate': return riskScore <= 60;
      case 'Low': return riskScore <= 40;
      default: return true;
    }
  }

  /**
   * Get a risk comfort flag for display
   */
  getRiskComfortFlag(factorScores: CompanyFactorScoresView): string | null {
    if (this.isWithinRiskComfort(factorScores)) return null;

    return 'This company exceeds your stated risk comfort level.';
  }

  /**
   * Generate a simple research greeting
   */
  getGreeting(): string {
    const name = this.profile.displayName || 'Researcher';
    if (this.profile.onboardingComplete) {
      return `Welcome back, ${name}.`;
    }
    return `Welcome, ${name}. Let's set up your research preferences.`;
  }

  /**
   * Get suggested sectors based on interests
   */
  getSuggestedSectors(allSectors: string[]): SectorPreference[] {
    const existing = new Set(
      this.profile.sectorPreferences.map(s => s.sector),
    );
    return allSectors
      .filter(s => !existing.has(s))
      .map(sector => ({ sector, interested: false }));
  }

  /**
   * Filter alerts that are relevant to user preferences
   */
  filterRelevantAlerts(
    alerts: AlertChangeView[],
    companyThesis?: Map<string, CompanyThesisView>,
  ): AlertChangeView[] {
    const interestedSectors = this.profile.sectorPreferences
      .filter(s => s.interested)
      .map(s => s.sector);

    if (interestedSectors.length === 0) return alerts;

    return alerts.filter(alert => {
      // Keep all thesis and risk alerts regardless
      if (alert.type === 'thesis_change' || alert.type === 'risk_change') {
        return true;
      }
      // For other alerts, check if sector matches
      const thesis = companyThesis?.get(alert.symbol);
      if (!thesis) return true; // keep if we can't determine
      return true; // conservative: keep all alerts, highlight sector-matching ones
    });
  }

  /**
   * Check if profile needs onboarding
   */
  get needsOnboarding(): boolean {
    return !this.profile.onboardingComplete;
  }

  /**
   * Get the active profile
   */
  get activeProfile(): UserResearchProfile {
    return this.profile;
  }

  /**
   * Refresh the profile from store
   */
  refresh(): void {
    this.profile = getProfile();
  }
}

export const researchPreferences = new ResearchPreferencesEngine();
