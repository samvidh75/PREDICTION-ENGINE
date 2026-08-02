export interface ScannerCategory {
  id: string;
  label: string;
  section: "market_segment" | "business_quality" | "opportunity_context" | "risk_review";
  free: boolean;
}

/**
 * Scanner categories used to organise stock research into compliance-safe
 * buckets.  Each category maps to one of four sections so the UI can group
 * related criteria together.
 *
 * NOTE: Keep labels free of any FORBIDDEN_SCANNER_TERMS (buy / sell / hold /
 * recommendation etc.).
 */
export const SCANNER_CATEGORIES: ScannerCategory[] = [
  // ── Market segment ──────────────────────────────────────────────
  {
    id: "large-cap-healthy",
    label: "Large-cap healthy companies",
    section: "market_segment",
    free: true,
  },
  {
    id: "mid-cap-growth",
    label: "Mid-cap growth companies",
    section: "market_segment",
    free: false,
  },
  {
    id: "small-cap-opportunities",
    label: "Small-cap opportunities",
    section: "market_segment",
    free: false,
  },

  // ── Business quality ────────────────────────────────────────────
  {
    id: "quality-leaders",
    label: "Quality leaders",
    section: "business_quality",
    free: true,
  },
  {
    id: "low-debt-leaders",
    label: "Low-debt leaders",
    section: "business_quality",
    free: true,
  },
  {
    id: "high-margin-leaders",
    label: "High-margin leaders",
    section: "business_quality",
    free: false,
  },

  // ── Opportunity context ─────────────────────────────────────────
  {
    id: "value-opportunities",
    label: "Value opportunities",
    section: "opportunity_context",
    free: true,
  },
  {
    id: "growth-opportunities",
    label: "Growth opportunities",
    section: "opportunity_context",
    free: false,
  },
  {
    id: "turnaround-potential",
    label: "Turnaround potential",
    section: "opportunity_context",
    free: false,
  },

  // ── Risk review ─────────────────────────────────────────────────
  {
    id: "high-volatility",
    label: "High volatility companies",
    section: "risk_review",
    free: false,
  },
  {
    id: "debt-risk",
    label: "Companies with elevated debt",
    section: "risk_review",
    free: false,
  },
  {
    id: "low-liquidity",
    label: "Low-liquidity stocks",
    section: "risk_review",
    free: false,
  },
];
