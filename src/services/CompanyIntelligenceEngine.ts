// src/services/CompanyIntelligenceEngine.ts
// Production Company Intelligence Engine.
// Generates Business Quality, Growth, Risk, Valuation, and Momentum outlook reports.
//
// TRACK-P2: Added generateReportV2 that validates features/factors before generating,
// returns null when data is unavailable, and flags limitations for partial data.

import { StockFeatureSnapshot } from "./FeatureEngine";
import { StockFactorSnapshot } from "./FactorEngine";
import type { DataCompleteness } from "../shared/data/AnalyticalResponse";

export interface CompanyIntelligenceReport {
  symbol: string;
  businessQuality: "High" | "Medium" | "Low";
  growthOutlook: "Positive" | "Stable" | "Negative";
  riskOutlook: "Low Risk" | "Moderate Risk" | "High Risk";
  valuationOutlook: "Undervalued" | "Fair Value" | "Overvalued";
  momentumOutlook: "Bullish" | "Neutral" | "Bearish";
  overallSummary: string;
}

/** Extended report with limitation flags for V2. */
export interface CompanyIntelligenceReportV2 extends CompanyIntelligenceReport {
  /** Whether this is a partial report (some data missing). */
  isPartial: boolean;
  /** Fields that were missing or neutralized, causing incomplete assessment. */
  limitations: string[];
  /** Completeness score used for this report. */
  completenessScore: number;
}

/**
 * Check whether a factor snapshot has valid data (not all defaults/neutral).
 * A snapshot is considered valid if at least the factorScore is not exactly at
 * the neutral midpoint AND at least one factor deviates from 50.
 */
function isFactorsValid(factors: StockFactorSnapshot): boolean {
  // If factorScore is exactly the neutral 50 and all sub-factors are exactly 50,
  // this is likely a synthetic/default/invalid snapshot.
  const subFactors = [
    factors.qualityFactor,
    factors.valueFactor,
    factors.growthFactor,
    factors.momentumFactor,
    factors.riskFactor,
    factors.sectorStrengthFactor,
  ];

  const allNeutral = subFactors.every((v) => v === 50);
  if (allNeutral && factors.factorScore === 50) {
    return false;
  }

  return true;
}

/**
 * Check whether a feature snapshot has valid data.
 * At minimum, RSI or momentum should be non-null to consider features valid.
 */
function isFeaturesValid(features: StockFeatureSnapshot): boolean {
  // If all key technical indicators are null, features are not valid.
  const hasAnyIndicator =
    features.rsi !== null ||
    features.macd !== null ||
    features.momentum !== null ||
    features.volatility !== null;

  return hasAnyIndicator;
}

/**
 * Determine which fields are missing from the factor snapshot.
 */
function getFactorLimitations(factors: StockFactorSnapshot): string[] {
  const limitations: string[] = [];
  // A factor at exactly 50 with no deviation could be a neutralized default
  if (factors.qualityFactor === 50) limitations.push("qualityFactor");
  if (factors.valueFactor === 50) limitations.push("valueFactor");
  if (factors.growthFactor === 50) limitations.push("growthFactor");
  if (factors.momentumFactor === 50) limitations.push("momentumFactor");
  if (factors.riskFactor === 50) limitations.push("riskFactor");
  if (factors.sectorStrengthFactor === 50) limitations.push("sectorStrengthFactor");
  return limitations;
}

// ---------------------------------------------------------------------------
// CompanyIntelligenceEngine
// ---------------------------------------------------------------------------

