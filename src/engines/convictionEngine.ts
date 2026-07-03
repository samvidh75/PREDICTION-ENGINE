export interface ConvictionInput {
  qualityScore: number;
  valuationScore: number;
  growthScore: number;
  stabilityScore: number;
  momentumScore: number;
  riskScore: number;
  sectorScore: number;
  catalystScore: number;
  dataCompleteness: number;
  consensusDeviation: number;
}

export interface ConvictionResult {
  conviction: number;
  factors: Record<string, number>;
  signal: 'strong' | 'moderate' | 'weak';
  label: string;
}

export class ConvictionEngine {
  calculateConviction(input: ConvictionInput): ConvictionResult {
    const raw = {
      quality: input.qualityScore * 0.25,
      valuation: input.valuationScore * 0.20,
      growth: input.growthScore * 0.20,
      stability: input.stabilityScore * 0.15,
      momentum: input.momentumScore * 0.10,
      risk: (100 - input.riskScore) * 0.05,
      sectorRelative: input.sectorScore * 0.03,
      catalyst: input.catalystScore * 0.02,
    };

    const baseConviction = Object.values(raw).reduce((a, b) => a + b, 0);
    const completenessMultiplier = Math.max(0.5, input.dataCompleteness / 100);
    const consensusFactor = Math.max(0.7, 1 - (input.consensusDeviation / 100) * 0.3);

    const conviction = Math.round(baseConviction * completenessMultiplier * consensusFactor);

    let signal: 'strong' | 'moderate' | 'weak';
    if (conviction >= 70) signal = 'strong';
    else if (conviction >= 50) signal = 'moderate';
    else signal = 'weak';

    const label = this.classifyLabel(conviction, input);

    return { conviction, factors: raw, signal, label };
  }

  private classifyLabel(conviction: number, input: ConvictionInput): string {
    if (conviction >= 75 && input.qualityScore >= 70) return 'High Conviction';
    if (conviction >= 70 && input.consensusDeviation > 25) return 'Watch';
    if (conviction >= 50) return 'Needs Review';
    if (conviction < 50 && input.riskScore > 65) return 'Risk Rising';
    if (conviction < 30) return 'Avoid for Now';
    return 'Thesis Improving';
  }

  calculateDataCompleteness(fundamentals: Record<string, any>): number {
    const required = [
      'pe', 'pb', 'roe', 'roic', 'debt_to_equity',
      'revenue_cagr_3y', 'profit_cagr_3y', 'operating_margin',
      'ev_ebitda', 'dividend_yield', 'volatility_30d', 'max_drawdown_52w',
    ];
    const filled = required.filter(f => fundamentals[f] != null).length;
    return Math.round((filled / required.length) * 100);
  }

  calculateConsensusDeviation(scores: Record<string, number>): number {
    const values = Object.values(scores).filter(v => v != null);
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.min(100, Math.sqrt(variance));
  }
}

export const convictionEngine = new ConvictionEngine();
