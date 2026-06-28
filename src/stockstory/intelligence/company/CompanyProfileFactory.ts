/**
 * Company Profile Factory
 *
 * Builds a CompanyIntelligenceProfile from existing engine outputs.
 * This bridges the gap between the old 9-engine architecture and the new
 * company intelligence profile — enabling backward compatibility while
 * the deep intelligence pipeline is being built.
 */

import type { IntelligenceInput, StockIntelligenceReport } from '../../types';
import type { IntelligenceSignal } from '../signals/SignalTypes';
import type { CompanyIntelligenceProfile } from './CompanyTypes';
import { evaluateSignal, type SignalEvalInput } from '../signals/SignalScoring';
import { getSignalsByCategory } from '../signals/SignalRegistry';
import { companyProfileBuilder } from './CompanyProfileBuilder';

/**
 * Build a CompanyIntelligenceProfile from an existing engine report + raw input.
 * Uses the signal registry to extract signals from engine outputs.
 */
export function buildFromReport(
  input: IntelligenceInput,
  report: StockIntelligenceReport,
): CompanyIntelligenceProfile {
  // Extract numeric values from input for signal evaluation
  const signalInputs: SignalEvalInput = {
    symbol: input.symbol,
    values: {
      // Financial
      roe: input.financials.roe,
      roic: input.financials.roic,
      roa: input.financials.roa,
      debtToEquity: input.financials.debtToEquity,
      operatingMargin: input.financials.operatingMargin,
      netMargin: input.financials.netMargin,
      grossMargin: input.financials.grossMargin,
      revenueGrowth: input.financials.revenueGrowth,
      profitGrowth: input.financials.profitGrowth,
      epsGrowth: input.financials.epsGrowth,
      peRatio: input.financials.peRatio,
      dividendYield: input.financials.dividendYield,
      marketCap: input.financials.marketCap,
      // Technical
      momentum1m: input.technicals.momentum1m,
      momentum3m: input.technicals.momentum3m,
      momentum6m: input.technicals.momentum6m,
      volatility: input.technicals.volatility,
      beta: input.technicals.beta || input.financials.beta,
      volumeRatio: input.technicals.volumeRatio,
      avgVolume: input.technicals.avgVolume,
      // Sector
      sectorPE: input.sector.sectorPe,
      // Peer (not available yet — use sector as proxy)
      peerROE: input.sector.sectorAvgGrowth ?? null, // temporary
    },
  };

  // Evaluate signals one by one for each category
  const categories = [
    'financial_quality', 'balance_sheet', 'profitability', 'growth',
    'valuation', 'technical_momentum', 'volatility',
    'earnings', 'risk', 'sector_context', 'peer_relative',
    'governance', 'liquidity',
  ];

  for (const category of categories) {
    const templates = getSignalsByCategory(category);
    for (const template of templates) {
      try {
        const signal = evaluateSignal(template, signalInputs);
        signals.push(signal);
      } catch {
        // Skip signals that can't be evaluated with current data
      }
    }
  }

  return companyProfileBuilder.build(input, signals);
}

/**
 * Build a minimal company profile from just the IntelligenceInput.
 * Used when no engine report has been generated yet.
 */
export function buildFromInput(input: IntelligenceInput): CompanyIntelligenceReport {
  const signalInputs: SignalEvalInput = {
    symbol: input.symbol,
    values: {
      roe: input.financials.roe,
      roic: input.financials.roic,
      roa: input.financials.roa,
      debtToEquity: input.financials.debtToEquity,
      operatingMargin: input.financials.operatingMargin,
      netMargin: input.financials.netMargin,
      grossMargin: input.financials.grossMargin,
      revenueGrowth: input.financials.revenueGrowth,
      profitGrowth: input.financials.profitGrowth,
      epsGrowth: input.financials.epsGrowth,
      peRatio: input.financials.peRatio,
      dividendYield: input.financials.dividendYield,
      marketCap: input.financials.marketCap,
      momentum1m: input.technicals.momentum1m,
      momentum3m: input.technicals.momentum3m,
      momentum6m: input.technicals.momentum6m,
      volatility: input.technicals.volatility,
      beta: input.technicals.beta || input.financials.beta,
      volumeRatio: input.technicals.volumeRatio,
      avgVolume: input.technicals.avgVolume,
      sectorPE: input.sector.sectorPe,
      peerROE: input.sector.sectorAvgGrowth ?? null,
    },
  };

  const signals: IntelligenceSignal[] = [];
  const categories = [
    'financial_quality', 'balance_sheet', 'profitability', 'growth',
    'valuation', 'technical_momentum', 'volatility',
    'earnings', 'risk', 'sector_context', 'peer_relative',
    'governance', 'liquidity',
  ];

  for (const category of categories) {
    const templates = getSignalsByCategory(category);
    for (const template of templates) {
      try {
        const signal = evaluateSignal(template, signalInputs);
        signals.push(signal);
      } catch {
        // Silent skip
      }
    }
  }

  return companyProfileBuilder.build(input, signals);
}

// Re-export CompanyIntelligenceProfile as CompanyIntelligenceReport for API
type CompanyIntelligenceReport = CompanyIntelligenceProfile;
