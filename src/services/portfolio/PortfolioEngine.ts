import { loadAuthSession } from "../auth/sessionStore";
import { StockRegistry } from "../stocks/StockRegistry";
import { CompanyDNAEngine } from "../dna/CompanyDNAEngine";
import { AnalyticsCoordinator } from "../diagnostics/AnalyticsCoordinator";

export interface UserHolding {
  symbol: string;
  shares: number;
  avgBuyPrice: number;
  sector: string;
}

const STORAGE_KEY_PREFIX = "stockstory_portfolio_holdings_v1";

const DEFAULT_HOLDINGS: UserHolding[] = [
  { symbol: "RELIANCE", shares: 10, avgBuyPrice: 2450, sector: "Energy" },
  { symbol: "HAL", shares: 15, avgBuyPrice: 3200, sector: "Defence" },
  { symbol: "BEL", shares: 50, avgBuyPrice: 180, sector: "Defence" },
  { symbol: "HDFCBANK", shares: 25, avgBuyPrice: 1450, sector: "Banking" },
  { symbol: "INFY", shares: 20, avgBuyPrice: 1520, sector: "IT" },
];

export class PortfolioEngine {
  private static isInitialSyncStarted = false;

  private static getStorageKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${STORAGE_KEY_PREFIX}_${uid}`;
  }

  private static syncHoldingsWithBackend(): void {
    if (typeof window === "undefined") return;
    const uid = loadAuthSession().uid || "anonymous";

    fetch(`/api/investor-state?uid=${uid}`)
      .then(res => res.json())
      .then((state: any) => {
        if (state && state.memory && Array.isArray(state.memory.portfolio)) {
          const key = this.getStorageKey();
          window.localStorage.setItem(key, JSON.stringify(state.memory.portfolio));
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
      return JSON.parse(raw) as UserHolding[];
    } catch {
      return DEFAULT_HOLDINGS;
    }
  }

  public static saveHoldings(holdings: UserHolding[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey();
    window.localStorage.setItem(key, JSON.stringify(holdings));
    window.dispatchEvent(new Event("portfoliochange"));

    // Async sync to backend (under memory.portfolio)
    const uid = loadAuthSession().uid || "anonymous";

    // Track portfolio_created event
    let totalQuality = 0;
    let countWithQuality = 0;
    for (const h of holdings) {
      const stock = StockRegistry.getStock(h.symbol);
      if (stock) {
        const dna = CompanyDNAEngine.compute(stock);
        totalQuality += dna.businessQuality.score;
        countWithQuality++;
      }
    }
    const average_quality_factor = countWithQuality > 0 ? Number((totalQuality / countWithQuality).toFixed(2)) : 75.0;

    AnalyticsCoordinator.trackEvent("portfolio_created", JSON.stringify({
      uid,
      position_count: holdings.length,
      average_quality_factor,
      timestamp: new Date().toISOString()
    }));
    
    // First fetch current state to avoid overwriting other memory fields
    fetch(`/api/investor-state?uid=${uid}`)
      .then(res => res.json())
      .then((state: any) => {
        const currentMemory = state?.memory || {};
        const updatedMemory = { ...currentMemory, portfolio: holdings };
        
        fetch(`/api/investor-state?uid=${uid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memory: updatedMemory })
        }).catch(() => {});
      })
      .catch(() => {
        // Fallback direct update
        fetch(`/api/investor-state?uid=${uid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memory: { portfolio: holdings } })
        }).catch(() => {});
      });
  }

  public static addHolding(holding: UserHolding): void {
    const holdings = this.getHoldings();
    const existing = holdings.find((h) => h.symbol.toUpperCase() === holding.symbol.toUpperCase());
    if (existing) {
      // Calculate new weighted avg buy price
      const totalCost = (existing.shares * existing.avgBuyPrice) + (holding.shares * holding.avgBuyPrice);
      const totalShares = existing.shares + holding.shares;
      existing.shares = totalShares;
      existing.avgBuyPrice = Number((totalCost / totalShares).toFixed(2));
    } else {
      holdings.push({
        symbol: holding.symbol.toUpperCase().trim(),
        shares: holding.shares,
        avgBuyPrice: holding.avgBuyPrice,
        sector: holding.sector || "Conglomerate & Diversified"
      });
    }
    this.saveHoldings(holdings);
  }

  public static updateHolding(symbol: string, shares: number, avgBuyPrice: number): void {
    const holdings = this.getHoldings();
    const found = holdings.find(h => h.symbol.toUpperCase() === symbol.toUpperCase());
    if (found) {
      found.shares = shares;
      found.avgBuyPrice = avgBuyPrice;
      this.saveHoldings(holdings);
    }
  }

  public static removeHolding(symbol: string): void {
    const holdings = this.getHoldings();
    const next = holdings.filter(h => h.symbol.toUpperCase() !== symbol.toUpperCase());
    this.saveHoldings(next);
  }

  public static clearHoldings(): void {
    this.saveHoldings([]);
  }
}
export default PortfolioEngine;
