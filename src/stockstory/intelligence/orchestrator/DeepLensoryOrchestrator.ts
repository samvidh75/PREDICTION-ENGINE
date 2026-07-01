/**
 * Deep Lensory Orchestrator
 *
 * Extends the base LensoryOrchestrator with all 20 intelligence subsystems.
 * Runs the 9 base engines + 11 deep intelligence engines in parallel,
 * producing a comprehensive DeepStockIntelligenceReport.
 */

import type { IntelligenceInput, StockIntelligenceReport } from '../types';
import { clampScore, toScoreBand } from '../scoring';
import { orchestrator, LensoryOrchestrator } from './LensoryOrchestrator';

// Base engines
import { financialEngine } from '../engines/FinancialEngine';
import { technicalEngine } from '../engines/TechnicalEngine';
import { valuationEngine } from '../engines/ValuationEngine';
import { riskEngine } from '../engines/RiskEngine';
import { sectorEngine } from '../engines/SectorEngine';
import { newsEngine } from '../engines/NewsEngine';
import { earningsEngine } from '../engines/EarningsEngine';
import { eventEngine } from '../engines/EventEngine';

// Deep intelligence engines
import { buildFromInput } from '../company/CompanyProfileFactory';
import { sectorProfileBuilder } from '../sector/SectorProfileBuilder';
import { peerGraphBuilder } from '../peers/PeerGraphBuilder';
import { factorAttributionEngine } from '../attribution/FactorAttributionEngine';
import { thesisLifecycleEngine } from '../thesis/ThesisLifecycleEngine';
import { moatEngine } from '../moat/MoatEngine';
import { governanceRiskEngine } from '../governance/GovernanceRiskEngine';
import { ownershipEngine } from '../ownership/OwnershipEngine';
import { catalystEngine } from '../catalysts/CatalystEngine';
import { earningsQualityEngine } from '../earningsQuality/EarningsQualityEngine';
import { valuationRegimeEngine } from '../valuationRegime/ValuationRegimeEngine';
import { technicalRegimeEngine } from '../technicalRegime/TechnicalRegimeEngine';
import { riskRadarEngine } from '../riskRadar/RiskRadarEngine';
import { opportunityClassifierEngine } from '../opportunity/OpportunityClassifierEngine';
import { explainabilityEngine } from '../explainability/ExplainabilityEngine';

import type { CompanyIntelligenceProfile } from '../company/CompanyTypes';
import type { SectorIntelligenceProfile } from '../sector/SectorTypes';
import type { PeerGraph } from '../peers/PeerTypes';
import type { FactorAttribution } from '../attribution/FactorAttributionEngine';
import type { ResearchThesis } from '../thesis/ThesisLifecycleEngine';
import type { MoatAssessment } from '../moat/MoatEngine';
import type { GovernanceRiskReport } from '../governance/GovernanceRiskEngine';
import type { OwnershipReport } from '../ownership/OwnershipEngine';
import type { CatalystReport } from '../catalysts/CatalystEngine';
import type { EarningsQualityReport } from '../earningsQuality/EarningsQualityEngine';
import type { ValuationRegimeReport } from '../valuationRegime/ValuationRegimeEngine';
import type { TechnicalRegimeReport } from '../technicalRegime/TechnicalRegimeEngine';
import type { RiskRadarReport } from '../riskRadar/RiskRadarEngine';
import type { OpportunityReport } from '../opportunity/OpportunityClassifierEngine';

export interface DeepIntelligenceReport extends StockIntelligenceReport {
  /** Deep intelligence subsystems */
  deep: {
    companyProfile: CompanyIntelligenceProfile | null;
    sectorProfile: SectorIntelligenceProfile | null;
    peerGraph: PeerGraph | null;
    factorAttribution: FactorAttribution | null;
    thesisLifecycle: ResearchThesis | null;
    moat: MoatAssessment | null;
    governance: GovernanceRiskReport | null;
    ownership: OwnershipReport | null;
    catalysts: CatalystReport | null;
    earningsQuality: EarningsQualityReport | null;
    valuationRegime: ValuationRegimeReport | null;
    technicalRegime: TechnicalRegimeReport | null;
    riskRadar: RiskRadarReport | null;
    opportunity: OpportunityReport | null;
  };

