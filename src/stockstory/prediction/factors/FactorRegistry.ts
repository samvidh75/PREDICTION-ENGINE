import type { FactorDefinition } from "./FactorTypes";
import { PROFITABILITY_MARGINS_FACTORS } from "./categories/profitability_and_margins";
import { GROWTH_QUALITY_FACTORS } from "./categories/growth_quality";
import { BALANCE_SHEET_SOLVENCY_FACTORS } from "./categories/balance_sheet_and_solvency";
import { CASH_FLOW_QUALITY_FACTORS } from "./categories/cash_flow_quality";
import { VALUATION_CONTEXT_FACTORS } from "./categories/valuation_context";
import { PRICE_MOMENTUM_TREND_FACTORS } from "./categories/price_momentum_and_trend";
import { VOLATILITY_RISK_FACTORS } from "./categories/volatility_and_risk";
import { LIQUIDITY_MARKET_QUALITY_FACTORS } from "./categories/liquidity_and_market_quality";
import { CAPITAL_ALLOCATION_DIVIDEND_FACTORS } from "./categories/capital_allocation_and_dividend";
import { SECTOR_PEER_RELATIVE_FACTORS } from "./categories/sector_and_peer_relative";
import { DATA_QUALITY_CONFIDENCE_FACTORS } from "./categories/data_quality_and_confidence";

export const FACTOR_REGISTRY: FactorDefinition[] = [
  ...PROFITABILITY_MARGINS_FACTORS,
  ...GROWTH_QUALITY_FACTORS,
  ...BALANCE_SHEET_SOLVENCY_FACTORS,
  ...CASH_FLOW_QUALITY_FACTORS,
  ...VALUATION_CONTEXT_FACTORS,
  ...PRICE_MOMENTUM_TREND_FACTORS,
  ...VOLATILITY_RISK_FACTORS,
  ...LIQUIDITY_MARKET_QUALITY_FACTORS,
  ...CAPITAL_ALLOCATION_DIVIDEND_FACTORS,
  ...SECTOR_PEER_RELATIVE_FACTORS,
  ...DATA_QUALITY_CONFIDENCE_FACTORS,
];

export function getFactorById(id: string): FactorDefinition | undefined {
  return FACTOR_REGISTRY.find((f) => f.id === id);
}

export function getActiveFactors(): FactorDefinition[] {
  return FACTOR_REGISTRY.filter((f) => f.status === "active");
}

export function getFactorsByDimension(dimension: string): FactorDefinition[] {
  return FACTOR_REGISTRY.filter((f) => f.dimension === dimension);
}

export function getFactorsByCategory(category: string): FactorDefinition[] {
  return FACTOR_REGISTRY.filter((f) => f.category === category);
}

export function getDisplayableFactors(): FactorDefinition[] {
  return FACTOR_REGISTRY.filter((f) => f.displayable);
}

export function getActiveFactorCount(): number {
  return getActiveFactors().length;
}

export function getCategoryCounts(): Record<string, { total: number; active: number }> {
  const counts: Record<string, { total: number; active: number }> = {};
  for (const f of FACTOR_REGISTRY) {
    if (!counts[f.category]) counts[f.category] = { total: 0, active: 0 };
    counts[f.category].total++;
    if (f.status === "active") counts[f.category].active++;
  }
  return counts;
}

export function getDimensionCounts(): Record<string, { total: number; active: number }> {
  const counts: Record<string, { total: number; active: number }> = {};
  for (const f of FACTOR_REGISTRY) {
    if (!counts[f.dimension]) counts[f.dimension] = { total: 0, active: 0 };
    counts[f.dimension].total++;
    if (f.status === "active") counts[f.dimension].active++;
  }
  return counts;
}
