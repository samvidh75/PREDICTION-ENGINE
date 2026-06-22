import { buildStockEdgePredictionInput } from "./StockEdgePredictionBridge";
import { StockEdgeWrapper } from "./StockEdgeWrapper";
import type { StockEdgeCanonicalSnapshot } from "./StockEdgeTypes";

export interface StockEdgeIngestionSummary {
  symbol: string;
  ok: boolean;
  status: string;
  mappedAt?: string;
  activeFieldCount: number;
  financialTableCount: number;
  ownershipPeriods: number;
  corporateActionCount: number;
  missingSections: string[];
  internalErrorCode?: string;
}

export interface StockEdgeIngestionOptions {
  wrapper?: StockEdgeWrapper;
  apply?: boolean;
}

function summarizeSnapshot(snapshot: StockEdgeCanonicalSnapshot): Omit<StockEdgeIngestionSummary, "ok" | "status"> {
  const predictionInput = buildStockEdgePredictionInput(snapshot);
  return {
    symbol: snapshot.symbol,
    mappedAt: snapshot.mappedAt,
    activeFieldCount: predictionInput.activeFieldCount,
    financialTableCount: snapshot.financialTables.length,
    ownershipPeriods: snapshot.ownership.length,
    corporateActionCount: snapshot.corporateActions.length,
    missingSections: predictionInput.missingFields,
  };
}

export class StockEdgeIngestionJob {
  private readonly wrapper: StockEdgeWrapper;

  constructor(options: StockEdgeIngestionOptions = {}) {
    this.wrapper = options.wrapper ?? new StockEdgeWrapper();
  }

  configSummary(): Record<string, boolean | number> {
    return this.wrapper.configSummary();
  }

  async runForSymbol(symbol: string): Promise<StockEdgeIngestionSummary> {
    const result = await this.wrapper.fetchFullSnapshot(symbol);
    if (!result.ok || !result.data) {
      return {
        symbol: symbol.trim().toUpperCase(),
        ok: false,
        status: result.status,
        activeFieldCount: 0,
        financialTableCount: 0,
        ownershipPeriods: 0,
        corporateActionCount: 0,
        missingSections: ["snapshot"],
        internalErrorCode: result.internalErrorCode,
      };
    }

    return {
      ...summarizeSnapshot(result.data),
      ok: true,
      status: result.status,
    };
  }
}
