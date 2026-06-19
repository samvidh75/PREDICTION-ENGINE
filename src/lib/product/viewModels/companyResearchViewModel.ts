import type { CompanyResearchViewData } from "../routeDataContracts";

export function buildCompanyResearchViewModel(
  symbol: string,
  companyName: string,
  sector: string,
  research: { score: number | null; financialGroups: unknown[] } | null,
  isTracked: boolean
): CompanyResearchViewData {
  const hasScore = research?.score !== null && research?.score !== undefined;
  const hasFinancials = (research?.financialGroups?.length ?? 0) > 0;
  const hasEnoughData = hasScore || hasFinancials;

  return {
    symbol,
    companyName: companyName || symbol,
    sector: sector || "",
    research: research as CompanyResearchViewData["research"],
    isTracked,
    hasEnoughData,
    state: !symbol ? "empty" : hasEnoughData ? "ready" : "partial",
  };
}
