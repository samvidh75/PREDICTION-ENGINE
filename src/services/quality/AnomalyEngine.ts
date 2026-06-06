import type { EngineInputs } from '../../stockstory/types';

export interface RankingPoint {
  tradeDate: string;
  healthScore: number;
}

export interface AnomalySignal {
  code: 'pe_spike' | 'revenue_collapse' | 'margin_collapse' | 'ranking_instability';
  severity: 'warning' | 'critical';
  message: string;
}

export class AnomalyEngine {
  evaluate(inputs: EngineInputs, rankingHistory: RankingPoint[] = []): AnomalySignal[] {
    const signals: AnomalySignal[] = [];
    const pe = inputs.financials.peRatio;
    if (pe !== null && Number.isFinite(pe) && pe > 120) {
      signals.push({ code: 'pe_spike', severity: pe > 200 ? 'critical' : 'warning', message: `PE ratio is elevated at ${pe.toFixed(2)}` });
    }

    const revenueGrowth = inputs.financials.revenueGrowth;
    if (revenueGrowth !== null && Number.isFinite(revenueGrowth) && revenueGrowth <= -0.25) {
      signals.push({ code: 'revenue_collapse', severity: revenueGrowth <= -0.5 ? 'critical' : 'warning', message: `Revenue growth has fallen to ${(revenueGrowth * 100).toFixed(1)}%` });
    }

    const operatingMargin = inputs.financials.operatingMargin;
    if (operatingMargin !== null && Number.isFinite(operatingMargin) && operatingMargin <= 0.02) {
      signals.push({ code: 'margin_collapse', severity: operatingMargin < 0 ? 'critical' : 'warning', message: `Operating margin is compressed at ${(operatingMargin * 100).toFixed(1)}%` });
    }

    if (rankingHistory.length >= 5) {
      const scores = rankingHistory.slice(-5).map(point => point.healthScore).filter(Number.isFinite);
      if (scores.length >= 5) {
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const spread = max - min;
        if (spread >= 20) signals.push({ code: 'ranking_instability', severity: spread >= 35 ? 'critical' : 'warning', message: `Health score moved ${spread.toFixed(0)} points across the latest observations` });
      }
    }

    return signals;
  }
}

export default AnomalyEngine;
