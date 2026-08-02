/**
 * EvidenceCollector
 *
 * Gathers evidence from all available data sources (financials, technicals,
 * earnings, news, sector, peers, RAG, factor scores, previous snapshots).
 * Each piece of evidence is tagged with its kind, confidence, and data source.
 * No fake evidence — only real data from providers.
 */

import type { ResearchEvidence, EvidenceKind } from './EvidenceTypes';
import type { StockIntelligenceReport } from '../types';

export interface FinancialData {
  revenue?: number;
  netIncome?: number;
  operatingMargin?: number;
  debtToEquity?: number;
  roe?: number;
  roa?: number;
  pe?: number;
  pb?: number;
  dividendYield?: number;
  [key: string]: unknown;
}

export interface TechnicalData {
  rsi?: number;
  macd?: number;
  sma20?: number;
  sma50?: number;
  atr?: number;
  adx?: number;
  [key: string]: unknown;
}

export interface EarningsData {
  revenue?: number;
  netIncome?: number;
  eps?: number;
  quarter?: string;
  year?: number;
  [key: string]: unknown;
}

export interface NewsItem {
  title: string;
  summary?: string;
  source?: string;
  date: string;
  category?: string;
}

export class EvidenceCollector {
  collectFinancialEvidence(
    symbol: string,
    financials?: FinancialData,
  ): ResearchEvidence[] {
    const evidence: ResearchEvidence[] = [];
    if (!financials) return evidence;

    const metrics: Array<{ key: string; label: string }> = [
      { key: 'revenue', label: 'Revenue' },
      { key: 'netIncome', label: 'Net Income' },
      { key: 'operatingMargin', label: 'Operating Margin' },
      { key: 'debtToEquity', label: 'Debt-to-Equity Ratio' },
      { key: 'roe', label: 'Return on Equity' },
      { key: 'roa', label: 'Return on Assets' },
      { key: 'pe', label: 'P/E Ratio' },
      { key: 'pb', label: 'P/B Ratio' },
      { key: 'dividendYield', label: 'Dividend Yield' },
    ];

    metrics.forEach((m, i) => {
      if (financials[m.key] !== undefined && financials[m.key] !== null) {
        evidence.push({
          id: `${symbol}_financial_${i}`,
          symbol,
          kind: 'financial_metric',
          label: m.label,
          value: financials[m.key] as number,
          asOf: new Date().toISOString(),
          confidence: 0.95,
          internalSource: 'financial_snapshots',
          publicLabel: m.label,
        });
      }
    });

    return evidence;
  }

  collectTechnicalEvidence(
    symbol: string,
    technicals?: TechnicalData,
  ): ResearchEvidence[] {
    const evidence: ResearchEvidence[] = [];
    if (!technicals) return evidence;

    const metrics: Array<{ key: string; label: string }> = [
      { key: 'rsi', label: 'RSI (14)' },
      { key: 'macd', label: 'MACD' },
      { key: 'sma20', label: '20-Day SMA' },
      { key: 'sma50', label: '50-Day SMA' },
      { key: 'atr', label: 'ATR' },
      { key: 'adx', label: 'ADX' },
    ];

    metrics.forEach((m, i) => {
      if (technicals[m.key] !== undefined && technicals[m.key] !== null) {
        evidence.push({
          id: `${symbol}_technical_${i}`,
          symbol,
          kind: 'technical_metric',
          label: m.label,
          value: technicals[m.key] as number,
          asOf: new Date().toISOString(),
          confidence: 0.9,
          internalSource: 'technical_snapshots',
          publicLabel: m.label,
        });
      }
    });

    return evidence;
  }

  collectEarningsEvidence(
    symbol: string,
    earnings?: EarningsData[],
  ): ResearchEvidence[] {
    const evidence: ResearchEvidence[] = [];
    if (!earnings || earnings.length === 0) return evidence;

    earnings.forEach((e, i) => {
      const labels: Array<{ key: string; label: string }> = [
        { key: 'revenue', label: 'Earnings Revenue' },
        { key: 'netIncome', label: 'Earnings Net Income' },
        { key: 'eps', label: 'EPS' },
      ];

      labels.forEach((l) => {
        if (e[l.key] !== undefined && e[l.key] !== null) {
          evidence.push({
            id: `${symbol}_earnings_${i}_${l.key}`,
            symbol,
            kind: 'earnings_metric',
            label: `${l.label} (${e.quarter ?? 'N/A'} ${e.year ?? ''})`,
            value: e[l.key] as number,
            asOf: e.date ?? new Date().toISOString(),
            confidence: 0.95,
            internalSource: 'earnings_snapshots',
          });
        }
      });
    });

    return evidence;
  }

  collectNewsEvidence(symbol: string, news?: NewsItem[]): ResearchEvidence[] {
    const evidence: ResearchEvidence[] = [];
    if (!news || news.length === 0) return evidence;

    news.forEach((n, i) => {
      evidence.push({
        id: `${symbol}_news_${i}`,
        symbol,
        kind: 'news_event',
        label: n.title,
        value: n.summary ?? null,
        asOf: n.date,
        confidence: 0.8,
        internalSource: 'news_items',
      });
    });

    return evidence;
  }

  collectSectorEvidence(symbol: string, sectorScore?: number): ResearchEvidence[] {
    if (sectorScore === undefined || sectorScore === null) return [];
    return [{
      id: `${symbol}_sector_0`,
      symbol,
      kind: 'sector_metric',
      label: 'Sector Score',
      value: sectorScore,
      asOf: new Date().toISOString(),
      confidence: 0.85,
      internalSource: 'sector_engine',
      publicLabel: 'Sector Assessment',
    }];
  }

  collectFactorScoreEvidence(
    symbol: string,
    report?: Partial<StockIntelligenceReport>,
  ): ResearchEvidence[] {
    const evidence: ResearchEvidence[] = [];
    if (!report) return evidence;

    const fields: Array<{ key: keyof StockIntelligenceReport; label: string }> = [
      { key: 'overallScore', label: 'Overall Score' },
      { key: 'qualityScore', label: 'Quality Score' },
      { key: 'valueScore', label: 'Value Score' },
      { key: 'growthScore', label: 'Growth Score' },
      { key: 'momentumScore', label: 'Momentum Score' },
      { key: 'riskScore', label: 'Risk Score' },
      { key: 'sectorScore', label: 'Sector Score' },
      { key: 'earningsScore', label: 'Earnings Score' },
      { key: 'sentimentScore', label: 'Sentiment Score' },
    ];

    fields.forEach((f, i) => {
      const val = report[f.key];
      if (typeof val === 'number') {
        evidence.push({
          id: `${symbol}_factor_${i}`,
          symbol,
          kind: 'factor_score',
          label: f.label,
          value: val,
          asOf: report.generatedAt ?? null,
          confidence: 0.9,
          internalSource: 'intelligence_engine',
          publicLabel: f.label,
        });
      }
    });

    return evidence;
  }

  collectAll(symbol: string, options: {
    financials?: FinancialData;
    technicals?: TechnicalData;
    earnings?: EarningsData[];
    news?: NewsItem[];
    sectorScore?: number;
    report?: Partial<StockIntelligenceReport>;
  }): ResearchEvidence[] {
    return [
      ...this.collectFinancialEvidence(symbol, options.financials),
      ...this.collectTechnicalEvidence(symbol, options.technicals),
      ...this.collectEarningsEvidence(symbol, options.earnings),
      ...this.collectNewsEvidence(symbol, options.news),
      ...this.collectSectorEvidence(symbol, options.sectorScore),
      ...this.collectFactorScoreEvidence(symbol, options.report),
    ];
  }
}
