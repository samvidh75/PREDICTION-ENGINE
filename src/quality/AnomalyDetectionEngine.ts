/**
 * AnomalyDetectionEngine — TRACK-21 Phase 6 Task 18
 *
 * Detects anomalies in financial and factor data that may signal
 * either data quality issues or genuine fundamental changes.
 *
 * Anomaly types:
 *   - PE spikes (>3× change)
 *   - Revenue collapses/surges (>50% QoQ, >200% YoY)
 *   - Margin collapses
 *   - Volatility explosions
 *   - Ranking instability (factor score jumps >30 points)
 *   - Zero volume / flatline prices
 *   - Cross-field consistency violations
 */

export interface DetectedAnomaly {
  symbol: string;
  type: string;
  field: string;
  currentValue: number | null;
  previousValue: number | null;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
}

export interface AnomalyReport {
  runDate: string;
  symbolsScanned: number;
  totalAnomalies: number;
  bySeverity: { low: number; medium: number; high: number };
  affectedSymbols: string[];
  anomalies: DetectedAnomaly[];
}

export interface FinancialSnapshot {
  symbol: string;
  peRatio?: number | null;
  pbRatio?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  eps?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  roe?: number | null;
  roa?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  marketCap?: number | null;
  periodEnd?: string;
}

export interface FactorSnapshot {
  symbol: string;
  qualityFactor?: number;
  growthFactor?: number;
  valueFactor?: number;
  momentumFactor?: number;
  riskFactor?: number;
}

export interface PriceSnapshot {
  symbol: string;
  closes?: number[];
  volumes?: number[];
  latestClose?: number | null;
}

export class AnomalyDetectionEngine {
  private anomalies: DetectedAnomaly[] = [];
  private previousFinancials: Map<string, FinancialSnapshot> = new Map();
  private previousFactors: Map<string, FactorSnapshot> = new Map();

  constructor() {}

  /**
   * Set previous snapshots for comparison (loaded from DB).
   */
  setPrevious(financials: Map<string, FinancialSnapshot>, factors: Map<string, FactorSnapshot>): void {
    this.previousFinancials = financials;
    this.previousFactors = factors;
  }

