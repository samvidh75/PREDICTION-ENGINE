/**
 * Sector Mapper
 *
 * Maps raw sector/industry strings from various data sources to canonical
 * sector and industry IDs. Detects and stores conflicts when the same
 * symbol maps to different sectors across sources.
 */

import type { SectorDefinition, IndustryDefinition } from './SectorTaxonomy';
import { sectorTaxonomy } from './SectorTaxonomy';

export interface SectorConflict {
  symbol: string;
  sourceSector: string;
  sourceIndustry: string;
  mappedSector: string;
  mappedIndustry: string;
  sourceId: string;
  detectedAt: string;
  resolved: boolean;
}

const RAW_TO_SECTOR: Record<string, string> = {
  // Banking & Finance
  'bank': 'banking',
  'banks': 'banking',
  'banking': 'banking',
  'private sector bank': 'banking',
  'public sector bank': 'banking',
  'financial services': 'financial_services',
  'finance': 'financial_services',
  'nbfc': 'financial_services',
  'housing finance': 'financial_services',
  'insurance': 'financial_services',
  'asset management': 'financial_services',
  'stock broking': 'financial_services',
  'microfinance': 'financial_services',

  // Automobile
  'automobile': 'automobile',
  'auto': 'automobile',
  'auto components': 'automobile',
  'automotive': 'automobile',

  // Capital Goods
  'capital goods': 'capital_goods',
  'industrial': 'capital_goods',
  'engineering': 'capital_goods',
  'defense': 'capital_goods',
  'defence': 'capital_goods',
  'electrical equipment': 'capital_goods',

  // Chemicals
  'chemicals': 'chemicals',
  'chemical': 'chemicals',
  'specialty chemicals': 'chemicals',
  'petrochemicals': 'chemicals',
  'agrochemicals': 'chemicals',
  'fertilizers': 'chemicals',

  // Construction
  'construction': 'construction',
  'infrastructure': 'construction',
  'infra': 'construction',
  'building materials': 'construction',
  'cement': 'construction',
  'real estate': 'real_estate',
  'property': 'real_estate',

  // Consumer
  'fmcg': 'consumer_non_durables',
  'consumer goods': 'consumer_non_durables',
  'consumer staples': 'consumer_non_durables',
  'food products': 'consumer_non_durables',
  'food & beverages': 'consumer_non_durables',
  'beverages': 'consumer_non_durables',
  'tobacco': 'consumer_non_durables',
  'household & personal care': 'consumer_non_durables',
  'consumer durables': 'consumer_durables',
  'electronics': 'consumer_durables',
  'consumer electronics': 'consumer_durables',

  // Energy
  'energy': 'energy',
  'oil & gas': 'energy',
  'oil and gas': 'energy',
  'power': 'energy',
  'power generation': 'energy',
  'power transmission': 'energy',
  'renewable energy': 'energy',
  'renewables': 'energy',
  'gas distribution': 'energy',

  // Healthcare
  'healthcare': 'healthcare',
  'pharmaceuticals': 'healthcare',
  'pharma': 'healthcare',
  'hospitals': 'healthcare',
  'diagnostics': 'healthcare',
  'medical equipment': 'healthcare',

  // IT
  'information technology': 'information_technology',
  'it services': 'information_technology',
  'technology': 'information_technology',
  'software': 'information_technology',
  'it': 'information_technology',
  'ecommerce': 'information_technology',
  'e-commerce': 'information_technology',
  'fintech': 'information_technology',

  // Media
  'media': 'media',
  'media & entertainment': 'media',
  'entertainment': 'media',
  'broadcasting': 'media',
  'publishing': 'media',
  'advertising': 'media',

  // Metals
  'metals': 'metals',
  'metals & mining': 'metals',
  'mining': 'metals',
  'steel': 'metals',
  'iron & steel': 'metals',
  'aluminium': 'metals',
  'aluminum': 'metals',

  // Telecom
  'telecom': 'telecom',
  'telecommunications': 'telecom',
  'telecom services': 'telecom',

  // Textiles
  'textiles': 'textiles',
  'textile': 'textiles',
  'apparel': 'textiles',
  'garments': 'textiles',

  // Transportation
  'transportation': 'transportation',
  'logistics': 'transportation',
  'shipping': 'transportation',
  'aviation': 'transportation',
  'airlines': 'transportation',
  'railways': 'transportation',

  // Other
  'diversified': 'other',
  'conglomerate': 'other',
  'others': 'other',
  'other': 'other',
};