  /** Deep composite score incorporating all subsystems */
  deepComposite: {
    score: number;
    label: string;
    dimensions: Record<string, number>;
  };
}

export class DeepLensoryOrchestrator {
  private baseOrchestrator: LensoryOrchestrator;

  constructor(base?: LensoryOrchestrator) {
    this.baseOrchestrator = base ?? orchestrator;
  }

  /**
   * Run the complete deep intelligence pipeline.
   */
  async analyze(input: IntelligenceInput): Promise<DeepIntelligenceReport> {
    const startTime = performance.now();

    // ── Run base orchestrator (9 engines) ────────────────────
    const baseReport = await this.baseOrchestrator.analyze(input);

    // ── Build company profile first (needed by thesis + peer graph) ──
    const companyProfile = await this.safeRun(() =>
      buildFromInput(input) as unknown as CompanyIntelligenceProfile
    );

    // ── Run all deep intelligence engines in parallel ────────
    const [sectorProfile, peerGraph, factorAttribution,
           thesisLifecycle, moat, governance, ownership, catalysts,
           earningsQuality, valuationRegime, technicalRegime,
           riskRadar, opportunity] = await Promise.all([
      this.safeRun(() => sectorProfileBuilder.build(input)),
      this.safeRun(() => peerGraphBuilder.build(
        companyProfile as CompanyIntelligenceProfile, []
      )),
      this.safeRun(() => factorAttributionEngine.analyze(input)),
      this.safeRun(() => thesisLifecycleEngine.build(
        companyProfile as CompanyIntelligenceProfile, input
      )),
      this.safeRun(() => moatEngine.analyze(input)),
      this.safeRun(() => governanceRiskEngine.analyze(input)),
      this.safeRun(() => ownershipEngine.analyze(input)),
      this.safeRun(() => catalystEngine.analyze(input)),
      this.safeRun(() => earningsQualityEngine.analyze(input)),
      this.safeRun(() => valuationRegimeEngine.analyze(input)),
      this.safeRun(() => technicalRegimeEngine.analyze(input)),
      this.safeRun(() => riskRadarEngine.analyze(input)),
      this.safeRun(() => opportunityClassifierEngine.analyze(input)),
    ]);

    // ── Compute deep composite ───────────────────────────────
    const deepComposite = this.computeDeepComposite(
      baseReport, companyProfile, moat, governance,
      earningsQuality, valuationRegime, technicalRegime,
      riskRadar, opportunity
    );

    // ── Generate L2 explanations ─────────────────────────────
    const engineOutputs = new Map<string, Record<string, unknown>>();
    if (companyProfile) engineOutputs.set('company_profile', companyProfile as unknown as Record<string, unknown>);
    if (moat) engineOutputs.set('moat', moat as unknown as Record<string, unknown>);
    if (governance) engineOutputs.set('governance', governance as unknown as Record<string, unknown>);
    if (ownership) engineOutputs.set('ownership', ownership as unknown as Record<string, unknown>);
    if (catalysts) engineOutputs.set('catalysts', catalysts as unknown as Record<string, unknown>);
    if (earningsQuality) engineOutputs.set('earnings_quality', earningsQuality as unknown as Record<string, unknown>);
    if (valuationRegime) engineOutputs.set('valuation_regime', valuationRegime as unknown as Record<string, unknown>);
    if (technicalRegime) engineOutputs.set('technical_regime', technicalRegime as unknown as Record<string, unknown>);
    if (riskRadar) engineOutputs.set('risk_radar', riskRadar as unknown as Record<string, unknown>);
    if (opportunity) engineOutputs.set('opportunity_classification', opportunity as unknown as Record<string, unknown>);

    const explanations = explainabilityEngine.explainAll(input.symbol, engineOutputs);

    // ── Build deep report ────────────────────────────────────
    const deepReport: DeepIntelligenceReport = {
      ...baseReport,
      deep: {
        companyProfile,
        sectorProfile,
        peerGraph,
        factorAttribution,
        thesisLifecycle,
        moat,
        governance,
        ownership,
        catalysts,
        earningsQuality,
        valuationRegime,
        technicalRegime,
        riskRadar,
        opportunity,
      },
      deepComposite,
      metadata: {
        ...baseReport.metadata,
        computationTimeMs: Math.round(performance.now() - startTime),
        engineVersions: {
          ...baseReport.metadata.engineVersions,
          companyProfile: '1.0.0',
          sectorProfile: '1.0.0',
          peerGraph: '1.0.0',
          factorAttribution: '1.0.0',
          thesisLifecycle: '1.0.0',
          moat: '1.0.0',
          governance: '1.0.0',
          ownership: '1.0.0',
          catalysts: '1.0.0',
          earningsQuality: '1.0.0',
          valuationRegime: '1.0.0',
          technicalRegime: '1.0.0',
          riskRadar: '1.0.0',
          opportunityClassifier: '1.0.0',
        } as Record<string, string>,
      },
    };

    return deepReport;
  }

