export type ScanCategory =
  | "profitability"
  | "revenue_growth"
  | "valuation"
  | "balance_sheet"
  | "momentum"
  | "ownership"
  | "dividends"
  | "risk"
  | "turnaround"
  | "quality";

export interface ScanCatalogueEntry {
  id: string;
  title: string;
  category: ScanCategory;
  description: string;
  whyUseful: string;
  free: boolean;
  filterPreset?: string;
  resultCopy?: string;
}

const SCAN_CATEGORY_LABELS: Record<ScanCategory, string> = {
  profitability: "Profitability",
  revenue_growth: "Revenue growth",
  valuation: "Valuation",
  balance_sheet: "Balance sheet",
  momentum: "Momentum",
  ownership: "Ownership",
  dividends: "Dividends",
  risk: "Risk",
  turnaround: "Turnaround",
  quality: "Quality",
};

export function categoryLabel(cat: ScanCategory): string {
  return SCAN_CATEGORY_LABELS[cat];
}

export const FREE_SCANS: ScanCatalogueEntry[] = [
  {
    id: "high-conviction-large-caps",
    title: "High conviction large caps",
    category: "quality",
    description: "Large-cap companies with strong research scores across quality, growth and financial health.",
    whyUseful: "A starting point for reviewing established businesses with competitive advantages.",
    free: true,
    filterPreset: "Quality compounders",
    resultCopy: "Companies that score well across multiple research dimensions.",
  },
  {
    id: "thesis-improving",
    title: "Thesis improving",
    category: "momentum",
    description: "Companies where research signals are strengthening across quality and momentum dimensions.",
    whyUseful: "Helps identify situations where the investment case may be gaining support.",
    free: true,
    filterPreset: "Improving momentum",
    resultCopy: "Shows improving research context across tracked dimensions.",
  },
  {
    id: "low-debt-leaders",
    title: "Low debt leaders",
    category: "balance_sheet",
    description: "Companies with strong balance sheets and manageable debt levels.",
    whyUseful: "Financial resilience is a foundation for sustainable performance.",
    free: true,
    filterPreset: "Low debt leaders",
    resultCopy: "Companies with lower financial leverage relative to peers.",
  },
  {
    id: "risk-rising",
    title: "Risk rising",
    category: "risk",
    description: "Companies where risk signals have increased in recent assessments.",
    whyUseful: "Early awareness of weakening contexts supports more careful review.",
    free: true,
    filterPreset: "Risk rising",
    resultCopy: "Shows elevated risk markers requiring closer review.",
  },
  {
    id: "watchlist-worthy-movers",
    title: "Watchlist-worthy movers",
    category: "momentum",
    description: "Companies with meaningful recent price movement worth a closer look.",
    whyUseful: "Helps surface names that may deserve a spot on your radar.",
    free: true,
    filterPreset: "Improving momentum",
    resultCopy: "Companies generating notable recent activity worth reviewing.",
  },
];

