/**
 * Risk Radar Engine
 *
 * Multi-dimensional risk assessment consolidating all risk sources:
 * financial, valuation, governance, volatility, sector, macro, liquidity.
 *
 * Produces a radar map of risk dimensions with severity, trend, and
 * actionable flags — NOT a single risk score.
 */

import type { IntelligenceInput } from '../../types';

export interface RiskRadarReport {
  symbol: string;
  generatedAt: string;

  /** Radar dimensions */
  dimensions: RiskDimension[];

  /** Aggregate risk overview */
  overview: RiskOverview;

  /** Priority flags requiring attention */
  priorityFlags: RiskFlag[];

  summary: string;
}

export interface RiskDimension {
  name: string;
  category: 'financial' | 'valuation' | 'governance' | 'volatility' | 'sector' | 'macro' | 'liquidity' | 'earnings';
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'negligible';
  score: number;                    // 0-100 (higher = more severe)
  trend: 'worsening' | 'stable' | 'improving' | 'unknown';
  description: string;
  flags: string[];
}

export interface RiskOverview {
  /** Weighted average risk severity */
  compositeRiskScore: number;        // 0-100

  /** Highest risk dimension */
  highestRisk: { dimension: string; severity: string } | null;

  /** Count by severity */
  severityBreakdown: Record<string, number>;

  /** Overall risk posture */
  posture: 'elevated_risk' | 'moderate_risk' | 'low_risk' | 'insufficient_data';

  /** Number of critical+high flags */
  highPriorityCount: number;
}

export interface RiskFlag {
  dimension: string;
  flag: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  evidenceSource: string;
}