export class CompanyIntelligenceEngine {
  /**
   * Generate a company intelligence report.
   *
   * Backward-compatible signature. Does not validate data — generates a report
   * from whatever features/factors are provided. For validated generation, use
   * generateReportV2.
   */
  generateReport(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
  ): CompanyIntelligenceReport {
    // 1. Business Quality
    let businessQuality: "High" | "Medium" | "Low" = "Medium";
    if (factors.qualityFactor >= 65) businessQuality = "High";
    else if (factors.qualityFactor <= 40) businessQuality = "Low";

    // 2. Growth Outlook
    let growthOutlook: "Positive" | "Stable" | "Negative" = "Stable";
    if (factors.growthFactor >= 60) growthOutlook = "Positive";
    else if (factors.growthFactor <= 40) growthOutlook = "Negative";

    // 3. Risk Outlook (Recall: high factor score means higher safety / lower risk)
    let riskOutlook: "Low Risk" | "Moderate Risk" | "High Risk" = "Moderate Risk";
    if (factors.riskFactor >= 60) riskOutlook = "Low Risk";
    else if (factors.riskFactor <= 40) riskOutlook = "High Risk";

    // 4. Valuation Outlook
    let valuationOutlook: "Undervalued" | "Fair Value" | "Overvalued" = "Fair Value";
    if (factors.valueFactor >= 60) valuationOutlook = "Undervalued";
    else if (factors.valueFactor <= 40) valuationOutlook = "Overvalued";

    // 5. Momentum Outlook
    let momentumOutlook: "Bullish" | "Neutral" | "Bearish" = "Neutral";
    if (factors.momentumFactor >= 60) momentumOutlook = "Bullish";
    else if (factors.momentumFactor <= 40) momentumOutlook = "Bearish";

    const overallSummary =
      `${symbol} presents a ${businessQuality.toLowerCase()} business quality rating with an ` +
      `undervalued/expensive outlook of ${valuationOutlook.toLowerCase()}. Momentum signals are currently ` +
      `${momentumOutlook.toLowerCase()} alongside a ${riskOutlook.toLowerCase()} risk profile.`;

    return {
      symbol,
      businessQuality,
      growthOutlook,
      riskOutlook,
      valuationOutlook,
      momentumOutlook,
      overallSummary,
    };
  }

  /**
   * TRACK-P2: Validated report generation.
   *
   * Rules:
   * 1. Only generates a report when features AND factors are valid (not null/default).
   * 2. Returns null when data is unavailable (instead of fabricating).
   * 3. When partial data: returns report with limitation flags.
   *
   * @param symbol       Stock symbol
   * @param features     Feature snapshot
   * @param factors      Factor snapshot
   * @param completeness Data completeness assessment (optional — used to enrich limitations)
   * @returns A report with limitation flags, or null if data is unavailable.
   */
  generateReportV2(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot,
    completeness?: DataCompleteness,
  ): CompanyIntelligenceReportV2 | null {
    const featuresValid = isFeaturesValid(features);
    const factorsValid = isFactorsValid(factors);

    // If both features and factors are invalid/unavailable, return null.
    // Do not fabricate a report from default/neutral values.
    if (!featuresValid && !factorsValid) {
      return null;
    }

    const limitations: string[] = [];

    // Collect factor limitations
    if (!factorsValid) {
      limitations.push(...getFactorLimitations(factors));
    }

    // Collect feature limitations (null indicators)
    if (features.rsi === null) limitations.push("rsi");
    if (features.macd === null) limitations.push("macd");
    if (features.adx === null) limitations.push("adx");
    if (features.atr === null) limitations.push("atr");
    if (features.momentum === null) limitations.push("momentum");
    if (features.volatility === null) limitations.push("volatility");
    if (features.trendStrength === null) limitations.push("trendStrength");

    // Also incorporate completeness info if provided
    if (completeness) {
      for (const field of completeness.missingFields) {
        if (!limitations.includes(field)) {
          limitations.push(field);
        }
      }
      for (const field of completeness.neutralizedFields) {
        if (!limitations.includes(field)) {
          limitations.push(field);
        }
      }
    }

    const isPartial = !featuresValid || !factorsValid || limitations.length > 0;

    // Generate the base report
    const base = this.generateReport(symbol, features, factors);

    // Compute completeness score
    const completenessScore = completeness?.score ?? (isPartial ? 50 : 100);

    // If partial, modify the overall summary to include limitation note
    let overallSummary = base.overallSummary;
    if (isPartial && limitations.length > 0) {
      overallSummary =
        `[LIMITED DATA] ${base.overallSummary} ` +
        `Note: This assessment is based on partial data. Limited or missing: ${limitations.join(", ")}.`;
    }

    return {
      symbol: base.symbol,
      businessQuality: base.businessQuality,
      growthOutlook: base.growthOutlook,
      riskOutlook: base.riskOutlook,
      valuationOutlook: base.valuationOutlook,
      momentumOutlook: base.momentumOutlook,
      overallSummary,
      isPartial,
      limitations,
      completenessScore,
    };
  }
}

export const companyIntelligenceEngine = new CompanyIntelligenceEngine();
export default companyIntelligenceEngine;