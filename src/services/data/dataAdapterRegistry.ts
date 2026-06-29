import type {
  CompanyMasterAdapter,
  CorporateActionsAdapter,
  DerivativesAdapter,
  FilingsAdapter,
  FinancialsAdapter,
  NewsEventsAdapter,
  OwnershipAdapter,
  PriceAdapter,
  SectorMacroAdapter,
} from "./dataAdapterTypes";
import {
  nullCompanyMasterAdapter,
  nullCorporateActionsAdapter,
  nullDerivativesAdapter,
  nullFilingsAdapter,
  nullFinancialsAdapter,
  nullNewsEventsAdapter,
  nullOwnershipAdapter,
  nullPriceAdapter,
  nullSectorMacroAdapter,
} from "./nullAdapters";

export interface DataAdapterRegistry {
  companyMaster: CompanyMasterAdapter;
  price: PriceAdapter;
  financials: FinancialsAdapter;
  newsEvents: NewsEventsAdapter;
  filings: FilingsAdapter;
  ownership: OwnershipAdapter;
  corporateActions: CorporateActionsAdapter;
  derivatives: DerivativesAdapter;
  sectorMacro: SectorMacroAdapter;
}

export function createDataAdapterRegistry(overrides: Partial<DataAdapterRegistry> = {}): DataAdapterRegistry {
  return {
    companyMaster: overrides.companyMaster ?? nullCompanyMasterAdapter,
    price: overrides.price ?? nullPriceAdapter,
    financials: overrides.financials ?? nullFinancialsAdapter,
    newsEvents: overrides.newsEvents ?? nullNewsEventsAdapter,
    filings: overrides.filings ?? nullFilingsAdapter,
    ownership: overrides.ownership ?? nullOwnershipAdapter,
    corporateActions: overrides.corporateActions ?? nullCorporateActionsAdapter,
    derivatives: overrides.derivatives ?? nullDerivativesAdapter,
    sectorMacro: overrides.sectorMacro ?? nullSectorMacroAdapter,
  };
}

export const defaultDataAdapterRegistry = createDataAdapterRegistry();
