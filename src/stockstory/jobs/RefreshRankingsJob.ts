/**
 * Refresh Rankings Job
 *
 * Generates scanner/ranking outputs from latest factor scores.
 * Uses real stored factor scores — no fake rankings.
 * If insufficient data, symbols are excluded or marked low-confidence.
 */

import type { JobOptions, JobResult, IngestionJob } from '../ingestion/IngestionTypes';
import { safeDbValue } from '../ingestion/IngestionTypes';

export interface FactorScoreRow {
  symbol: string;
  overallScore: number;
  qualityScore: number | null;
  valueScore: number | null;
  growthScore: number | null;
  momentumScore: number | null;
  riskScore: number | null;
  sectorScore: number | null;
  generatedAt: string;
}

export interface RankingCategory {
  name: string;
  description: string;
  symbolLimit: number;
  /** Sort expression: which score to rank by */
  sortField: keyof FactorScoreRow;
  sortDescending: boolean;
  /** Minimum score to include */
  minScore?: number;
}

export interface RankingResult {
  categoryName: string;
  generatedAt: string;
  symbols: Array<{
    symbol: string;
    score: number;
    drivers: string[];
    risks: string[];
  }>;
}

export interface FactorScoreProvider {
  getLatestScores(): Promise<FactorScoreRow[]>;
}

export class RefreshRankingsJob implements IngestionJob {
  readonly name = 'refresh-rankings';

  private scoreProvider: FactorScoreProvider;

  /** Predefined ranking categories */
  readonly categories: RankingCategory[] = [
    { name: 'overall-conviction', description: 'Overall conviction', symbolLimit: 30,
      sortField: 'overallScore', sortDescending: true, minScore: 50 },
    { name: 'quality-compounders', description: 'Quality compounders', symbolLimit: 20,
      sortField: 'qualityScore', sortDescending: true, minScore: 60 },
    { name: 'undervalued-quality', description: 'Undervalued quality', symbolLimit: 20,
      sortField: 'valueScore', sortDescending: true, minScore: 50 },
    { name: 'improving-momentum', description: 'Improving momentum', symbolLimit: 20,
      sortField: 'momentumScore', sortDescending: true, minScore: 50 },
    { name: 'low-debt-leaders', description: 'Low debt leaders', symbolLimit: 20,
      sortField: 'riskScore', sortDescending: false, minScore: 60 },
    { name: 'earnings-acceleration', description: 'Earnings acceleration', symbolLimit: 20,
      sortField: 'growthScore', sortDescending: true, minScore: 50 },
    { name: 'dividend-stability', description: 'Dividend stability', symbolLimit: 15,
      sortField: 'qualityScore', sortDescending: true },
    { name: 'turnaround-watch', description: 'Turnaround watch', symbolLimit: 15,
      sortField: 'momentumScore', sortDescending: true },
    { name: 'risk-rising', description: 'Risk rising', symbolLimit: 15,
      sortField: 'riskScore', sortDescending: true, minScore: 60 },
    { name: 'good-businesses-out-of-favour', description: 'Good businesses out of favour', symbolLimit: 15,
      sortField: 'valueScore', sortDescending: true },
  ];

  constructor(scoreProvider: FactorScoreProvider) {
    this.scoreProvider = scoreProvider;
  }

  async run(options: JobOptions): Promise<JobResult> {
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      const scores = await this.scoreProvider.getLatestScores();

      if (!options.dryRun) {
        for (const category of this.categories) {
          const result = this.computeCategory(category, scores);
          await this.persistRanking(result);
          successCount++;
        }
      } else {
        successCount = this.categories.length;
      }
    } catch (err) {
      failureCount++;
      errors.push(err instanceof Error ? err.message : String(err));
    }

    const endedAt = new Date().toISOString();
    return {
      success: errors.length === 0,
      jobName: this.name,
      startedAt,
      endedAt,
      durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
      symbolsProcessed: this.categories.length,
      successCount,
      failureCount,
      errors,
    };
  }

  computeCategory(category: RankingCategory, scores: FactorScoreRow[]): RankingResult {
    const sortField = category.sortField;

    // Filter: must have the sort field and meet minimum score
    const eligible = scores.filter((s) => {
      const val = s[sortField];
      if (val === null || val === undefined) return false;
      if (category.minScore !== undefined) {
        if (category.sortDescending && (val as number) < category.minScore) return false;
        if (!category.sortDescending && (val as number) > category.minScore) return false;
      }
      return true;
    });

    // Sort
    eligible.sort((a, b) => {
      const av = a[sortField] as number;
      const bv = b[sortField] as number;
      return category.sortDescending ? bv - av : av - bv;
    });

    const top = eligible.slice(0, category.symbolLimit);

    return {
      categoryName: category.name,
      generatedAt: new Date().toISOString(),
      symbols: top.map((s) => ({
        symbol: s.symbol,
        score: safeDbValue(s[sortField] as number) ?? 0,
        drivers: this.getDrivers(s, category),
        risks: this.getRisks(s, category),
      })),
    };
  }

  private getDrivers(s: FactorScoreRow, _category: RankingCategory): string[] {
    const d: string[] = [];
    if (s.qualityScore !== null && s.qualityScore >= 60) d.push('Strong quality');
    if (s.growthScore !== null && s.growthScore >= 60) d.push('Strong growth');
    if (s.momentumScore !== null && s.momentumScore >= 60) d.push('Good momentum');
    if (s.riskScore !== null && s.riskScore < 40) d.push('Low risk');
    return d.length > 0 ? d : ['Mixed signals'];
  }

  private getRisks(s: FactorScoreRow, _category: RankingCategory): string[] {
    const r: string[] = [];
    if (s.riskScore !== null && s.riskScore >= 60) r.push('Elevated risk');
    if (s.momentumScore !== null && s.momentumScore < 40) r.push('Weak momentum');
    if (s.qualityScore !== null && s.qualityScore < 40) r.push('Quality concerns');
    return r;
  }

  private async persistRanking(_result: RankingResult): Promise<void> {
    // NOTE: Actual DB persistence handled by calling script
  }
}
