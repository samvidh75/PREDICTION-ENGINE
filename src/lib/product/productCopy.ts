export const PRODUCT_COPY = {
  loading: "Loading...",
  empty: "Not enough information for this view yet.",
  partial: "Partial research context",
  error: "Research signals are being prepared.",
  search: "Search for a company to begin research.",
  scanner: "Open the scanner to discover research candidates.",
  track: "Track companies to review important changes.",
  compare: "Add at least two companies to see a side-by-side comparison.",
  watchlist: "Track companies you are researching.",
  portfolio: "Track companies to monitor whether the thesis still holds.",
  alerts: "Track a company to review important changes.",
  noResults: "No results match your current filters.",
  noData: "Research context is based on available data.",
  methodology: "Research is not a guarantee. Understand our methodology.",
  invest: "Review before investing.",
  continueBroker: "Continue with broker",
  trackInstead: "Track instead",
  compareFirst: "Compare first",
} as const;

export type ProductCopyKey = keyof typeof PRODUCT_COPY;

export function productCopy(key: ProductCopyKey): string {
  return PRODUCT_COPY[key];
}