const RAW_TO_INDUSTRY: Record<string, string> = {
  // Banks
  'private sector bank': 'banks_private',
  'private bank': 'banks_private',
  'public sector bank': 'banks_public',
  'public bank': 'banks_public',
  'cooperative bank': 'banks_cooperative',
  'small finance bank': 'banks_small_finance',
  'payments bank': 'banks_payments',

  // NBFCs
  'nbfc': 'nbfc',
  'housing finance': 'housing_finance',
  'housing finance company': 'housing_finance',
  'hfc': 'housing_finance',
  'microfinance': 'microfinance',
  'micro finance': 'microfinance',

  // Insurance
  'life insurance': 'insurance',
  'general insurance': 'insurance',
  'health insurance': 'insurance',
  'insurance': 'insurance',

  // Auto
  '2 wheeler': 'auto_2_3_wheelers',
  '3 wheeler': 'auto_2_3_wheelers',
  'two wheeler': 'auto_2_3_wheelers',
  'passenger car': 'auto_4_wheelers',
  'passenger vehicle': 'auto_4_wheelers',
  'suv': 'auto_4_wheelers',
  'commercial vehicle': 'auto_commercial',
  'cv': 'auto_commercial',
  'auto component': 'auto_components',
  'auto parts': 'auto_components',

  // IT
  'it services': 'it_services',
  'software product': 'software_products',
  'software products': 'software_products',
  'bpo': 'bpm_services',
  'bpm': 'bpm_services',
  'ecommerce': 'ecommerce',
  'e-commerce': 'ecommerce',
  'fintech': 'fintech',

  // Healthcare
  'pharmaceutical': 'pharmaceuticals',
  'pharma': 'pharmaceuticals',
  'hospital': 'hospitals',
  'diagnostic': 'diagnostics',
  'pathology': 'diagnostics',
  'medical equipment': 'medical_equipment',
  'medical device': 'medical_equipment',

  // Energy
  'oil exploration': 'oil_gas_exploration',
  'oil production': 'oil_gas_exploration',
  'oil refining': 'oil_gas_refining',
  'refinery': 'oil_gas_refining',
  'gas distribution': 'gas_distribution',
  'power generation': 'power_generation',
  'power transmission': 'power_transmission',
  'solar': 'renewable_energy',
  'wind': 'renewable_energy',
  'renewable': 'renewable_energy',

  // Media
  'television': 'broadcasting',
  'tv': 'broadcasting',
  'broadcasting': 'broadcasting',
  'print': 'print_media',
  'newspaper': 'print_media',
  'film': 'film_entertainment',
  'movie': 'film_entertainment',
  'ott': 'digital_media',
  'digital media': 'digital_media',
  'advertising': 'advertising',
  'ad agency': 'advertising',

  // Metals
  'steel': 'ferrous_metals',
  'iron': 'ferrous_metals',
  'ferrous': 'ferrous_metals',
  'aluminium': 'non_ferrous_metals',
  'aluminum': 'non_ferrous_metals',
  'copper': 'non_ferrous_metals',
  'zinc': 'non_ferrous_metals',
  'mining': 'mining',
  'minerals': 'mining',

  // Real Estate
  'residential': 'residential_real_estate',
  'commercial': 'commercial_real_estate',
  'reit': 'reit',

  // Telecom
  'telecom service': 'telecom_services',
  'telecom infra': 'telecom_infrastructure',
  'tower': 'telecom_infrastructure',

  // Textiles
  'textile manufacturing': 'textile_manufacturing',
  'yarn': 'textile_manufacturing',
  'apparel': 'apparel',
  'garment': 'apparel',
  'technical textile': 'technical_textiles',

  // Transportation
  'logistics': 'logistics',
  'shipping': 'shipping',
  'port': 'shipping',
  'airline': 'aviation',
  'aviation': 'aviation',
  'railway': 'railways',
  'road transport': 'road_transport',

  // Consumer
  'food products': 'food_products',
  'packaged food': 'packaged_foods',
  'beverage': 'beverages',
  'tobacco': 'tobacco',
  'personal care': 'household_personal_care',
  'household products': 'household_personal_care',
  'consumer electronics': 'consumer_electronics',
  'household appliances': 'household_goods',

  // Construction
  'cement': 'building_materials',
  'building material': 'building_materials',
  'construction': 'construction_real_estate',
  'infrastructure': 'infrastructure',
  'infra': 'infrastructure',

  // Capital Goods
  'industrial machinery': 'industrial_machinery',
  'electrical equipment': 'electrical_equipment',
  'defense': 'defense',
  'defence': 'defense',
  'engineering': 'engineering',

  // Chemicals
  'commodity chemicals': 'commodity_chemicals',
  'specialty chemicals': 'specialty_chemicals',
  'agrochemicals': 'agrochemicals',
  'fertilizers': 'agrochemicals',
  'petrochemicals': 'petrochemicals',
};

export class SectorMapper {
  private conflicts: SectorConflict[] = [];

  /** Map a raw sector string to a canonical sector ID */
  mapSector(rawSector: string): string {
    const normalized = rawSector.trim().toLowerCase();
    return RAW_TO_SECTOR[normalized] ?? 'other';
  }

  /** Map a raw industry string to a canonical industry ID */
  mapIndustry(rawIndustry: string): string {
    const normalized = rawIndustry.trim().toLowerCase();
    return RAW_TO_INDUSTRY[normalized] ?? 'others';
  }

  /** Map both sector and industry together */
  map(symbol: string, rawSector: string, rawIndustry: string, sourceId: string): {
    sectorId: string;
    industryId: string;
  } {
    const sectorId = this.mapSector(rawSector);
    const industryId = this.mapIndustry(rawIndustry);

    // Verify the industry belongs to the sector
    const industry = sectorTaxonomy.getIndustry(industryId);
    if (industry && industry.sectorId !== sectorId) {
      // If industry doesn't match sector, trust the sector mapping
      // and find a generic industry for that sector
      this.conflicts.push({
        symbol,
        sourceSector: rawSector,
        sourceIndustry: rawIndustry,
        mappedSector: sectorId,
        mappedIndustry: industryId,
        sourceId,
        detectedAt: new Date().toISOString(),
        resolved: false,
      });
    }

    return { sectorId, industryId };
  }

  /** Get all detected conflicts */
  getConflicts(): SectorConflict[] {
    return [...this.conflicts];
  }

  /** Clear resolved conflicts */
  clearResolvedConflicts(): void {
    this.conflicts = this.conflicts.filter(c => !c.resolved);
  }
}

export const sectorMapper = new SectorMapper();