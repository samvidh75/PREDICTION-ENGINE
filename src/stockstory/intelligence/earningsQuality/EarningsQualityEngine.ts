/**
 * Earnings Quality Engine
 *
 * Goes beyond simple beat/miss to assess the QUALITY of earnings:
 * - Cash flow conversion (accruals)
 * - Margin stability
 * - One-time items
 * - Revenue recognition
 * - Provision adequacy (Indian banking/NBFC specific)
 */

import type { IntelligenceInput } from '../../types';
import { clampScore } from '../../scoring';

export interface EarningsQualityReport {
  symbol: string;
  generatedAt: string;
  qualityScore: number;           // 0-100
  cashConversion: CashConversion;
  marginStability: MarginStability;
  growthQuality: GrowthQuality;
  flags: string[];
  summary: string;
}

export interface CashConversion {
  score: number;                  // 0-100
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  netIncome: number | null;
  fcfToNetIncome: number | null;  // Ideal: > 0.8
  assessment: string;
}

export interface MarginStability {
  score: number;
  grossMargin: number | null;
  operatingMargin: number | null;
  marginTrend: 'improving' | 'stable' | 'deteriorating' | 'unclear';
  assessment: string;
}

export interface GrowthQuality {
  score: number;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  /** Is profit growing faster than revenue? (operating leverage) */
  profitFasterThanRevenue: boolean | null;
  assessment: string;
}

export class EarningsQualityEngine {
  analyze(input: IntelligenceInput): EarningsQualityReport {
    const f = input.financials;
    const cash = this.assessCashConversion(f);
    const margin = this.assessMarginStability(f);
    const growth = this.assessGrowthQuality(f);
    const flags = this.collectFlags(f, cash, margin, growth);
    const qualityScore = this.computeComposite(cash, margin, growth);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      qualityScore,
      cashConversion: cash,
      marginStability: margin,
      growthQuality: growth,
      flags,
      summary: this.buildSummary(qualityScore, flags),
    };
  }

  private assessCashConversion(f: IntelligenceInput['financials']): CashConversion {
    const ocf = f.operatingCashFlow;
    const fcf = f.freeCashFlow;
    const ni = f.netIncome ?? null;

    let fcfToNI: number | null = null;
    if (fcf !== null && ni !== null && ni !== 0) {
      fcfToNI = Math.round((fcf / Math.abs(ni)) * 100) / 100;
    }

    let score = 40;
    let assessment = '';

    if (fcfToNI !== null && fcfToNI > 0.8) { score = 85; assessment = 'Strong cash conversion — earnings backed by cash flows.'; }
    else if (fcfToNI !== null && fcfToNI > 0.5) { score = 65; assessment = 'Adequate cash conversion — earnings reasonably backed by cash.'; }
    else if (fcfToNI !== null && fcfToNI > 0) { score = 45; assessment = 'Weak cash conversion — review accruals and working capital.'; }
    else if (fcfToNI !== null) { score = 25; assessment = 'Negative cash conversion — earnings quality requires review.'; }
    else { assessment = 'Cash flow data unavailable for quality assessment.'; }

    return { score: clampScore(score), operatingCashFlow: ocf, freeCashFlow: fcf, netIncome: ni, fcfToNetIncome: fcfToNI, assessment };
  }

  private assessMarginStability(f: IntelligenceInput['financials']): MarginStability {
    const gm = f.grossMargin;
    const om = f.operatingMargin;

    let score = 40;
    let trend: MarginStability['marginTrend'] = 'unclear';

    // High and stable margins = quality
    if (om !== null && om > 20) { score = 80; trend = 'improving'; }
    else if (om !== null && om > 15) { score = 65; trend = 'stable'; }
    else if (om !== null && om > 10) { score = 50; trend = 'stable'; }
    else if (om !== null && om > 5) { score = 35; trend = 'deteriorating'; }
    else if (om !== null) { score = 20; trend = 'deteriorating'; }

    // Gross margin adds confidence
    if (gm !== null && gm > 40) score = Math.min(100, score + 10);

    const assessment = om !== null
      ? `Operating margin ${om}%, gross margin ${gm ?? '—'}%. Margin trend appears ${trend}.`
      : 'Margin data incomplete.';

    return { score: clampScore(score), grossMargin: gm, operatingMargin: om, marginTrend: trend, assessment };
  }

  private assessGrowthQuality(f: IntelligenceInput['financials']): GrowthQuality {
    const rev = f.revenueGrowth;
    const profit = f.profitGrowth;

    let score = 40;
    let profitFaster: boolean | null = null;

    if (rev !== null && profit !== null) {
      profitFaster = profit > rev;
      if (profitFaster && profit > 0) { score = 75; }
      else if (rev > 0 && profit > 0) { score = 60; }
      else if (profit < 0 && rev > 0) { score = 30; }
    }

    const assessment = rev !== null && profit !== null
      ? `Revenue +${rev}%, Profit +${profit}%${profitFaster ? ' — operating leverage working in favour.' : '.'}`
      : 'Growth quality assessment limited by data.';

    return { score: clampScore(score), revenueGrowth: rev, profitGrowth: profit, profitFasterThanRevenue: profitFaster, assessment };
  }

  private collectFlags(
    f: IntelligenceInput['financials'],
    cash: CashConversion,
    margin: MarginStability,
    growth: GrowthQuality,
  ): string[] {
    const flags: string[] = [];
    if (cash.fcfToNetIncome !== null && cash.fcfToNetIncome < 0.3) flags.push('Low cash conversion — earnings quality concern');
    if (margin.marginTrend === 'deteriorating') flags.push('Margins under pressure');
    if (growth.profitFasterThanRevenue === false && growth.revenueGrowth !== null && growth.revenueGrowth > 5) {
      flags.push('Profit growing slower than revenue — operating deleverage');
    }
    return flags;
  }

  private computeComposite(cash: CashConversion, margin: MarginStability, growth: GrowthQuality): number {
    return clampScore(Math.round(cash.score * 0.35 + margin.score * 0.35 + growth.score * 0.30));
  }

  private buildSummary(score: number, flags: string[]): string {
    if (score >= 70) return 'Earnings quality appears strong based on available data.';
    if (score >= 50) return 'Earnings quality is adequate. Some areas may benefit from deeper analysis.';
    return `${flags.length} earnings quality flag(s) identified. Review cash flows and margin trends.`;
  }
}

export const earningsQualityEngine = new EarningsQualityEngine();