  /**
   * Detect all anomalies for a single symbol.
   */
  detect(
    symbol: string,
    currentFinancials: FinancialSnapshot,
    currentFactors?: FactorSnapshot,
    currentPrices?: PriceSnapshot,
  ): DetectedAnomaly[] {
    const previousFin = this.previousFinancials.get(symbol);
    const previousFact = this.previousFactors.get(symbol);
    const detected: DetectedAnomaly[] = [];

    // 1. PE Jumps
    if (currentFinancials.peRatio != null && previousFin?.peRatio != null) {
      const peAnomaly = this.detectPeJump(symbol, currentFinancials.peRatio, previousFin.peRatio);
      if (peAnomaly) detected.push(peAnomaly);
    }

    // 2. Revenue Anomalies
    if (currentFinancials.revenue != null && previousFin?.revenue != null && previousFin.revenue > 0) {
      const revAnomaly = this.detectRevenueAnomaly(symbol, currentFinancials.revenue, previousFin.revenue);
      if (revAnomaly) detected.push(revAnomaly);
    }

    // 3. Margin Collapses
    if (currentFinancials.grossMargin != null && previousFin?.grossMargin != null) {
      const marginDrop = previousFin.grossMargin - currentFinancials.grossMargin;
      if (marginDrop > 0.15) { // >15 percentage point drop
        detected.push({
          symbol, type: 'MarginCollapse', field: 'grossMargin',
          currentValue: currentFinancials.grossMargin, previousValue: previousFin.grossMargin,
          severity: 'medium',
          description: `Gross margin collapsed ${(marginDrop * 100).toFixed(0)}pp from ${(previousFin.grossMargin * 100).toFixed(0)}% to ${(currentFinancials.grossMargin * 100).toFixed(0)}%`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (currentFinancials.operatingMargin != null && previousFin?.operatingMargin != null) {
      const marginDrop = previousFin.operatingMargin - currentFinancials.operatingMargin;
      if (marginDrop > 0.10) {
        detected.push({
          symbol, type: 'MarginCollapse', field: 'operatingMargin',
          currentValue: currentFinancials.operatingMargin, previousValue: previousFin.operatingMargin,
          severity: 'medium',
          description: `Operating margin collapsed ${(marginDrop * 100).toFixed(0)}pp from ${(previousFin.operatingMargin * 100).toFixed(0)}% to ${(currentFinancials.operatingMargin * 100).toFixed(0)}%`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4. Factor Score Spikes (>30 points)
    if (currentFactors && previousFact) {
      const factorFields: Array<[string, number | undefined, number | undefined]> = [
        ['qualityFactor', currentFactors.qualityFactor, previousFact.qualityFactor],
        ['growthFactor', currentFactors.growthFactor, previousFact.growthFactor],
        ['valueFactor', currentFactors.valueFactor, previousFact.valueFactor],
        ['momentumFactor', currentFactors.momentumFactor, previousFact.momentumFactor],
        ['riskFactor', currentFactors.riskFactor, previousFact.riskFactor],
      ];

      for (const [field, current, previous] of factorFields) {
        if (current != null && previous != null && Math.abs(current - previous) > 30) {
          detected.push({
            symbol, type: 'FactorSpike', field,
            currentValue: current, previousValue: previous,
            severity: 'medium',
            description: `${field} jumped ${Math.abs(current - previous).toFixed(0)} points from ${previous} to ${current}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // 5. Zero Volume / Flatline Price
    if (currentPrices) {
      if (currentPrices.volumes && currentPrices.volumes.length >= 5) {
        const recentVolumes = currentPrices.volumes.slice(-5);
        if (recentVolumes.every(v => v === 0)) {
          detected.push({
            symbol, type: 'ZeroVolume', field: 'volume',
            currentValue: 0, previousValue: null,
            severity: 'medium',
            description: '5 consecutive days of zero volume — possible suspension or delisting',
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (currentPrices.closes && currentPrices.closes.length >= 10) {
        const recentCloses = currentPrices.closes.slice(-10);
        const uniquePrices = new Set(recentCloses.map(c => c.toFixed(2)));
        if (uniquePrices.size <= 2) {
          detected.push({
            symbol, type: 'FlatlinePrice', field: 'close',
            currentValue: recentCloses[recentCloses.length - 1], previousValue: null,
            severity: 'low',
            description: `Only ${uniquePrices.size} unique prices in last 10 days — possible illiquidity`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // 6. Cross-Field Consistency Checks
    if (currentFinancials.roe != null && currentFinancials.roa != null &&
        currentFinancials.roe < currentFinancials.roa && (currentFinancials.roa ?? 0) > 0) {
      detected.push({
        symbol, type: 'ConsistencyViolation', field: 'roe_vs_roa',
        currentValue: currentFinancials.roe, previousValue: currentFinancials.roa,
        severity: 'low',
        description: `ROE (${(currentFinancials.roe * 100).toFixed(0)}%) < ROA (${(currentFinancials.roa * 100).toFixed(0)}%) — unusual for leveraged company`,
        timestamp: new Date().toISOString(),
      });
    }

    this.anomalies.push(...detected);
    return detected;
  }

  /**
   * Detect anomalies for a batch of symbols.
   */
  detectBatch(
    entries: Array<{
      symbol: string;
      financials: FinancialSnapshot;
      factors?: FactorSnapshot;
      prices?: PriceSnapshot;
    }>,
  ): Map<string, DetectedAnomaly[]> {
    const results = new Map<string, DetectedAnomaly[]>();
    for (const entry of entries) {
      results.set(entry.symbol, this.detect(entry.symbol, entry.financials, entry.factors, entry.prices));
    }
    return results;
  }

  /**
   * Generate anomaly report.
   */
  generateReport(symbolsScanned: number): AnomalyReport {
    const bySeverity = { low: 0, medium: 0, high: 0 };
    const affectedSet = new Set<string>();

    for (const a of this.anomalies) {
      bySeverity[a.severity]++;
      affectedSet.add(a.symbol);
    }

    return {
      runDate: new Date().toISOString().split('T')[0],
      symbolsScanned,
      totalAnomalies: this.anomalies.length,
      bySeverity,
      affectedSymbols: Array.from(affectedSet),
      anomalies: [...this.anomalies],
    };
  }

  /**
   * Compute anomaly score (weighted: low=1, medium=3, high=10).
   */
  getAnomalyScore(symbol: string): number {
    const weights = { low: 1, medium: 3, high: 10 };
    return this.anomalies
      .filter(a => a.symbol === symbol)
      .reduce((sum, a) => sum + weights[a.severity], 0);
  }

  /**
   * Persist anomalies to DB.
   */
  async persistAnomalies(pool: any): Promise<void> {
    const runDate = new Date().toISOString().split('T')[0];
    for (const a of this.anomalies) {
      try {
        await pool.query(
          `IPSERT INTO data_anomalies (symbol, run_date, anomaly_type, field, current_value, previous_value, severity, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [a.symbol, runDate, a.type, a.field, a.currentValue, a.previousValue, a.severity, a.description]
        );
      } catch (err: any) {
        console.warn(`AnomalyDetection: persist failed for ${a.symbol}: ${err.message}`);
      }
    }
  }

  /**
   * Reset accumulated anomalies.
   */
  reset(): void {
    this.anomalies = [];
  }

  // ── Private Detection ─────────────────────────────────

  private detectPeJump(symbol: string, currentPE: number, previousPE: number): DetectedAnomaly | null {
    if (previousPE === 0) return null;
    const ratio = currentPE / previousPE;
    if (ratio > 3) {
      return {
        symbol, type: 'PE_Jump', field: 'peRatio',
        currentValue: currentPE, previousValue: previousPE,
        severity: 'medium',
        description: `PE surged ${ratio.toFixed(1)}× from ${previousPE.toFixed(1)} → ${currentPE.toFixed(1)}`,
        timestamp: new Date().toISOString(),
      };
    }
    if (ratio < 0.33 && currentPE > 0) {
      return {
        symbol, type: 'PE_Collapse', field: 'peRatio',
        currentValue: currentPE, previousValue: previousPE,
        severity: 'low',
        description: `PE collapsed ${(1 - ratio).toFixed(1)}× from ${previousPE.toFixed(1)} → ${currentPE.toFixed(1)}`,
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }

  private detectRevenueAnomaly(symbol: string, current: number, previous: number): DetectedAnomaly | null {
    if (previous === 0) return null;
    const change = (current - previous) / Math.abs(previous);
    if (Math.abs(change) > 0.50) {
      return {
        symbol, type: 'RevenueAnomaly', field: 'revenue',
        currentValue: current, previousValue: previous,
        severity: change > 2 ? 'high' : 'medium',
        description: `Revenue ${change > 0 ? 'surged' : 'collapsed'} ${(Math.abs(change) * 100).toFixed(0)}% QoQ`,
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }
}

export default AnomalyDetectionEngine;
