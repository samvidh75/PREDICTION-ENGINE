import type { ScannerViewData, ScannerResultViewItem } from "../routeDataContracts";

export function buildScannerViewModel(
  query: string,
  results: ScannerResultViewItem[],
  loading: boolean,
  activePreset: string
): ScannerViewData {
  const hasData = results.length > 0;
  return {
    query,
    results: results.map((r) => ({
      symbol: r.symbol,
      companyName: r.companyName || "",
      sector: r.sector || "",
      score: typeof r.score === "number" && Number.isFinite(r.score) ? Math.round(r.score) : null,
      rank: r.rank,
      conviction: r.conviction || "",
      keyReason: r.keyReason || "",
      riskMarker: r.riskMarker || "",
      hasRealData: !!(r.symbol && (r.score !== null || r.companyName)),
    })),
    loading,
    totalCount: results.length,
    activePreset,
    hasData: results.length > 0,
  };
}
