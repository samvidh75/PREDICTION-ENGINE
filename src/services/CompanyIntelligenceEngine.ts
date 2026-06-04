// src/services/CompanyIntelligenceEngine.ts
// Production Company Intelligence Engine.
// Generates Business Quality, Growth, Risk, Valuation, and Momentum outlook reports.

import { StockFeatureSnapshot } from "./FeatureEngine";
import { StockFactorSnapshot } from "./FactorEngine";

export interface CompanyIntelligenceReport {
  symbol: string;
  businessQuality: "High" | "Medium" | "Low";
  growthOutlook: "Positive" | "Stable" | "Negative";
  riskOutlook: "Low Risk" | "Moderate Risk" | "High Risk";
  valuationOutlook: "Undervalued" | "Fair Value" | "Overvalued";
  momentumOutlook: "Bullish" | "Neutral" | "Bearish";
  overallSummary: string;
}

export class CompanyIntelligenceEngine {
  generateReport(
    symbol: string,
    features: StockFeatureSnapshot,
    factors: StockFactorSnapshot
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
}

export const companyIntelligenceEngine = new CompanyIntelligenceEngine();
export default companyIntelligenceEngine;
