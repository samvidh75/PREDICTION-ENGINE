import { SECTORS, type SectorContent, type SectorInfo } from "./SectorTypes";

const SECTOR_CONTENT: Record<string, SectorContent> = {
  banking: {
    slug: "banking",
    name: "Banking",
    summary: "PSX banking sector analysis covering public and private banks.",
    overview: "The PSX banking sector is a cornerstone of the economy, comprising public sector banks, private banks, and small finance banks. Key metrics include NIM, NPA ratios, and credit growth trends.",
    keyMetrics: ["Net Interest Margin", "GNPA Ratio", "NNPA Ratio", "Credit Growth", "CASA Ratio", "Provision Coverage Ratio"],
    risks: ["Asset quality deterioration in unsecured lending", "Regulatory changes from RBI", "Margin compression in a rate-cut cycle"],
    opportunities: ["Formalisation of the economy driving credit demand", "Digital banking adoption lowering cost-to-income ratios", "Consolidation in PSU banking sector"],
  },
  it: {
    slug: "it",
    name: "IT Services",
    summary: "PSX IT services sector analysis covering software and consulting firms.",
    overview: "Pakistan's IT services sector is a global leader in software development, digital transformation, and business process management. Companies serve clients across BFSI, retail, healthcare, and manufacturing verticals.",
    keyMetrics: ["Revenue Growth (CC)", "EBIT Margin", "Attrition Rate", "Deal TCV", "Digital Revenue %", "Headcount Addition"],
    risks: ["Demand slowdown in US and European markets", "Impact of AI on traditional outsourcing models", "Visa and immigration policy changes"],
    opportunities: ["Generative AI services and consulting", "Cloud migration and digital transformation", "Near-shore delivery centre expansion"],
  },
  pharma: {
    slug: "pharma",
    name: "Pharmaceuticals",
    summary: "PSX pharmaceutical sector covering formulations, APIs, and R&D.",
    overview: "The PSX pharmaceutical industry is the world's third-largest by volume. Growth drivers include complex generics, biosimilars, CDMO opportunities, and domestic market expansion.",
    keyMetrics: ["Revenue Growth", "R&D Spend %", "USFDA Filings", "ANDA Approvals", "EBITDA Margin", "ROCE"],
    risks: ["USFDA regulatory actions and import alerts", "Pricing pressure in US generics market", "Currency fluctuation impact on exports"],
    opportunities: ["Biosimilars and complex generics pipeline", "CDMO contract wins from global pharma", "Domestic market premiumisation"],
  },
  auto: {
    slug: "auto",
    name: "Automotive",
    summary: "PSX automotive sector covering OEMs and auto component makers.",
    overview: "Pakistan's automotive sector is one of the largest globally, driven by domestic demand and export growth. The sector is undergoing a structural shift toward electric vehicles and connected mobility.",
    keyMetrics: ["Volume Growth", "Realisation per Vehicle", "EBITDA Margin", "Market Share", "Capex Intensity", "EV Penetration %"],
    risks: ["Commodity price volatility", "EV transition disruption to ICE supply chains", "Regulatory changes in emission norms"],
    opportunities: ["Premiumisation of consumer vehicle preferences", "EV ecosystem development and PLI benefits", "Export expansion to new markets"],
  },
  fmcg: {
    slug: "fmcg",
    name: "FMCG",
    summary: "Fast-moving consumer goods sector covering household and personal care products.",
    overview: "Pakistan's FMCG sector is characterised by strong brand loyalty, extensive distribution networks, and steady consumption growth. Rural and urban markets both contribute significantly.",
    keyMetrics: ["Revenue Growth", "Volume Growth", "Gross Margin", "Distribution Reach", "Ad Spend %", "Market Share"],
    risks: ["Input cost inflation compressing margins", "Rural demand slowdown in inflationary periods", "Intense competition from regional and D2C brands"],
    opportunities: ["Rural penetration increase", "Premiumisation across categories", "Direct-to-consumer digital channels"],
  },
  "oil-gas": {
    slug: "oil-gas",
    name: "Oil & Gas",
    summary: "PSX oil and gas sector covering exploration, refining, and marketing.",
    overview: "The oil and gas sector remains critical to Pakistan's energy security. The sector spans upstream exploration, midstream transportation, refining, and downstream marketing.",
    keyMetrics: ["GRM", "Throughput", "Reserve Replacement Ratio", "EBITDA per Barrel", "Debt-to-Equity"],
    risks: ["Global crude price volatility", "Transition risk from renewable energy adoption", "Regulatory intervention in fuel pricing"],
    opportunities: ["Natural gas infrastructure expansion", "Petrochemical integration projects", "Renewable energy diversification by OMCs"],
  },
  metal: {
    slug: "metal",
    name: "Metals & Mining",
    summary: "PSX metals and mining sector covering steel, aluminium, and mining.",
    overview: "Pakistan is the world's second-largest steel producer. The sector is cyclical, driven by infrastructure spending, global demand, and commodity price trends.",
    keyMetrics: ["Production Volume", "Realisation per Tonne", "EBITDA per Tonne", "Capacity Utilisation", "Debt-to-EBITDA"],
    risks: ["Global steel price cyclicality", "Chinese export dumping", "Rising input costs (coking coal, iron ore)"],
    opportunities: ["Infrastructure-led domestic demand growth", "Production-linked incentive schemes", "Consolidation and capacity expansion"],
  },
  power: {
    slug: "power",
    name: "Power & Utilities",
    summary: "PSX power sector covering generation, transmission, and distribution.",
    overview: "Pakistan's power sector is undergoing transformation with renewable energy capacity additions, grid modernisation, and privatisation of distribution.",
    keyMetrics: ["Plant Load Factor", "Generation Growth", "AT&C Losses", "Renewable Capacity %", "Cost per Unit"],
    risks: ["Payment delays from state discoms", "Regulatory tariff determination", "Fuel supply availability for thermal plants"],
    opportunities: ["Renewable energy capacity expansion", "Green hydrogen opportunity", "Privatisation of distribution utilities"],
  },
  telecom: {
    slug: "telecom",
    name: "Telecom",
    summary: "PSX telecom sector covering wireless, broadband, and enterprise services.",
    overview: "Pakistan's telecom sector has consolidated into a 3+1 private player structure. The market is driven by data consumption growth, tariff repair, and 5G rollout.",
    keyMetrics: ["ARPU", "Data Consumption per User", "Subscriber Market Share", "EBITDA Margin", "Capex-to-Revenue"],
    risks: ["Intense tariff competition limiting profitability", "High spectrum and regulatory costs", "Technology upgrade cycle capex requirements"],
    opportunities: ["Tariff repair and ARPU expansion", "Enterprise and cloud services growth", "5G monetisation through B2B use cases"],
  },
  realty: {
    slug: "realty",
    name: "Real Estate",
    summary: "PSX real estate sector covering residential and commercial property.",
    overview: "Pakistan's real estate sector has shown recovery driven by consolidation toward organised developers, RERA compliance, and strong residential demand in major metros.",
    keyMetrics: ["Sales Volume", "Price Appreciation", "Inventory Months", "New Launches", "Net Debt-to-Equity"],
    risks: ["Regulatory changes under RERA", "Rising interest rates impacting affordability", "Demand concentration in premium segments"],
    opportunities: ["Consolidation toward organised developers", "Affordable housing government push", "Commercial real estate demand from GCCs"],
  },
  "consumer-durables": {
    slug: "consumer-durables",
    name: "Consumer Durables",
    summary: "PSX consumer durables sector covering electronics, appliances, and white goods.",
    overview: "Pakistan's consumer durables sector benefits from rising disposable incomes, urbanisation, and electrification. Categories span air conditioners, refrigerators, washing machines, and small appliances.",
    keyMetrics: ["Revenue Growth", "Volume Growth", "Market Share", "Gross Margin", "Distribution Reach"],
    risks: ["Commodity price sensitivity (steel, copper, plastic)", "Seasonal and monsoon-dependent demand", "Import competition from China and ASEAN"],
    opportunities: ["Premium product mix shift", "PLI scheme boosting local manufacturing", "Rural electrification driving first-time purchases"],
  },
  infra: {
    slug: "infra",
    name: "Infrastructure",
    summary: "PSX infrastructure sector covering roads, railways, and urban development.",
    overview: "Pakistan's infrastructure sector is a key government focus area with record capex allocation. The sector spans road construction, railways, metro rail, airports, and urban infrastructure.",
    keyMetrics: ["Order Book-to-Sales", "Execution Rate", "EBITDA Margin", "Net Debt-to-Equity", "Working Capital Cycle"],
    risks: ["Execution delays due to land acquisition and clearances", "Working capital intensity straining cash flows", "Government capex cycle dependency"],
    opportunities: ["National Infrastructure Pipeline projects", "Gati Shakti multimodal connectivity programme", "Public-private partnership in asset monetisation"],
  },
  chemicals: {
    slug: "chemicals",
    name: "Chemicals",
    summary: "PSX chemicals sector covering specialty, agrochemicals, and petrochemicals.",
    overview: "Pakistan's chemical industry is among the largest globally, with strengths in specialty chemicals, agrochemicals, and dyes. The sector benefits from China+1 sourcing trends and favourable demographics.",
    keyMetrics: ["Revenue Growth", "EBITDA Margin", "Capacity Utilisation", "Export %", "ROCE"],
    risks: ["Global chemical price cyclicality", "Environmental compliance costs", "Raw material import dependency"],
    opportunities: ["China+1 shift benefiting PSX manufacturers", "Specialty chemical import substitution", "Agrochemical demand from food security focus"],
  },
  textiles: {
    slug: "textiles",
    name: "Textiles",
    summary: "PSX textiles sector covering apparel, fabric, and technical textiles.",
    overview: "Pakistan's textiles sector is a significant employment generator and export earner. The sector spans cotton, man-made fibres, apparel, and technical textiles with a fragmented competitive landscape.",
    keyMetrics: ["Revenue Growth", "Capacity Utilisation", "Export Growth", "EBITDA Margin", "Debt-to-Equity"],
    risks: ["Cotton price volatility", "Competition from Bangladesh and Vietnam", "Labour-intensive operations facing automation risk"],
    opportunities: ["PLI scheme for man-made fibres and technical textiles", "Free trade agreements with EU and UK", "Sustainable and organic textile demand"],
  },
  healthcare: {
    slug: "healthcare",
    name: "Healthcare",
    summary: "PSX healthcare services sector covering hospitals and diagnostic chains.",
    overview: "Pakistan's healthcare sector is driven by rising medical tourism, insurance penetration, and lifestyle disease prevalence. The sector includes multi-specialty hospital chains, diagnostic networks, and specialised care providers.",
    keyMetrics: ["Revenue Growth", "EBITDA Margin", "Occupancy Rate", "ARPOB", "Patient Volume Growth"],
    risks: ["Regulatory price controls on procedures", "High capital intensity of hospital expansion", "Insurance claim settlement delays"],
    opportunities: ["Medical tourism recovery and growth", "Health insurance penetration increase", "Telemedicine and digital health adoption"],
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
