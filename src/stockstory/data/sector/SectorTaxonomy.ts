/**
 * Sector Taxonomy
 *
 * Canonical sector/industry taxonomy aligned with NSE/BSE classification.
 * Provides static mappings and lookup methods for industry categories.
 */

export interface SectorDefinition {
  id: string;
  name: string;
  description: string;
}

export interface IndustryDefinition {
  id: string;
  name: string;
  sectorId: string;
  description: string;
}

const SECTORS: SectorDefinition[] = [
  { id: 'automobile', name: 'Automobile', description: 'Automobile and auto component manufacturers' },
  { id: 'banking', name: 'Banking', description: 'Banking and financial institutions' },
  { id: 'capital_goods', name: 'Capital Goods', description: 'Industrial machinery, equipment and engineering' },
  { id: 'chemicals', name: 'Chemicals', description: 'Chemical manufacturing and specialty chemicals' },
  { id: 'construction', name: 'Construction', description: 'Construction, engineering and infrastructure' },
  { id: 'consumer_durables', name: 'Consumer Durables', description: 'Consumer durable goods and appliances' },
  { id: 'consumer_non_durables', name: 'Consumer Non-Durables', description: 'FMCG and consumer staples' },
  { id: 'energy', name: 'Energy', description: 'Oil, gas, power and renewable energy' },
  { id: 'financial_services', name: 'Financial Services', description: 'NBFCs, insurance, asset management and other financial services' },
  { id: 'healthcare', name: 'Healthcare', description: 'Pharmaceuticals, hospitals and healthcare services' },
  { id: 'information_technology', name: 'Information Technology', description: 'IT services, software and technology' },
  { id: 'media', name: 'Media & Entertainment', description: 'Media, broadcasting and entertainment' },
  { id: 'metals', name: 'Metals & Mining', description: 'Metals, mining and mineral products' },
  { id: 'real_estate', name: 'Real Estate', description: 'Real estate development and REITs' },
  { id: 'telecom', name: 'Telecommunications', description: 'Telecom services and infrastructure' },
  { id: 'textiles', name: 'Textiles', description: 'Textile manufacturing and apparel' },
  { id: 'transportation', name: 'Transportation', description: 'Logistics, shipping and transportation services' },
  { id: 'other', name: 'Other', description: 'Other sectors not covered above' },
];

