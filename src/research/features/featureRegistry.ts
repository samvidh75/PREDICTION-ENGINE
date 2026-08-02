export interface FeatureDefinition {
  id: string;
  family: FeatureFamily;
  label: string;
  requiredInputs: string[];
  minInputs: number;
}

export type FeatureFamily = "quality" | "valuation" | "growth" | "risk" | "momentum" | "stability";

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { id: "roe", family: "quality", label: "Return on Equity", requiredInputs: ["roe"], minInputs: 1 },
  { id: "roa", family: "quality", label: "Return on Assets", requiredInputs: ["roa"], minInputs: 1 },
  { id: "roic", family: "quality", label: "Return on Invested Capital", requiredInputs: ["roic"], minInputs: 1 },
  { id: "grossMargin", family: "quality", label: "Gross Margin", requiredInputs: ["grossMargin"], minInputs: 1 },
  { id: "operatingMargin", family: "quality", label: "Operating Margin", requiredInputs: ["operatingMargin"], minInputs: 1 },
  { id: "netMargin", family: "quality", label: "Net Margin", requiredInputs: ["netMargin"], minInputs: 1 },
  { id: "debtToEquity", family: "quality", label: "Debt to Equity", requiredInputs: ["debtToEquity"], minInputs: 1 },
  { id: "currentRatio", family: "quality", label: "Current Ratio", requiredInputs: ["currentRatio"], minInputs: 1 },

  { id: "peRatio", family: "valuation", label: "P/E Ratio", requiredInputs: ["peRatio"], minInputs: 1 },
  { id: "pbRatio", family: "valuation", label: "P/B Ratio", requiredInputs: ["pbRatio"], minInputs: 1 },
  { id: "evEbitda", family: "valuation", label: "EV/EBITDA", requiredInputs: ["evEbitda"], minInputs: 1 },
  { id: "dividendYield", family: "valuation", label: "Dividend Yield", requiredInputs: ["dividendYield"], minInputs: 1 },
  { id: "marketCap", family: "valuation", label: "Market Cap", requiredInputs: ["marketCap"], minInputs: 1 },

  { id: "revenueGrowth", family: "growth", label: "Revenue Growth", requiredInputs: ["revenueGrowth"], minInputs: 1 },
  { id: "profitGrowth", family: "growth", label: "Profit Growth", requiredInputs: ["profitGrowth"], minInputs: 1 },
  { id: "epsGrowth", family: "growth", label: "EPS Growth", requiredInputs: ["epsGrowth"], minInputs: 1 },

  { id: "leverage", family: "risk", label: "Leverage", requiredInputs: ["debtToEquity"], minInputs: 1 },
  { id: "volatility", family: "risk", label: "Volatility", requiredInputs: ["beta"], minInputs: 1 },
  { id: "negativeEarnings", family: "risk", label: "Negative Earnings", requiredInputs: ["netProfit", "eps"], minInputs: 1 },

  { id: "priceTrend", family: "momentum", label: "Price Trend", requiredInputs: ["closePrices"], minInputs: 5 },
  { id: "relativeStrength", family: "momentum", label: "Relative Strength", requiredInputs: ["relativeStrength"], minInputs: 1 },

  { id: "scoreVariability", family: "stability", label: "Score Variability", requiredInputs: ["qualityScore", "growthScore"], minInputs: 2 },
  { id: "earningsVariability", family: "stability", label: "Earnings Variability", requiredInputs: ["profitGrowth", "revenueGrowth"], minInputs: 1 },
];

export function getFeaturesByFamily(family: FeatureFamily): FeatureDefinition[] {
  return FEATURE_DEFINITIONS.filter(f => f.family === family);
}

export function getFeatureIds(): string[] {
  return FEATURE_DEFINITIONS.map(f => f.id);
}
