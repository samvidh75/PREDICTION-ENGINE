import { fMarketCap } from "../../lib/format";

const COMPANY_PROFILES: Record<string, {
  description: string;
  founded: string;
  ceo: string;
  hq: string;
  employees: number;
  website: string;
  isin: string;
  segments: string[];
}> = {
  TCS: {
    description: "Tata Consultancy Services (TCS) is an Indian multinational information technology (IT) services, consulting, and business solutions company. Headquartered in Mumbai, it is a subsidiary of the Tata Group and operates in 150+ locations across 46 countries. TCS is the largest IT services company in India by market capitalization and revenue.",
    founded: "1968",
    ceo: "K. Krithivasan",
    hq: "Mumbai, Maharashtra",
    employees: 616171,
    website: "https://www.tcs.com",
    isin: "INE467B01029",
    segments: ["Banking, Financial Services & Insurance", "Retail & CPG", "Communication, Media & Technology", "Manufacturing", "Life Sciences & Healthcare"],
  },
  RELIANCE: {
    description: "Reliance Industries Limited (RIL) is an Indian multinational conglomerate holding company, headquartered in Mumbai. Its businesses include energy, petrochemicals, textiles, natural gas, retail, and telecommunications (Jio).",
    founded: "1966",
    ceo: "Mukesh D. Ambani",
    hq: "Mumbai, Maharashtra",
    employees: 389414,
    website: "https://www.ril.com",
    isin: "INE002A01018",
    segments: ["Oil & Gas", "Refining & Marketing", "Petrochemicals", "Telecom (Jio)", "Retail"],
  },
  HDFCBANK: {
    description: "HDFC Bank Limited is an Indian banking and financial services company headquartered in Mumbai. It is India's largest private sector bank by assets and market capitalization.",
    founded: "1994",
    ceo: "Sashidhar Jagdishan",
    hq: "Mumbai, Maharashtra",
    employees: 177000,
    website: "https://www.hdfcbank.com",
    isin: "INE040A01034",
    segments: ["Retail Banking", "Corporate Banking", "Treasury", "Wealth Management"],
  },
  INFY: {
    description: "Infosys Limited is an Indian multinational information technology company that provides business consulting, information technology, and outsourcing services.",
    founded: "1981",
    ceo: "Salil Parekh",
    hq: "Bengaluru, Karnataka",
    employees: 336294,
    website: "https://www.infosys.com",
    isin: "INE009A01021",
    segments: ["Financial Services", "Retail", "Communication", "Energy & Utilities", "Manufacturing"],
  },
  ICICIBANK: {
    description: "ICICI Bank Limited is an Indian private sector bank headquartered in Mumbai. It offers a wide range of banking products and financial services to corporate and retail customers.",
    founded: "1994",
    ceo: "Sandeep Bakhshi",
    hq: "Mumbai, Maharashtra",
    employees: 130000,
    website: "https://www.icicibank.com",
    isin: "INE090A01021",
    segments: ["Retail Banking", "Corporate Banking", "Treasury", "Insurance"],
  },
};

interface CompanyInfoProps {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  exchange: string;
  marketCap: number | null;
}

export default function CompanyInfo({
  symbol, companyName, sector, industry, description, exchange, marketCap,
}: CompanyInfoProps) {
  const profile = COMPANY_PROFILES[symbol.toUpperCase()];

  const effectiveDescription = profile?.description || description || '';
  const desc = effectiveDescription
    ? `${effectiveDescription} ${companyName} operates in the ${sector?.toLowerCase() || "Indian"} sector with a diversified business model and established market presence.`
    : `${companyName} is a leading player in the ${sector?.toLowerCase() || "Indian"} sector with a diversified business model and established market presence.`;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)", padding: 24,
    }}>
      <div style={{
        fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16,
      }}>
        About {companyName}
      </div>

      <p style={{ fontSize: "var(--sz-base)", color: "var(--text-500)", lineHeight: 1.7, marginBottom: 20 }}>
        {desc}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Founded", value: profile?.founded || "\u2014" },
          { label: "CEO", value: profile?.ceo || "\u2014" },
          { label: "Headquarters", value: profile?.hq || "\u2014" },
          { label: "Employees", value: profile?.employees ? profile.employees.toLocaleString("en-IN") : "\u2014" },
          { label: "Website", value: profile?.website
            ? <a href={profile.website} target="_blank" rel="noopener" style={{ color: "var(--brand)", fontSize: "var(--sz-sm)" }}>{new URL(profile.website).hostname}</a>
            : "\u2014" },
          { label: "Exchange", value: exchange },
          { label: "ISIN", value: profile?.isin || "\u2014" },
          { label: "Sector", value: sector || "\u2014" },
          { label: "Industry", value: industry || "\u2014" },
        ].map((f, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              fontSize: "var(--sz-xs)", color: "var(--text-300)", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {f.label}
            </div>
            <div style={{ fontSize: "var(--sz-sm)", fontWeight: 600, color: "var(--text-900)" }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {profile?.segments && (
        <div>
          <div style={{
            fontSize: "var(--sz-xs)", color: "var(--text-300)", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
          }}>
            Business Segments
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.segments.map((seg, i) => (
              <span key={i} style={{
                fontSize: "var(--sz-sm)", fontWeight: 500, color: "var(--text-500)",
                padding: "4px 12px", borderRadius: "var(--r-pill)",
                background: "var(--chip)",
              }}>
                {seg}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