  /**
   * Safe execution wrapper — returns null on any error.
   */
  private async safeRun<T>(fn: () => T): Promise<T | null> {
    try {
      return await Promise.resolve(fn());
    } catch (err) {
      console.error(`Deep intelligence engine error:`, err);
      return null;
    }
  }

  /**
   * Compute a deep composite score incorporating all subsystems.
   */
  private computeDeepComposite(
    base: StockIntelligenceReport,
    companyProfile: CompanyIntelligenceProfile | null,
    moat: MoatAssessment | null,
    governance: GovernanceRiskReport | null,
    earningsQuality: EarningsQualityReport | null,
    valuationRegime: ValuationRegimeReport | null,
    technicalRegime: TechnicalRegimeReport | null,
    riskRadar: RiskRadarReport | null,
    opportunity: OpportunityReport | null,
  ): DeepIntelligenceReport['deepComposite'] {
    const dimensions: Record<string, number> = {};
    let weightedSum = base.compositeScore.score * 0.40;
    let totalWeight = 0.40;

    if (companyProfile) {
      dimensions.companyProfile = companyProfile.aggregate.overall;
      weightedSum += companyProfile.aggregate.overall * 0.15;
      totalWeight += 0.15;
    }

    if (moat) {
      dimensions.moat = moat.moatScore;
      weightedSum += moat.moatScore * 0.08;
      totalWeight += 0.08;
    }

    if (governance) {
      dimensions.governance = governance.governanceScore;
      // Governance is a risk — high score = good governance = positive
      weightedSum += governance.governanceScore * 0.07;
      totalWeight += 0.07;
    }

    if (earningsQuality) {
      dimensions.earningsQuality = earningsQuality.qualityScore;
      weightedSum += earningsQuality.qualityScore * 0.07;
      totalWeight += 0.07;
    }

    if (valuationRegime) {
      dimensions.valuationRegime = valuationRegime.alignmentScore;
      weightedSum += valuationRegime.alignmentScore * 0.07;
      totalWeight += 0.07;
    }

    if (technicalRegime) {
      // Map regime to a score
      const regimeScore = this.regimeToScore(technicalRegime.regime);
      dimensions.technicalRegime = regimeScore;
      weightedSum += regimeScore * 0.05;
      totalWeight += 0.05;
    }

    if (riskRadar) {
      // Invert — lower risk = better
      const riskScore = 100 - riskRadar.overview.compositeRiskScore;
      dimensions.riskRadar = riskScore;
      weightedSum += riskScore * 0.07;
      totalWeight += 0.07;
    }

    if (opportunity) {
      const oppScore = opportunity.confidence * 100;
      dimensions.opportunity = oppScore;
      weightedSum += oppScore * 0.04;
      totalWeight += 0.04;
    }

    const score = clampScore(totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50);

    return {
      score,
      label: toScoreBand(score),
      dimensions,
    };
  }

  private regimeToScore(regime: string): number {
    switch (regime) {
      case 'strong_uptrend': return 80;
      case 'uptrend': return 65;
      case 'accumulation': return 55;
      case 'rangebound': return 50;
      case 'distribution': return 40;
      case 'downtrend': return 30;
      case 'strong_downtrend': return 20;
      case 'overextended_up': return 45;
      case 'overextended_down': return 35;
      case 'volatile': return 40;
      default: return 50;
    }
  }
}

export const deepOrchestrator = new DeepLensoryOrchestrator();