const INDUSTRIES: IndustryDefinition[] = [
  // Automobile
  { id: 'auto_2_3_wheelers', name: '2 & 3 Wheelers', sectorId: 'automobile', description: 'Two and three wheeler manufacturers' },
  { id: 'auto_4_wheelers', name: '4 Wheelers', sectorId: 'automobile', description: 'Passenger car and SUV manufacturers' },
  { id: 'auto_commercial', name: 'Commercial Vehicles', sectorId: 'automobile', description: 'Commercial vehicle manufacturers' },
  { id: 'auto_components', name: 'Auto Components', sectorId: 'automobile', description: 'Auto parts and component manufacturers' },

  // Banking
  { id: 'banks_private', name: 'Private Sector Banks', sectorId: 'banking', description: 'Private sector banks' },
  { id: 'banks_public', name: 'Public Sector Banks', sectorId: 'banking', description: 'Public sector banks' },
  { id: 'banks_cooperative', name: 'Cooperative Banks', sectorId: 'banking', description: 'Cooperative and rural banks' },
  { id: 'banks_small_finance', name: 'Small Finance Banks', sectorId: 'banking', description: 'Small finance banks' },
  { id: 'banks_payments', name: 'Payments Banks', sectorId: 'banking', description: 'Payments banks' },

  // Capital Goods
  { id: 'industrial_machinery', name: 'Industrial Machinery', sectorId: 'capital_goods', description: 'Industrial machinery and equipment' },
  { id: 'electrical_equipment', name: 'Electrical Equipment', sectorId: 'capital_goods', description: 'Electrical equipment and components' },
  { id: 'defense', name: 'Defense', sectorId: 'capital_goods', description: 'Defense and aerospace equipment' },
  { id: 'engineering', name: 'Engineering', sectorId: 'capital_goods', description: 'Engineering services and solutions' },

  // Chemicals
  { id: 'commodity_chemicals', name: 'Commodity Chemicals', sectorId: 'chemicals', description: 'Bulk and commodity chemicals' },
  { id: 'specialty_chemicals', name: 'Specialty Chemicals', sectorId: 'chemicals', description: 'Specialty and fine chemicals' },
  { id: 'agrochemicals', name: 'Agrochemicals', sectorId: 'chemicals', description: 'Fertilizers and pesticides' },
  { id: 'petrochemicals', name: 'Petrochemicals', sectorId: 'chemicals', description: 'Petrochemical products' },

  // Construction
  { id: 'construction_real_estate', name: 'Construction & Real Estate', sectorId: 'construction', description: 'Construction and real estate development' },
  { id: 'infrastructure', name: 'Infrastructure', sectorId: 'construction', description: 'Infrastructure development and engineering' },
  { id: 'building_materials', name: 'Building Materials', sectorId: 'construction', description: 'Cement, steel and building materials' },

  // Consumer Durables
  { id: 'consumer_electronics', name: 'Consumer Electronics', sectorId: 'consumer_durables', description: 'Consumer electronics and appliances' },
  { id: 'household_goods', name: 'Household Goods', sectorId: 'consumer_durables', description: 'Household durable products' },

  // Consumer Non-Durables (FMCG)
  { id: 'food_products', name: 'Food Products', sectorId: 'consumer_non_durables', description: 'Processed foods and beverages' },
  { id: 'beverages', name: 'Beverages', sectorId: 'consumer_non_durables', description: 'Alcoholic and non-alcoholic beverages' },
  { id: 'tobacco', name: 'Tobacco', sectorId: 'consumer_non_durables', description: 'Tobacco products' },
  { id: 'household_personal_care', name: 'Household & Personal Care', sectorId: 'consumer_non_durables', description: 'Household and personal care products' },
  { id: 'packaged_foods', name: 'Packaged Foods', sectorId: 'consumer_non_durables', description: 'Packaged and convenience foods' },

  // Energy
  { id: 'oil_gas_exploration', name: 'Oil & Gas Exploration', sectorId: 'energy', description: 'Oil and gas exploration and production' },
  { id: 'oil_gas_refining', name: 'Oil Refining & Marketing', sectorId: 'energy', description: 'Oil refining and marketing' },
  { id: 'gas_distribution', name: 'Gas Distribution', sectorId: 'energy', description: 'Natural gas distribution' },
  { id: 'power_generation', name: 'Power Generation', sectorId: 'energy', description: 'Thermal, hydro, nuclear and renewable power generation' },
  { id: 'power_transmission', name: 'Power Transmission & Distribution', sectorId: 'energy', description: 'Power transmission and distribution utilities' },
  { id: 'renewable_energy', name: 'Renewable Energy', sectorId: 'energy', description: 'Solar, wind and other renewable energy' },

  // Financial Services
  { id: 'nbfc', name: 'Non-Banking Financial Companies', sectorId: 'financial_services', description: 'NBFCs including housing finance' },
  { id: 'insurance', name: 'Insurance', sectorId: 'financial_services', description: 'Life and general insurance companies' },
  { id: 'asset_management', name: 'Asset Management', sectorId: 'financial_services', description: 'Mutual funds and asset management' },
  { id: 'stock_broking', name: 'Stock Broking', sectorId: 'financial_services', description: 'Stock broking and investment services' },
  { id: 'wealth_management', name: 'Wealth Management', sectorId: 'financial_services', description: 'Wealth and portfolio management' },
  { id: 'housing_finance', name: 'Housing Finance', sectorId: 'financial_services', description: 'Housing finance companies' },
  { id: 'microfinance', name: 'Microfinance', sectorId: 'financial_services', description: 'Microfinance institutions' },

  // Healthcare
  { id: 'pharmaceuticals', name: 'Pharmaceuticals', sectorId: 'healthcare', description: 'Pharmaceutical manufacturing and research' },
  { id: 'hospitals', name: 'Hospitals & Healthcare Services', sectorId: 'healthcare', description: 'Hospitals and healthcare delivery' },
  { id: 'diagnostics', name: 'Diagnostics & Pathology', sectorId: 'healthcare', description: 'Diagnostic labs and pathology services' },
  { id: 'medical_equipment', name: 'Medical Equipment & Supplies', sectorId: 'healthcare', description: 'Medical devices and equipment' },
  { id: 'clinical_research', name: 'Clinical Research & CROs', sectorId: 'healthcare', description: 'Clinical research organizations' },

  // Information Technology
  { id: 'it_services', name: 'IT Services', sectorId: 'information_technology', description: 'IT consulting and services' },
  { id: 'software_products', name: 'Software Products', sectorId: 'information_technology', description: 'Software product companies' },
  { id: 'bpm_services', name: 'BPM/BPO Services', sectorId: 'information_technology', description: 'Business process management and outsourcing' },
  { id: 'ecommerce', name: 'E-Commerce', sectorId: 'information_technology', description: 'E-commerce and internet platforms' },
  { id: 'fintech', name: 'Fintech', sectorId: 'information_technology', description: 'Financial technology companies' },

  // Media & Entertainment
  { id: 'broadcasting', name: 'Broadcasting & Television', sectorId: 'media', description: 'Television broadcasting and content' },
  { id: 'print_media', name: 'Print Media', sectorId: 'media', description: 'Newspapers and print publishing' },
  { id: 'film_entertainment', name: 'Film & Entertainment', sectorId: 'media', description: 'Film production and distribution' },
  { id: 'digital_media', name: 'Digital Media', sectorId: 'media', description: 'Digital media and OTT platforms' },
  { id: 'advertising', name: 'Advertising & Marketing', sectorId: 'media', description: 'Advertising and marketing services' },

  // Metals & Mining
  { id: 'ferrous_metals', name: 'Ferrous Metals', sectorId: 'metals', description: 'Iron, steel and ferroalloys' },
  { id: 'non_ferrous_metals', name: 'Non-Ferrous Metals', sectorId: 'metals', description: 'Aluminum, copper, zinc and other non-ferrous metals' },
  { id: 'mining', name: 'Mining & Minerals', sectorId: 'metals', description: 'Mineral mining and extraction' },

  // Real Estate
  { id: 'residential_real_estate', name: 'Residential Real Estate', sectorId: 'real_estate', description: 'Residential property development' },
  { id: 'commercial_real_estate', name: 'Commercial Real Estate', sectorId: 'real_estate', description: 'Commercial property development' },
  { id: 'reit', name: 'REITs', sectorId: 'real_estate', description: 'Real Estate Investment Trusts' },

  // Telecom
  { id: 'telecom_services', name: 'Telecom Services', sectorId: 'telecom', description: 'Telecom service providers' },
  { id: 'telecom_infrastructure', name: 'Telecom Infrastructure', sectorId: 'telecom', description: 'Telecom tower and infrastructure companies' },

  // Textiles
  { id: 'textile_manufacturing', name: 'Textile Manufacturing', sectorId: 'textiles', description: 'Textile and yarn manufacturing' },
  { id: 'apparel', name: 'Apparel & Garments', sectorId: 'textiles', description: 'Apparel and garment manufacturing' },
  { id: 'technical_textiles', name: 'Technical Textiles', sectorId: 'textiles', description: 'Technical and industrial textiles' },

  // Transportation
  { id: 'logistics', name: 'Logistics & Supply Chain', sectorId: 'transportation', description: 'Logistics and supply chain services' },
  { id: 'shipping', name: 'Shipping', sectorId: 'transportation', description: 'Shipping and port operations' },
  { id: 'aviation', name: 'Aviation', sectorId: 'transportation', description: 'Airlines and aviation services' },
  { id: 'railways', name: 'Railways', sectorId: 'transportation', description: 'Railway operations and related services' },
  { id: 'road_transport', name: 'Road Transport', sectorId: 'transportation', description: 'Road transport and fleet operators' },

  // Other
  { id: 'conglomerate', name: 'Diversified / Conglomerate', sectorId: 'other', description: 'Diversified business conglomerates' },
  { id: 'others', name: 'Others', sectorId: 'other', description: 'Other not classified' },
];

export class SectorTaxonomy {
  private sectors: Map<string, SectorDefinition> = new Map();
  private industries: Map<string, IndustryDefinition> = new Map();

  constructor() {
    for (const s of SECTORS) {
      this.sectors.set(s.id, s);
    }
    for (const ind of INDUSTRIES) {
      this.industries.set(ind.id, ind);
    }
  }

  /** Get all sectors */
  getSectors(): SectorDefinition[] {
    return Array.from(this.sectors.values());
  }

  /** Get a specific sector by id */
  getSector(id: string): SectorDefinition | undefined {
    return this.sectors.get(id);
  }

  /** Get all industries */
  getIndustries(): IndustryDefinition[] {
    return Array.from(this.industries.values());
  }

  /** Get a specific industry by id */
  getIndustry(id: string): IndustryDefinition | undefined {
    return this.industries.get(id);
  }

  /** Get all industries belonging to a specific sector */
  getIndustriesBySector(sectorId: string): IndustryDefinition[] {
    return INDUSTRIES.filter(ind => ind.sectorId === sectorId);
  }
}

export const sectorTaxonomy = new SectorTaxonomy();