export class RiskRadarEngine {
  analyze(input: IntelligenceInput): RiskRadarReport {
    const dims = this.buildDimensions(input);
    const overview = this.buildOverview(dims);
    const priorityFlags = this.collectPriorityFlags(dims);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      dimensions: dims,
      overview,
      priorityFlags,
      summary: this.buildSummary(overview),
    };
  }

  private buildDimensions(input: IntelligenceInput): RiskDimension[] {
    const f = input.financials;
    const r = input.risks;
    const s = input.sector;
    const t = input.technicals;
    const e = input.earnings;

    return [
      this.financialRisk(f),
      this.valuationRisk(f),
      this.governanceRisk(r),
      this.volatilityRisk(t),
      this.sectorRisk(s),
      this.liquidityRisk(f),
      this.earningsRisk(e, f),
    ];
  }

  private financialRisk(f: IntelligenceInput['financials']): RiskDimension {
    const flags: string[] = [];
    let score = 30;

    if (f.debtToEquity !== null && f.debtToEquity > 2) {
      flags.push(`High leverage: D/E ${f.debtToEquity}`);
      score += 25;
    } else if (f.debtToEquity !== null && f.debtToEquity > 1) {
      flags.push(`Elevated leverage: D/E ${f.debtToEquity}`);
      score += 10;
    }

    if (f.interestCoverage !== null && f.interestCoverage < 2) {
      flags.push(`Low interest coverage: ${f.interestCoverage}x`);
      score += 20;
    }

    const severity = score > 60 ? 'high' : score > 40 ? 'moderate' : 'low';

    return {
      name: 'Financial Risk',
      category: 'financial',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `D/E ${f.debtToEquity ?? '—'}, Interest Coverage ${f.interestCoverage ?? '—'}x`,
      flags,
    };
  }

  private valuationRisk(f: IntelligenceInput['financials']): RiskDimension {
    const flags: string[] = [];
    let score = 30;

    if (f.peRatio !== null && f.peRatio > 40) {
      flags.push(`High PE: ${f.peRatio}x`);
      score += 20;
    } else if (f.peRatio !== null && f.peRatio > 25) {
      flags.push(`Elevated PE: ${f.peRatio}x`);
      score += 10;
    }

    if (f.pbRatio !== null && f.pbRatio > 5) {
      flags.push(`High PB: ${f.pbRatio}x`);
      score += 15;
    }

    const severity = score > 50 ? 'high' : score > 35 ? 'moderate' : 'low';

    return {
      name: 'Valuation Risk',
      category: 'valuation',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `PE ${f.peRatio ?? '—'}x, PB ${f.pbRatio ?? '—'}x`,
      flags,
    };
  }

  private governanceRisk(r: IntelligenceInput['risks']): RiskDimension {
    const flags: string[] = [];
    let score = 25;

    if (r?.pledgedShares !== null && r.pledgedShares > 30) {
      flags.push(`High promoter pledge: ${r.pledgedShares}%`);
      score += 30;
    } else if (r?.pledgedShares !== null && r.pledgedShares > 10) {
      flags.push(`Promoter pledge: ${r.pledgedShares}%`);
      score += 15;
    }

    if (r?.auditorChange === true) {
      flags.push('Recent auditor change');
      score += 25;
    }

    const severity = score > 50 ? 'critical' : score > 35 ? 'high' : score > 25 ? 'moderate' : 'low';

    return {
      name: 'Governance Risk',
      category: 'governance',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `Promoter pledge ${r?.pledgedShares ?? '—'}%, Auditor change ${r?.auditorChange ? 'Yes' : 'No'}`,
      flags,
    };
  }

  private volatilityRisk(t: IntelligenceInput['technicals']): RiskDimension {
    const flags: string[] = [];
    let score = 25;

    if (t.beta !== null && t.beta > 1.3) {
      flags.push(`High beta: ${t.beta}`);
      score += 20;
    }

    if (t.standardDeviation !== null && t.standardDeviation > 3) {
      flags.push('Elevated daily volatility');
      score += 15;
    }

    const severity = score > 40 ? 'high' : score > 30 ? 'moderate' : 'low';

    return {
      name: 'Volatility Risk',
      category: 'volatility',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `Beta ${t.beta ?? '—'}`,
      flags,
    };
  }

  private sectorRisk(s: IntelligenceInput['sector']): RiskDimension {
    const flags: string[] = [];
    let score = 25;

    if (s.sectorMomentum === 'decelerating') {
      flags.push('Sector momentum decelerating');
      score += 15;
    }

    if (s.sectorRiskLevel === 'high') {
      flags.push('High sector risk classification');
      score += 20;
    }

    const severity = score > 40 ? 'high' : score > 30 ? 'moderate' : 'low';

    return {
      name: 'Sector Risk',
      category: 'sector',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `Momentum: ${s.sectorMomentum ?? '—'}, Risk: ${s.sectorRiskLevel ?? '—'}`,
      flags,
    };
  }

  private liquidityRisk(f: IntelligenceInput['financials']): RiskDimension {
    const flags: string[] = [];
    let score = 20;

    if (f.currentRatio !== null && f.currentRatio < 1) {
      flags.push(`Current ratio below 1: ${f.currentRatio}`);
      score += 20;
    }

    if (f.freeCashFlow !== null && f.freeCashFlow < 0) {
      flags.push('Negative free cash flow');
      score += 15;
    }

    const severity = score > 35 ? 'high' : score > 25 ? 'moderate' : 'low';

    return {
      name: 'Liquidity Risk',
      category: 'liquidity',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `Current ratio ${f.currentRatio ?? '—'}`,
      flags,
    };
  }

  private earningsRisk(
    e: IntelligenceInput['earnings'],
    f: IntelligenceInput['financials'],
  ): RiskDimension {
    const flags: string[] = [];
    let score = 20;

    if (e.beatMiss === 'miss' || e.beatMiss === 'mixed') {
      flags.push('Recent earnings miss or mixed');
      score += 20;
    }

    if (f.epsGrowth !== null && f.epsGrowth < -10) {
      flags.push(`EPS declining: ${f.epsGrowth}%`);
      score += 20;
    }

    const severity = score > 35 ? 'high' : score > 25 ? 'moderate' : 'low';

    return {
      name: 'Earnings Risk',
      category: 'earnings',
      severity,
      score: Math.min(100, score),
      trend: 'unknown',
      description: `Earnings beat/miss: ${e.beatMiss ?? '—'}`,
      flags,
    };
  }

  private buildOverview(dims: RiskDimension[]): RiskOverview {
    const valid = dims.filter(d => d.severity !== 'low' || d.flags.length > 0);
    const composite = valid.length > 0
      ? Math.round(valid.reduce((s, d) => s + d.score, 0) / valid.length)
      : 20;

    const highest = [...dims].sort((a, b) => b.score - a.score)[0] ?? null;

    const breakdown: Record<string, number> = { critical: 0, high: 0, moderate: 0, low: 0, negligible: 0 };
    dims.forEach(d => { breakdown[d.severity] = (breakdown[d.severity] || 0) + 1; });

    const highPriorityCount = (breakdown.critical || 0) + (breakdown.high || 0);

    let posture: RiskOverview['posture'] = 'low_risk';
    if (highPriorityCount >= 3) posture = 'elevated_risk';
    else if (highPriorityCount >= 1) posture = 'moderate_risk';
    else if (dims.every(d => d.score < 20)) posture = 'low_risk';
    else posture = 'moderate_risk';

    return {
      compositeRiskScore: composite,
      highestRisk: highest ? { dimension: highest.name, severity: highest.severity } : null,
      severityBreakdown: breakdown,
      posture,
      highPriorityCount,
    };
  }

  private collectPriorityFlags(dims: RiskDimension[]): RiskFlag[] {
    const flags: RiskFlag[] = [];
    for (const d of dims) {
      for (const f of d.flags) {
        flags.push({
          dimension: d.name,
          flag: f,
          severity: d.severity === 'critical' || d.severity === 'high' ? d.severity : 'moderate',
          evidenceSource: d.category,
        });
      }
    }
    return flags.sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    });
  }

  private buildSummary(overview: RiskOverview): string {
    const high = overview.highPriorityCount;
    if (high === 0) return 'Risk radar shows manageable risk across all dimensions.';
    if (high <= 2) return `${high} priority risk area(s) identified. Overall posture: ${overview.posture.replace('_', ' ')}.`;
    return `${high} priority risk areas identified. Overall posture: ${overview.posture.replace('_', ' ')} — higher scrutiny recommended.`;
  }
}

export const riskRadarEngine = new RiskRadarEngine();
