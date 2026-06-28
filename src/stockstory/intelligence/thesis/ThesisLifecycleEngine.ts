/**
 * Thesis Lifecycle Engine
 *
 * Manages the research thesis lifecycle for a company — from thesis formation
 * through validation to conclusion. Each thesis is evidence-bound and versioned.
 *
 * No Buy/Sell language. Uses "high conviction", "watch", "needs review",
 * "avoid for now", "insufficient information".
 */

import type { IntelligenceInput } from '../../types';
import type { CompanyIntelligenceProfile } from '../company/CompanyTypes';
import { clampScore } from '../../scoring';

export type ThesisState = 'forming' | 'validating' | 'confirmed' | 'weakening' | 'invalidated' | 'no_thesis';

export interface ResearchThesis {
  thesisId: string;
  symbol: string;
  exchange: string;
  state: ThesisState;
  version: number;
  createdAt: string;
  updatedAt: string;

  /** Core thesis statement (1-2 sentences) */
  statement: string;

  /** Bull case (high conviction points) */
  bullCase: ThesisPoint[];

  /** Bear case (needs review points) */
  bearCase: ThesisPoint[];

  /** Key assumptions that underpin the thesis */
  assumptions: ThesisAssumption[];

  /** Catalysts that could strengthen/weaken the thesis */
  thesisCatalysts: ThesisCatalyst[];

  /** Overall conviction level */
  conviction: 'high_conviction' | 'watch' | 'needs_review' | 'avoid_for_now' | 'insufficient_information';

  /** Evidence score (0-100) */
  evidenceScore: number;

  /** History of thesis state changes */
  history: ThesisStateChange[];
}

export interface ThesisPoint {
  title: string;
  description: string;
  evidence: string[];
  confidence: number; // 0-1
}

export interface ThesisAssumption {
  assumption: string;
  status: 'validated' | 'pending' | 'under_pressure' | 'broken';
  lastChecked: string;
}

export interface ThesisCatalyst {
  catalyst: string;
  expectedImpact: 'positive' | 'negative' | 'unknown';
  probability: number; // 0-1
  timeframe: string;
}

export interface ThesisStateChange {
  from: ThesisState;
  to: ThesisState;
  changedAt: string;
  reason: string;
}

export class ThesisLifecycleEngine {
  /**
   * Build a thesis from a company profile — this is the thesis formation step.
   */
  build(profile: CompanyIntelligenceProfile, input: IntelligenceInput): ResearchThesis {
    const now = new Date().toISOString();
    const state = this.determineState(profile);

    const bullCase = this.buildBullCase(profile);
    const bearCase = this.buildBearCase(profile);
    const assumptions = this.buildAssumptions(profile);
    const catalysts = this.buildCatalysts(profile, input);
    const conviction = this.determineConviction(state, bullCase, bearCase);
    const evidenceScore = this.computeEvidenceScore(profile);

    return {
      thesisId: `thesis_${profile.symbol}_${now.slice(0, 10)}`,
      symbol: profile.symbol,
      exchange: profile.exchange,
      state,
      version: 1,
      createdAt: now,
      updatedAt: now,
      statement: this.buildStatement(profile, bullCase, bearCase),
      bullCase,
      bearCase,
      assumptions,
      thesisCatalysts: catalysts,
      conviction,
      evidenceScore,
      history: [{
        from: 'no_thesis',
        to: state,
        changedAt: now,
        reason: 'Initial thesis formation from available data.',
      }],
    };
  }

