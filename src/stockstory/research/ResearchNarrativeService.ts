import type {
  StockStoryResearchInput,
  StockStoryNarrativeOutput,
  FactorBreakdown,
  RiskFlag,
  GrowthContext,
  QualityContext,
  ValuationContext,
  MomentumContext,
} from './types';

const THRESHOLDS = {
  EXCELLENT: 80,
  HEALTHY: 65,
  STABLE: 50,
  WEAKENING: 35,
};

export class ResearchNarrativeService {
  generateCompanyThesis(input: StockStoryResearchInput): string {
    const { score, factorScores, topPositiveDrivers, topNegativeDrivers, sector } = input;

    const classification = this.classifyScore(score);
    const hasStrength = topPositiveDrivers.length > 0 && factorScores.quality >= 50;
    const hasRisk = topNegativeDrivers.length > 0 || factorScores.risk > 60;

    const parts: string[] = [];

    if (classification === 'excellent') {
      parts.push(`${input.companyName} presents a compelling research profile with strong fundamentals across quality, growth, and financial stability.`);
    } else if (classification === 'healthy') {
      parts.push(`${input.companyName} maintains solid fundamental health with balanced strengths across key dimensions.`);
    } else if (classification === 'stable') {
      parts.push(`${input.companyName} shows a mixed profile with both encouraging signals and areas requiring attention.`);
    } else if (classification === 'weakening') {
      parts.push(`${input.companyName} faces headwinds across several dimensions that may warrant closer evaluation before commitment.`);
    } else {
      parts.push(`${input.companyName} registers elevated risk indicators. This is better suited as a research candidate than an immediate action candidate.`);
    }

    if (hasStrength && hasRisk) {
      parts.push(`The opportunity is balanced by real risk factors, making thorough research essential.`);
    } else if (hasStrength) {
      parts.push(`The fundamental profile remains supportive, though market conditions always merit monitoring.`);
    } else if (hasRisk) {
      parts.push(`Risk management should be the primary lens when evaluating this opportunity.`);
    }

    if (score >= THRESHOLDS.HEALTHY) {
      parts.push(`Within the ${sector} sector, the company's research indicators compare favorably against sector norms.`);
    }

    return parts.join(' ');
  }

  generateBullCase(input: StockStoryResearchInput): string {
    const { factorScores, topPositiveDrivers, qualityContext, growthContext, sector } = input;

    const parts: string[] = [];

    if (factorScores.quality >= 65) {
      parts.push(`Business quality is a differentiator.`);
      if (qualityContext.roeScore >= 70) {
        parts.push(`The company delivers strong returns on capital employed, suggesting efficient capital allocation.`);
      }
      if (growthContext.revenueGrowthScore >= 65) {
        parts.push(`Revenue growth outpaces sector averages, indicating market share gains or expanding addressable markets.`);
      }
    }

    if (factorScores.valuation >= 60 && factorScores.quality >= 60) {
      parts.push(`The combination of reasonable valuation and solid quality creates a favorable research context.`);
    }

    if (factorScores.momentum >= 60) {
      parts.push(`Market price action is constructive, with technical indicators supporting the fundamental thesis.`);
    }

    if (factorScores.stability >= 60) {
      parts.push(`A strong balance sheet provides resilience and optionality.`);
    }

    if (parts.length === 0) {
      parts.push(`The bull case is not clearly differentiated at this time. Further monitoring may reveal emerging strengths.`);
    }

    return parts.join(' ');
  }

  generateBearCase(input: StockStoryResearchInput): string {
    const { factorScores, topNegativeDrivers, riskFlags, valuationContext, sector } = input;

    const parts: string[] = [];

    if (factorScores.risk > 60) {
      parts.push(`Risk indicators are elevated relative to sector norms.`);
    }

    if (valuationContext.compositeScore < 40 && factorScores.valuation < 45) {
      parts.push(`Valuation multiples are demanding, leaving limited room for error in execution.`);
    }

    if (riskFlags.length > 0) {
      const highFlags = riskFlags.filter(f => f.severity === 'high');
      if (highFlags.length > 0) {
        parts.push(`Identified risk factors in ${highFlags.map(f => f.type).join(', ')} require monitoring.`);
      }
    }

    if (factorScores.momentum < 35) {
      parts.push(`Technical weakness may precede or reflect fundamental deterioration.`);
    }

    if (factorScores.growth < 40) {
      parts.push(`Growth metrics lag sector averages, raising questions about competitive positioning.`);
    }

    if (parts.length === 0) {
      parts.push(`The bear case is not immediately pronounced. However, all investments carry inherent market risk.`);
    }

    return parts.join(' ');
  }

  generateWhatChanged(input: StockStoryResearchInput): string {
    const { whatChangedInputs, factorScores } = input;

    if (!whatChangedInputs || whatChangedInputs.length === 0) {
      return 'No significant changes detected in the current research profile.';
    }

    const parts: string[] = ['Recent developments:'];

    for (const change of whatChangedInputs.slice(0, 3)) {
      parts.push(`  ${change}`);
    }

    if (factorScores.momentum >= 65 && factorScores.quality >= 60) {
      parts.push(`The thesis is improving because profitability and balance-sheet stability are stronger than valuation suggests.`);
    } else if (factorScores.momentum < 35 && factorScores.valuation < 40) {
      parts.push(`Risk needs review because momentum has weakened while valuation remains demanding.`);
    }

    return parts.join(' ');
  }

