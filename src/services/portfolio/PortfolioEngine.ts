import { loadAuthSession } from "../auth/sessionStore";
import { StockRegistry } from "../stocks/StockRegistry";
import { CompanyDNAEngine } from "../dna/CompanyDNAEngine";
import { AnalyticsCoordinator } from "../diagnostics/AnalyticsCoordinator";

export const SECTOR_UNAVAILABLE = "Sector unavailable";

export interface UserHolding {
  symbol: string;
  shares: number;
  avgBuyPrice: number;
  /** User-supplied sector label. Missing values remain explicitly unavailable. */
  sector: string;
}

export interface CostBasisPosition {
  symbol: string;
  weight: number;
  costBasis: number;
}

const STORAGE_KEY_PREFIX = "stockstory_portfolio_holdings_v1";
const DEFAULT_HOLDINGS: UserHolding[] = [];

function finitePositive(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizePortfolioSector(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : SECTOR_UNAVAILABLE;
}

export function normalizeUserHolding(value: unknown): UserHolding | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<UserHolding>;
  const symbol = typeof candidate.symbol === "string" ? candidate.symbol.toUpperCase().trim() : "";
  const shares = finitePositive(candidate.shares);
  const avgBuyPrice = finitePositive(candidate.avgBuyPrice);
  if (!symbol || shares === null || avgBuyPrice === null) return null;

  return {
    symbol,
    shares,
    avgBuyPrice,
    sector: normalizePortfolioSector(candidate.sector),
  };
}

export function buildCostBasisPositions(holdings: UserHolding[]): CostBasisPosition[] {
  const valid = holdings
    .map(normalizeUserHolding)
    .filter((holding): holding is UserHolding => holding !== null)
    .map((holding) => ({
      symbol: holding.symbol,
      costBasis: holding.shares * holding.avgBuyPrice,
    }))
    .filter((position) => Number.isFinite(position.costBasis) && position.costBasis > 0);

  const totalCostBasis = valid.reduce((sum, position) => sum + position.costBasis, 0);
  if (totalCostBasis <= 0) return [];

  return valid.map((position) => ({
    ...position,
    weight: position.costBasis / totalCostBasis,
  }));
}

export class PortfolioEngine {
  private static isInitialSyncStarted = false;

  private static getStorageKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${STORAGE_KEY_PREFIX}_${uid}`;
  }

  private static syncHoldingsWithBackend(): void {
    if (typeof window === "undefined") return;
    const uid = loadAuthSession().uid || "anonymous";

    fetch(`/api/investor-state?uid=${encodeURIComponent(uid)}`)
      .then(res => res.json())
      .then((state: any) => {
        if (state && state.memory && Array.isArray(state.memory.portfolio)) {
          const normalized = state.memory.portfolio
            .map(normalizeUserHolding)
            .filter((holding: UserHolding | null): holding is UserHolding => holding !== null);
          const key = this.getStorageKey();
          window.localStorage.setItem(key, JSON.stringify(normalized));
          window.dispatchEvent(new Event("portfoliochange"));
        }
      })
      .catch(() => {});
  }

  public static getHoldings(): UserHolding[] {
    if (typeof window === "undefined") return DEFAULT_HOLDINGS;

    if (!this.isInitialSyncStarted) {
      this.isInitialSyncStarted = true;
      this.syncHoldingsWithBackend();
    }

    const key = this.getStorageKey();
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(DEFAULT_HOLDINGS));
      return DEFAULT_HOLDINGS;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_HOLDINGS;
      const normalized = parsed
        .map(normalizeUserHolding)
        .filter((holding): holding is UserHolding => holding !== null);
      if (JSON.stringify(normalized) !== raw) {
        window.localStorage.setItem(key, JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return DEFAULT_HOLDINGS;
    }
  }

  public static getCostBasisPositions(): CostBasisPosition[] {
    return buildCostBasisPositions(this.getHoldings());
  }

  public static saveHoldings(holdings: UserHolding[]): void {
    if (typeof window === "undefined") return;
    const normalized = holdings
      .map(normalizeUserHolding)
      .filter((holding): holding is UserHolding => holding !== null);
    const key = this.getStorageKey();
    window.localStorage.setItem(key, JSON.stringify(normalized));
    window.dispatchEvent(new Event("portfoliochange"));

    const uid = loadAuthSession().uid || "anonymous";

    let totalQuality = 0;
    let countWithQuality = 0;
    for (const holding of normalized) {
      const stock = StockRegistry.getStock(holding.symbol);
      if (stock) {
        const dna = CompanyDNAEngine.compute(stock);
        totalQuality += dna.businessQuality.score;
        countWithQuality++;
      }
    }
    const average_quality_factor = countWithQuality > 0
      ? Number((totalQuality / countWithQuality).toFixed(2))
      : null;

    AnalyticsCoordinator.trackEvent("portfolio_created", JSON.stringify({
      uid,
      position_count: normalized.length,
      average_quality_factor,
      timestamp: new Date().toISOString(),
    }));

    fetch(`/api/investor-state?uid=${encodeURIComponent(uid)}`)
      .then(res => res.json())
      .then((state: any) => {
        const currentMemory = state?.memory || {};
        const updatedMemory = { ...currentMemory, portfolio: normalized };

        fetch(`/api/investor-state?uid=${encodeURIComponent(uid)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memory: updatedMemory }),
        }).catch(() => {});
      })
      .catch(() => {
        fetch(`/api/investor-state?uid=${encodeURIComponent(uid)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memory: { portfolio: normalized } }),
        }).catch(() => {});
      });
  }

  public static addHolding(holding: UserHolding): boolean {
    const normalized = normalizeUserHolding(holding);
    if (!normalized) return false;

    const holdings = this.getHoldings();
    const existing = holdings.find((item) => item.symbol === normalized.symbol);
    if (existing) {
      const totalCost = (existing.shares * existing.avgBuyPrice) + (normalized.shares * normalized.avgBuyPrice);
      const totalShares = existing.shares + normalized.shares;
      existing.shares = totalShares;
      existing.avgBuyPrice = Number((totalCost / totalShares).toFixed(2));
      if (existing.sector === SECTOR_UNAVAILABLE && normalized.sector !== SECTOR_UNAVAILABLE) {
        existing.sector = normalized.sector;
      }
    } else {
      holdings.push(normalized);
    }
    this.saveHoldings(holdings);
    return true;
  }

  public static updateHolding(symbol: string, shares: number, avgBuyPrice: number): boolean {
    const normalizedShares = finitePositive(shares);
    const normalizedPrice = finitePositive(avgBuyPrice);
    if (normalizedShares === null || normalizedPrice === null) return false;

    const holdings = this.getHoldings();
    const found = holdings.find(holding => holding.symbol === symbol.toUpperCase().trim());
    if (!found) return false;
    found.shares = normalizedShares;
    found.avgBuyPrice = normalizedPrice;
    this.saveHoldings(holdings);
    return true;
  }

  public static removeHolding(symbol: string): void {
    const holdings = this.getHoldings();
    const next = holdings.filter(holding => holding.symbol !== symbol.toUpperCase().trim());
    this.saveHoldings(next);
  }

  public static clearHoldings(): void {
    this.saveHoldings([]);
  }
}

export default PortfolioEngine;