  /**
   * Re-evaluate an existing thesis with new data.
   */
  reEvaluate(
    existing: ResearchThesis,
    profile: CompanyIntelligenceProfile,
    changeReason: string,
  ): ResearchThesis {
    const now = new Date().toISOString();
    const newState = this.determineState(profile);
    const stateChanged = newState !== existing.state;

    const bullCase = this.buildBullCase(profile);
    const bearCase = this.buildBearCase(profile);
    const conviction = this.determineConviction(newState, bullCase, bearCase);

    const history = [...existing.history];
    if (stateChanged) {
      history.push({
        from: existing.state,
        to: newState,
        changedAt: now,
        reason: changeReason,
      });
    }

    return {
      ...existing,
      state: newState,
      version: existing.version + 1,
      updatedAt: now,
      statement: this.buildStatement(profile, bullCase, bearCase),
      bullCase,
      bearCase,
      assumptions: this.buildAssumptions(profile),
      thesisCatalysts: this.buildCatalystsFromProfile(profile),
      conviction,
      history,
      evidenceScore: this.computeEvidenceScore(profile),
    };
  }

  // ── State determination ─────────────────────────────────────

  private determineState(profile: CompanyIntelligenceProfile): ThesisState {
    const { overall, confidence } = profile.aggregate;
    const signals = profile.signals;

    if (signals.length === 0) return 'no_thesis';
    if (confidence < 0.3) return 'no_thesis';
    if (overall >= 70) return 'confirmed';
    if (overall >= 55) return 'validating';
    if (overall >= 35) return 'forming';
    return 'weakening';
  }

  // ── Bull/bear case construction ─────────────────────────────

  private buildBullCase(profile: CompanyIntelligenceProfile): ThesisPoint[] {
    const points: ThesisPoint[] = [];
    const { fundamentals, growth, quality, moat } = profile;

    if (fundamentals.roe !== null && fundamentals.roe > 12) {
      points.push({
        title: 'Strong Capital Efficiency',
        description: `ROE of ${fundamentals.roe}% indicates effective use of shareholder capital.`,
        evidence: ['roe'],
        confidence: 0.8,
      });
    }

    if (growth.revenueCAGR !== null && growth.revenueCAGR > 10) {
      points.push({
        title: 'Above-Average Growth',
        description: `Revenue CAGR of ${growth.revenueCAGR}% shows expanding business.`,
        evidence: ['revenueGrowth3y'],
        confidence: 0.7,
      });
    }

    if (quality.qualityScore >= 65) {
      points.push({
        title: 'High Quality Business',
        description: `Quality score of ${quality.qualityScore}/100 with earnings quality ${quality.earningsQuality}/100.`,
        evidence: ['qualityScore', 'earningsQuality'],
        confidence: 0.75,
      });
    }

    if (moat.moatWidth === 'wide') {
      points.push({
        title: 'Wide Economic Moat',
        description: 'Sustainable competitive advantage indicated by high ROIC and margins.',
        evidence: ['roic', 'operatingMargin'],
        confidence: 0.65,
      });
    }

    if (quality.redFlags.length === 0 && quality.governanceScore !== null && quality.governanceScore > 60) {
      points.push({
        title: 'Clean Governance',
        description: `Governance score ${quality.governanceScore}/100 with no red flags.`,
        evidence: ['governanceScore'],
        confidence: 0.7,
      });
    }

    return points.slice(0, 4);
  }

  private buildBearCase(profile: CompanyIntelligenceProfile): ThesisPoint[] {
    const points: ThesisPoint[] = [];
    const { fundamentals, growth, quality } = profile;

    if (fundamentals.debtToEquity !== null && fundamentals.debtToEquity > 1.0) {
      points.push({
        title: 'Balance Sheet Leverage',
        description: `Debt-to-equity of ${fundamentals.debtToEquity}x increases financial risk.`,
        evidence: ['debtToEquity', 'interestCoverage'],
        confidence: 0.7,
      });
    }

    if (growth.trajectory === 'decelerating') {
      points.push({
        title: 'Growth Deceleration',
        description: `Revenue growth is decelerating from prior periods.`,
        evidence: ['revenueCAGR'],
        confidence: 0.6,
      });
    }

    if (quality.redFlags.length > 0) {
      points.push({
        title: 'Governance Red Flags',
        description: `${quality.redFlags.length} red flag(s): ${quality.redFlags.join(', ')}.`,
        evidence: ['redFlags'],
        confidence: 0.8,
      });
    }

    if (fundamentals.peRatio !== null && fundamentals.peRatio > 30) {
      points.push({
        title: 'Elevated Valuation',
        description: `PE ratio of ${fundamentals.peRatio}x may price in optimistic expectations.`,
        evidence: ['peRatio'],
        confidence: 0.5,
      });
    }

    if (fundamentals.operatingMargin !== null && fundamentals.operatingMargin < 10) {
      points.push({
        title: 'Thin Margins',
        description: `Operating margin of ${fundamentals.operatingMargin}% provides limited buffer.`,
        evidence: ['operatingMargin'],
        confidence: 0.6,
      });
    }

    return points.slice(0, 4);
  }

