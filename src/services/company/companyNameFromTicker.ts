export function getCompanyNameFromTicker(tickerRaw: string): string {
  const t = String(tickerRaw ?? "").toUpperCase().trim();

  const map: Record<string, string> = {
    TTM: "TATA MOTORS",
    INFY: "INFOSYS",
    TCS: "TATA CONSULTANCY SERVICES",
    RELIANCE: "RELIANCE",
    HDFCBANK: "HDFC BANK",
    GRANULES: "GRANULES INDIA",
    SUZLON: "SUZLON",
    CHENNAPETRO: "CHENNAI PETRO",
  };

  if (!t) return "";
  return map[t] ?? t;
}
