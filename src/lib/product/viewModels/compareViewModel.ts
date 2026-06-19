import type { CompareViewData, CompareCompanyView } from "../routeDataContracts";

export function buildCompareViewModel(
  companies: CompareCompanyView[],
  comparisons: Array<{ factor: string; values: Array<string | null>; winner: number | null }>
): CompareViewData {
  const nonEmptyComparisons = comparisons.filter(
    (c) => c.values.some((v) => v !== null && v !== "—")
  );

  return {
    companies: companies.slice(0, 3),
    comparisons: nonEmptyComparisons,
    hasEnoughData: companies.length >= 2 && nonEmptyComparisons.length > 0,
  };
}