export const PREMIUM_SCANS: ScanCatalogueEntry[] = [
  {
    id: "increasing-profitability",
    title: "Increasing profitability",
    category: "profitability",
    description: "Companies showing sustained improvement in net margins and operating profitability.",
    whyUseful: "Profitability improvement is one of the most durable quality signals.",
    free: false,
    resultCopy: "Companies with improving margin profiles across recent periods.",
  },
  {
    id: "increasing-revenue",
    title: "Increasing revenue",
    category: "revenue_growth",
    description: "Companies with consistent revenue growth across recent quarters or years.",
    whyUseful: "Top-line growth is a primary indicator of business momentum.",
    free: false,
    resultCopy: "Companies demonstrating sustained revenue expansion.",
  },
  {
    id: "improving-operating-margin",
    title: "Improving operating margin",
    category: "profitability",
    description: "Companies where operating efficiency has improved over recent reporting periods.",
    whyUseful: "Margin expansion often signals pricing power or cost discipline.",
    free: false,
    resultCopy: "Companies with expanding operating margins.",
  },
  {
    id: "strong-roe-roce",
    title: "Strong ROE / ROCE companies",
    category: "quality",
    description: "Companies with consistently high returns on equity and capital employed.",
    whyUseful: "High and sustainable returns on capital are hallmarks of quality businesses.",
    free: false,
    resultCopy: "Companies generating strong returns on invested capital.",
  },
  {
    id: "low-debt-compounders",
    title: "Low debt compounders",
    category: "balance_sheet",
    description: "Companies that combine low leverage with consistent earnings growth.",
    whyUseful: "Low-debt growth companies tend to be more resilient across cycles.",
    free: false,
    resultCopy: "Growth-oriented companies with conservative capital structures.",
  },
  {
    id: "revenue-acceleration",
    title: "Revenue acceleration",
    category: "revenue_growth",
    description: "Companies where revenue growth rate has accelerated in recent quarters.",
    whyUseful: "Acceleration can signal product-market fit, market share gains, or cyclical recovery.",
    free: false,
    resultCopy: "Companies with increasing revenue growth momentum.",
  },
  {
    id: "profit-acceleration",
    title: "Profit acceleration",
    category: "profitability",
    description: "Companies where profit growth is accelerating, indicating improving operational efficiency.",
    whyUseful: "Accelerating profits often precede broader market recognition.",
    free: false,
    resultCopy: "Companies with accelerating bottom-line growth.",
  },
  {
    id: "valuation-becoming-reasonable",
    title: "Valuation becoming reasonable",
    category: "valuation",
    description: "Companies where valuation metrics have moved closer to historical or sector averages.",
    whyUseful: "Better entry points may emerge when valuations correct toward fair levels.",
    free: false,
    resultCopy: "Companies where valuation context has shifted toward more reasonable territory.",
  },
  {
    id: "momentum-with-quality",
    title: "Momentum with quality",
    category: "momentum",
    description: "Companies that combine positive price momentum with solid quality scores.",
    whyUseful: "The combination of momentum and quality often signals durable trends.",
    free: false,
    resultCopy: "Companies where momentum is supported by underlying quality.",
  },
  {
    id: "dividend-stability",
    title: "Dividend stability",
    category: "dividends",
    description: "Companies with a consistent dividend track record and sustainable payout ratios.",
    whyUseful: "Stable dividends can provide income visibility and signal management confidence.",
    free: false,
    resultCopy: "Companies with stable or growing dividend histories.",
  },
  {
    id: "balance-sheet-strength",
    title: "Balance sheet strength",
    category: "balance_sheet",
    description: "Companies with strong liquidity, low leverage, and healthy financial structure.",
    whyUseful: "Financial strength provides resilience during economic uncertainty.",
    free: false,
    resultCopy: "Companies with conservative financial structures and strong liquidity.",
  },
  {
    id: "turnaround-watch",
    title: "Turnaround watch",
    category: "turnaround",
    description: "Companies showing early signs of operational or financial recovery.",
    whyUseful: "Turnarounds can offer asymmetric research opportunities when fundamentals inflect.",
    free: false,
    resultCopy: "Companies where early recovery signals are emerging.",
  },
  {
    id: "promoter-confidence",
    title: "Promoter confidence",
    category: "ownership",
    description: "Companies where promoter or insider ownership has increased in recent periods.",
    whyUseful: "Rising insider ownership can signal management confidence in the outlook.",
    free: false,
    resultCopy: "Companies with increasing promoter or insider ownership.",
  },
  {
    id: "capital-efficiency-leaders",
    title: "Capital efficiency leaders",
    category: "quality",
    description: "Companies generating high returns per unit of capital employed.",
    whyUseful: "Capital-efficient businesses require less investment to grow, improving returns.",
    free: false,
    resultCopy: "Companies with superior capital efficiency metrics.",
  },
  {
    id: "small-midcap-quality",
    title: "Small and midcap quality filter",
    category: "quality",
    description: "Quality-focused screening of the small and mid-cap universe.",
    whyUseful: "Quality filters help identify resilient businesses in less-covered segments.",
    free: false,
    resultCopy: "Small and mid-cap companies passing quality-based screening.",
  },
];

export function getScanById(id: string): ScanCatalogueEntry | undefined {
  return [...FREE_SCANS, ...PREMIUM_SCANS].find((s) => s.id === id);
}

export function getScansByCategory(cat: ScanCategory): ScanCatalogueEntry[] {
  return [...FREE_SCANS, ...PREMIUM_SCANS].filter((s) => s.category === cat);
}

export const ALL_CATEGORIES: ScanCategory[] = [
  "quality",
  "profitability",
  "revenue_growth",
  "valuation",
  "balance_sheet",
  "momentum",
  "ownership",
  "dividends",
  "risk",
  "turnaround",
];