  generateWhyItMatters(input: StockStoryResearchInput): string {
    const { companyName, sector, factorScores } = input;

    if (factorScores.quality >= 65 && factorScores.growth >= 60) {
      return `${companyName} matters in the ${sector} space because it combines above-average business quality with meaningful growth. Companies that sustain both are rare and typically command research attention.`;
    }

    if (factorScores.stability >= 70 && factorScores.valuation >= 60) {
      return `${companyName} represents a financially stable operator in the ${sector} sector. In uncertain markets, stability combined with reasonable valuation merits research focus.`;
    }

    if (factorScores.momentum >= 70) {
      return `${companyName} is exhibiting strong market momentum in the ${sector} sector. Understanding why the market is pricing this company favorably is essential before considering any action.`;
    }

    return `${companyName} operates in the ${sector} sector where structural shifts may create opportunities. Regular research review helps identify when the risk-reward profile shifts meaningfully.`;
  }

  generateWatchNext(input: StockStoryResearchInput): string {
    const { factorScores, sector } = input;

    const parts: string[] = ['Key developments to monitor:'];

    if (factorScores.quality < 50 || factorScores.growth < 45) {
      parts.push('Next quarterly results for evidence of operational turnaround or deterioration.');
    }

    if (factorScores.valuation > 70 && factorScores.momentum > 60) {
      parts.push('Valuation multiple expansion — watch for mean reversion signals.');
    }

    if (factorScores.risk > 55) {
      parts.push('Debt servicing capability and cash flow trends in upcoming reporting cycles.');
    }

    if (factorScores.momentum < 40) {
      parts.push('Price trend stabilization or further deterioration — key technical levels to track.');
    }

    if (sector) {
      parts.push(`Sector-wide factors in ${sector} that could impact company performance.`);
    }

    return parts.join(' ');
  }

  generateRiskSummary(input: StockStoryResearchInput): string {
    const { riskFlags, factorScores } = input;

    if (riskFlags.length === 0 && factorScores.risk <= 45) {
      return 'No material risk flags are currently elevated. Standard market and sector risks apply.';
    }

    const parts: string[] = [];

    if (factorScores.risk > 65) {
      parts.push(`Risk profile is elevated (${factorScores.risk}/100), reflecting above-average concerns.`);
    } else if (factorScores.risk > 45) {
      parts.push(`Risk indicators are moderately elevated (${factorScores.risk}/100), warranting monitoring.`);
    }

    for (const flag of riskFlags) {
      parts.push(flag.description);
    }

    return parts.join(' ');
  }

  generatePeerContext(input: StockStoryResearchInput): string {
    const { peerContext, sector, score } = input;

    if (!peerContext) {
      return `Within the ${sector} sector, this company scores ${score}/100 on the StockStory research framework. Sector context is available when more peer data is loaded.`;
    }

    const parts: string[] = [
      `Among ${peerContext.peerCount} companies in the ${peerContext.sector} sector tracked by StockStory, ${input.companyName} ranks at the ${peerContext.percentileRank}th percentile.`,
    ];

    if (peerContext.strengths.length > 0) {
      parts.push(`Relative strengths: ${peerContext.strengths.join(', ')}.`);
    }

    if (peerContext.weaknesses.length > 0) {
      parts.push(`Areas of relative weakness: ${peerContext.weaknesses.join(', ')}.`);
    }

    return parts.join(' ');
  }

  generateComplianceSafeLabel(input: StockStoryResearchInput): string {
    const score = input.score;

    if (score >= THRESHOLDS.EXCELLENT) return 'Research — Strong Profile';
    if (score >= THRESHOLDS.HEALTHY) return 'Research — Healthy Profile';
    if (score >= THRESHOLDS.STABLE) return 'Research — Stable Profile';
    if (score >= THRESHOLDS.WEAKENING) return 'Research — Needs Review';
    return 'Research — Elevated Risk';
  }

  generateFullNarrative(input: StockStoryResearchInput): StockStoryNarrativeOutput {
    return {
      thesis: this.generateCompanyThesis(input),
      bullCase: this.generateBullCase(input),
      bearCase: this.generateBearCase(input),
      whatChanged: this.generateWhatChanged(input),
      whyItMatters: this.generateWhyItMatters(input),
      keyRisks: this.generateRiskSummary(input),
      watchNext: this.generateWatchNext(input),
      peerContextSummary: this.generatePeerContext(input),
      confidenceNote: this.generateConfidenceNote(input),
      methodologyNote: 'This research summary is generated by StockStory\'s deterministic analytical engine. Scores are derived from financial fundamentals, technical indicators, and sector-relative percentile rankings.',
      complianceSafeLabel: this.generateComplianceSafeLabel(input),
    };
  }

  private generateConfidenceNote(input: StockStoryResearchInput): string {
    const completeness = input.dataCompletenessForInternalUseOnly;

    if (completeness >= 80) return 'Confidence in this assessment is supported by a comprehensive data set covering all primary analytical dimensions.';
    if (completeness >= 50) return 'Confidence is moderate — some data dimensions have limited coverage. The thesis should be validated through independent research.';
    return 'Confidence is limited by significant data gaps in the underlying analytical inputs. This assessment is directional only.';
  }

  private classifyScore(score: number): string {
    if (score >= THRESHOLDS.EXCELLENT) return 'excellent';
    if (score >= THRESHOLDS.HEALTHY) return 'healthy';
    if (score >= THRESHOLDS.STABLE) return 'stable';
    if (score >= THRESHOLDS.WEAKENING) return 'weakening';
    return 'at-risk';
  }
}

export const researchNarrativeService = new ResearchNarrativeService();