  // ── Assumptions ─────────────────────────────────────────────

  private buildAssumptions(profile: CompanyIntelligenceProfile): ThesisAssumption[] {
    const now = new Date().toISOString().slice(0, 10);
    return [
      {
        assumption: 'Revenue growth trajectory continues at current pace',
        status: profile.growth.revenueCAGR !== null && profile.growth.revenueCAGR > 5 ? 'validated' : 'pending',
        lastChecked: now,
      },
      {
        assumption: 'Operating margins remain stable or expand',
        status: profile.fundamentals.operatingMargin !== null && profile.fundamentals.operatingMargin > 15 ? 'validated' : 'pending',
        lastChecked: now,
      },
      {
        assumption: 'Management maintains capital allocation discipline',
        status: profile.quality.qualityScore > 50 ? 'validated' : 'pending',
        lastChecked: now,
      },
      {
        assumption: 'No adverse regulatory changes in the near term',
        status: 'pending',
        lastChecked: now,
      },
    ];
  }

  // ── Catalysts ───────────────────────────────────────────────

  private buildCatalysts(profile: CompanyIntelligenceProfile, input: IntelligenceInput): ThesisCatalyst[] {
    const catalysts: ThesisCatalyst[] = [];

    if (input.earnings.nextEarningsDate) {
      catalysts.push({
        catalyst: `Next earnings: ${input.earnings.nextEarningsDate}`,
        expectedImpact: 'unknown',
        probability: 0.5,
        timeframe: input.earnings.nextEarningsDate,
      });
    }

    return catalysts;
  }

  private buildCatalystsFromProfile(profile: CompanyIntelligenceProfile): ThesisCatalyst[] {
    return [];
  }

  // ── Conviction ──────────────────────────────────────────────

  private determineConviction(
    state: ThesisState,
    bullCase: ThesisPoint[],
    bearCase: ThesisPoint[],
  ): ResearchThesis['conviction'] {
    if (state === 'no_thesis') return 'insufficient_information';
    if (state === 'confirmed' && bullCase.length >= 3) return 'high_conviction';
    if (state === 'confirmed') return 'watch';
    if (state === 'validating') return 'watch';
    if (state === 'forming') return 'needs_review';
    if (state === 'weakening' || state === 'invalidated') return 'avoid_for_now';
    return 'insufficient_information';
  }

  // ── Statement ───────────────────────────────────────────────

  private buildStatement(
    profile: CompanyIntelligenceProfile,
    bull: ThesisPoint[],
    bear: ThesisPoint[],
  ): string {
    if (bear.length === 0 && bull.length > 0) {
      return `${profile.symbol} presents a constructive research thesis supported by ${bull.length} positive factors.`;
    }
    if (bull.length === 0) {
      return `${profile.symbol} has insufficient positive evidence to form a research thesis at this time.`;
    }
    return `${profile.symbol} has a balanced research profile — ${bull.length} supporting factors and ${bear.length} concerns.`;
  }

  // ── Evidence score ──────────────────────────────────────────

  private computeEvidenceScore(profile: CompanyIntelligenceProfile): number {
    const { confidence, dataCompleteness } = profile.aggregate;
    return clampScore(Math.round((confidence + dataCompleteness) * 50));
  }
}

export const thesisLifecycleEngine = new ThesisLifecycleEngine();
