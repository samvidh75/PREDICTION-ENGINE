import type {
  AdapterErrorCode,
  AdapterResult,
  CompanyMasterAdapter,
  CompanyMasterRecord,
  CorporateActionsAdapter,
  CorporateActionRecord,
  DerivativesAdapter,
  DerivativesSnapshotRecord,
  FilingRecord,
  FilingsAdapter,
  FinancialsAdapter,
  FinancialSnapshotRecord,
  NewsEventRecord,
  NewsEventsAdapter,
  OwnershipAdapter,
  OwnershipRecord,
  PriceAdapter,
  PriceCandle,
  PriceQueryOptions,
  SectorMacroAdapter,
  SectorMacroContextRecord,
} from "./dataAdapterTypes";
import { canonicalNow, normalizeAdapterSymbol } from "./normalizeDataRecord";

function unavailable<T>(symbol: string, code: AdapterErrorCode = "ADAPTER_UNAVAILABLE"): AdapterResult<T> {
  if (!normalizeAdapterSymbol(symbol)) {
    return { ok: false, data: null, warnings: [], errorCode: "INVALID_SYMBOL", asOf: canonicalNow() };
  }
  return { ok: false, data: null, warnings: [{ code }], errorCode: code, asOf: canonicalNow() };
}

export const nullCompanyMasterAdapter: CompanyMasterAdapter = {
  async getCompanyMaster(symbol: string): Promise<AdapterResult<CompanyMasterRecord>> {
    return unavailable(symbol);
  },
};

export const nullPriceAdapter: PriceAdapter = {
  async getDailyCandles(symbol: string, _options?: PriceQueryOptions): Promise<AdapterResult<PriceCandle[]>> {
    return unavailable(symbol);
  },
  async getIntradayCandles(symbol: string): Promise<AdapterResult<PriceCandle[]>> {
    return unavailable(symbol);
  },
};

export const nullFinancialsAdapter: FinancialsAdapter = {
  async getFinancialSnapshot(symbol: string): Promise<AdapterResult<FinancialSnapshotRecord>> {
    return unavailable(symbol);
  },
};

export const nullNewsEventsAdapter: NewsEventsAdapter = {
  async getRecentNewsEvents(symbol: string): Promise<AdapterResult<NewsEventRecord[]>> {
    return unavailable(symbol);
  },
};

export const nullFilingsAdapter: FilingsAdapter = {
  async getRecentFilings(symbol: string): Promise<AdapterResult<FilingRecord[]>> {
    return unavailable(symbol);
  },
};

export const nullOwnershipAdapter: OwnershipAdapter = {
  async getLatestOwnership(symbol: string): Promise<AdapterResult<OwnershipRecord>> {
    return unavailable(symbol);
  },
};

export const nullCorporateActionsAdapter: CorporateActionsAdapter = {
  async getCorporateActions(symbol: string): Promise<AdapterResult<CorporateActionRecord[]>> {
    return unavailable(symbol);
  },
};

export const nullDerivativesAdapter: DerivativesAdapter = {
  async getDerivativesSnapshot(symbol: string): Promise<AdapterResult<DerivativesSnapshotRecord>> {
    return unavailable(symbol);
  },
};

export const nullSectorMacroAdapter: SectorMacroAdapter = {
  async getSectorMacroContext(symbol: string): Promise<AdapterResult<SectorMacroContextRecord>> {
    return unavailable(symbol);
  },
};
