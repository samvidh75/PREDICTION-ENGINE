import { SECTORS, type SectorContent, type SectorInfo } from "./SectorTypes";

/**
 * General descriptive context for each PSE sector — qualitative background,
 * not computed data. (The live numbers — sector average % move, breadth —
 * come from api/market-pulse.ts and render on the Dashboard's sector
 * heatmap; this content is the "what is this sector" companion to that.)
 */
const SECTOR_CONTENT: Record<string, SectorContent> = {
  financials: {
    slug: "financials",
    name: "Financials",
    summary: "PSE-listed universal and commercial banks.",
    overview: "The Financials sector on the PSE is made up of the country's largest universal and commercial banks, regulated by the Bangko Sentral ng Pilipinas (BSP). Bank earnings are driven by net interest margins, loan growth, and fee income, with balance sheets directly exposed to BSP policy rate moves and domestic credit demand.",
    keyMetrics: ["Net Interest Margin", "Non-Performing Loan Ratio", "Loan Growth", "CASA Ratio", "Capital Adequacy Ratio", "Return on Equity"],
    risks: ["BSP policy rate changes compressing or expanding margins", "Asset quality deterioration in consumer and SME lending", "Slower loan growth in a high-rate environment"],
    opportunities: ["Rising financial inclusion and digital banking adoption", "Remittance-driven deposit growth", "Consolidation among mid-tier banks"],
  },
  industrial: {
    slug: "industrial",
    name: "Industrial",
    summary: "Power, food & beverage, and diversified industrial companies.",
    overview: "The Industrial sector spans power generation and distribution, food and beverage manufacturing, and other diversified industrial operations. Many constituents are large, capital-intensive businesses with earnings tied to consumer demand, fuel costs, and infrastructure spending.",
    keyMetrics: ["Revenue Growth", "EBITDA Margin", "Capacity Utilization", "Capital Expenditure", "Debt-to-Equity"],
    risks: ["Fuel and input cost volatility", "Regulatory changes affecting power tariffs", "Peso depreciation raising imported input costs"],
    opportunities: ["Growing domestic consumption", "Renewable energy capacity expansion", "Export growth in packaged food products"],
  },
  "holding-firms": {
    slug: "holding-firms",
    name: "Holding Firms",
    summary: "Diversified conglomerates with stakes across multiple industries.",
    overview: "Holding Firms are diversified conglomerates whose value comes from a portfolio of operating subsidiaries spanning property, banking, telecom, power, and consumer businesses. They're often valued on a sum-of-the-parts basis, with their share price reflecting a discount or premium to their underlying holdings.",
    keyMetrics: ["Net Asset Value", "Holding Company Discount", "Dividends Received from Subsidiaries", "Consolidated Revenue Growth"],
    risks: ["Concentration risk if a major subsidiary underperforms", "Holding company discount widening in risk-off periods", "Complexity in valuing diversified conglomerate structures"],
    opportunities: ["Unlocking value through subsidiary listings or spin-offs", "Cross-selling across the group's diversified businesses", "Exposure to multiple growth sectors through one listing"],
  },
  property: {
    slug: "property",
    name: "Property",
    summary: "Real estate developers and REITs listed on the PSE.",
    overview: "The Property sector covers residential and commercial real estate developers as well as REITs. Performance is closely tied to interest rates (which affect both developer financing costs and buyer affordability), office and retail vacancy rates, and overseas Filipino remittance-driven residential demand.",
    keyMetrics: ["Reservation Sales", "Take-up Rate", "Office/Retail Vacancy Rate", "Net Debt-to-Equity", "Dividend Yield (REITs)"],
    risks: ["Rising interest rates reducing buyer affordability and REIT valuations", "Office space demand softening amid hybrid work trends", "Construction cost inflation"],
    opportunities: ["Sustained OFW remittance-driven residential demand", "REIT market maturing with new listings", "Township and mixed-use development growth outside Metro Manila"],
  },
  services: {
    slug: "services",
    name: "Services",
    summary: "Telecommunications, ports, fast food, and retail services.",
    overview: "The Services sector is the most diverse of the six, spanning telecommunications, port and logistics operators, quick-service restaurant chains, and retail. These businesses are generally more domestically-oriented and defensive, with earnings linked to consumer spending and data/logistics volume growth.",
    keyMetrics: ["Revenue Growth", "Same-Store Sales Growth", "EBITDA Margin", "Subscriber/Container Volume Growth", "Store Count"],
    risks: ["Input cost inflation compressing restaurant margins", "Intense price competition in telecom data plans", "Global trade slowdown affecting port throughput"],
    opportunities: ["Continued urbanization and consumer spending growth", "5G and data monetization in telecom", "Store network expansion domestically and overseas"],
  },
  "mining-oil": {
    slug: "mining-oil",
    name: "Mining & Oil",
    summary: "Coal, metals, and energy extraction companies.",
    overview: "The Mining & Oil sector covers coal, nickel, and other metal producers along with energy exploration companies. These are commodity-price-sensitive businesses whose earnings swing with global commodity cycles, and are a smaller, more concentrated part of the PSEi-30 than the other five sectors.",
    keyMetrics: ["Production Volume", "Realized Price per Tonne/Barrel", "EBITDA Margin", "All-in Sustaining Cost", "Reserve Life"],
    risks: ["Global commodity price volatility", "Environmental and permitting regulatory risk", "Currency exposure on export revenue"],
    opportunities: ["Global demand for nickel in EV battery supply chains", "Energy security driving domestic exploration interest", "Cost discipline improving margins in down cycles"],
  },
};

export function getAllSectors(): SectorInfo[] {
  return SECTORS;
}

export function getSectorContent(slug: string): SectorContent | undefined {
  return SECTOR_CONTENT[slug];
}

export function getSectorInfo(slug: string): SectorInfo | undefined {
  return SECTORS.find((s) => s.slug === slug);
}
