export function getCompanyNameFromTicker(tickerRaw: string): string {
  const t = String(tickerRaw ?? "").toUpperCase().trim();

  const map: Record<string, string> = {
    AC: "AYALA CORP.",
    ALI: "AYALA LAND INC.",
    BDO: "BDO UNIBANK INC.",
    BPI: "BANK OF THE PHILIPPINE ISLANDS",
    GLO: "GLOBE TELECOM INC.",
    JFC: "JOLLIBEE FOODS CORP.",
    JGS: "JG SUMMIT HOLDINGS INC.",
    MBT: "METROPOLITAN BANK & TRUST CO.",
    MER: "MANILA ELECTRIC CO.",
    PGOLD: "PUREGOLD PRICE CLUB INC.",
    SMC: "SAN MIGUEL CORP.",
    SM: "SM INVESTMENTS CORP.",
    SMPH: "SM PRIME HOLDINGS INC.",
    TEL: "PLDT INC.",
    URC: "UNIVERSAL ROBINA CORP.",
    SCC: "SEMIRARA MINING CORP.",
    ACEN: "AC ENERGY CORP.",
    GTCAP: "GT CAPITAL HOLDINGS INC.",
    MWIDE: "MEGAWORLD CORP.",
  };

  if (!t) return "";
  return map[t] ?? t;
}
