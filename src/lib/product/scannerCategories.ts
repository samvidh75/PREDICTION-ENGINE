export type ScannerCategory =
  | "large_cap_health"
  | "mid_cap_health"
  | "small_cap_health"
  | "quality_leaders"
  | "low_debt_leaders"
  | "profitability_leaders"
  | "financial_strength"
  | "valuation_comfort"
  | "momentum_improving"
  | "dividend_stability"
  | "risk_rising"
  | "good_business_out_of_favour";

export interface ScannerCategoryConfig {
  id: ScannerCategory;
  label: string;
  section: "market_segment" | "business_quality" | "opportunity_context" | "risk_review";
  description: string;
  criteria: string;
  free: boolean;
  filterPreset?: string;
}

export const SCANNER_CATEGORIES: ScannerCategoryConfig[] = [
  {
    id: "large_cap_health",
    label: "Large-cap healthy companies",
    section: "market_segment",
    description: "Established large-cap companies with strong health, quality scores, and reasonable risk.",
    criteria: "Large-cap segment, high Healthometer/quality score, reasonable risk, sufficient data.",
    free: true,
    filterPreset: "High conviction large caps",
  },
  {
    id: "mid_cap_health",
    label: "Mid-cap healthy companies",
    section: "market_segment",
    description: "Mid-cap companies combining quality and financial strength with manageable risk.",
    criteria: "Mid-cap segment, high quality and financial strength, risk not elevated.",
    free: false,
    filterPreset: "Small and midcap quality filter",
  },
  {
    id: "small_cap_health",
    label: "Small-cap healthy companies",
    section: "market_segment",
    description: "Small-cap companies with sufficient data, profitability emphasis, and conservative risk profile.",
    criteria: "Small-cap segment, enough data, risk not extreme, profitability/low-debt emphasis.",
    free: false,
    filterPreset: "Small and midcap quality filter",
  },
  {
    id: "quality_leaders",
    label: "Quality leaders",
    section: "business_quality",
    description: "Companies with superior business quality, competitive advantages, and consistent performance.",
    criteria: "High quality scores, strong ROE/ROCE, sustainable margins.",
    free: true,
    filterPreset: "Quality compounders",
  },
  {
    id: "low_debt_leaders",
    label: "Low-debt leaders",
    section: "business_quality",
    description: "Companies with strong balance sheets and minimal financial leverage.",
    criteria: "Low debt-to-equity, strong liquidity, healthy financial structure.",
    free: true,
    filterPreset: "Low debt leaders",
  },
  {
    id: "profitability_leaders",
    label: "Profitability leaders",
    section: "business_quality",
    description: "Companies with expanding margins and strong return on capital.",
    criteria: "Improving operating margins, strong ROE/ROCE, profit acceleration.",
    free: false,
    filterPreset: "Increasing profitability",
  },
  {
    id: "financial_strength",
    label: "Financial strength",
    section: "business_quality",
    description: "Companies with conservative capital structures, strong liquidity, and financial resilience.",
    criteria: "Balance sheet strength, low leverage, healthy cash flows.",
    free: false,
    filterPreset: "Balance sheet strength",
  },
  {
    id: "valuation_comfort",
    label: "Valuation comfort",
    section: "opportunity_context",
    description: "Companies where valuation has moved closer to reasonable levels relative to history or sector.",
    criteria: "Valuation metrics near or below historical/sector averages with stable quality.",
    free: true,
    filterPreset: "Undervalued quality",
  },
  {
    id: "momentum_improving",
    label: "Momentum improving",
    section: "opportunity_context",
    description: "Companies with strengthening research signals and improving momentum context.",
    criteria: "Positive momentum trends supported by quality or value context.",
    free: true,
    filterPreset: "Improving momentum",
  },
  {
    id: "dividend_stability",
    label: "Dividend stability",
    section: "opportunity_context",
    description: "Companies with consistent dividend track records and sustainable payout ratios.",
    criteria: "Stable or growing dividends, sustainable payout, healthy cash flows.",
    free: false,
    filterPreset: "Dividend stability",
  },
  {
    id: "good_business_out_of_favour",
    label: "Good businesses out of favour",
    section: "opportunity_context",
    description: "Quality businesses trading at more reasonable valuations due to temporary headwinds.",
    criteria: "High quality scores with reasonable or improving value context.",
    free: false,
    filterPreset: "Good businesses out of favour",
  },
  {
    id: "risk_rising",
    label: "Risk rising",
    section: "risk_review",
    description: "Companies where risk signals have increased, warranting closer review.",
    criteria: "Elevated risk markers, weakening financial or operational context.",
    free: true,
    filterPreset: "Risk rising",
  },
];

export function getCategoryById(id: ScannerCategory): ScannerCategoryConfig | undefined {
  return SCANNER_CATEGORIES.find((c) => c.id === id);
}

export function getCategoriesBySection(
  section: ScannerCategoryConfig["section"]
): ScannerCategoryConfig[] {
  return SCANNER_CATEGORIES.filter((c) => c.section === section);
}

export const CATEGORY_SECTIONS: { id: string; label: string }[] = [
  { id: "market_segment", label: "Market segment" },
  { id: "business_quality", label: "Business quality" },
  { id: "opportunity_context", label: "Opportunity context" },
  { id: "risk_review", label: "Risk review" },
];
