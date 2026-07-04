/**
 * Portfolio Tracking & Alerts System
 * Complete portfolio management and real-time notifications
 */

export interface Portfolio {
  id: string;
  name: string;
  holdings: Holding[];
  cash: number;
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  allocations: Allocation[];
  performance: PortfolioPerformance;
  createdDate: string;
  lastUpdated: string;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  gain: number;
  gainPercent: number;
  purchaseDate: string;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

export interface Allocation {
  symbol: string;
  quantity: number;
  marketValue: number;
  percentOfPortfolio: number;
  sector: string;
}

export interface PortfolioPerformance {
  dayReturn: number;
  dayReturnPercent: number;
  weekReturn: number;
  monthReturn: number;
  yearReturn: number;
  ytdReturn: number;
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
}

export interface SectorAllocation {
  sector: string;
  quantity: number;
  marketValue: number;
  percentOfPortfolio: number;
}

export interface AllocationTarget {
  sector: string;
  targetPercent: number;
}

export interface RebalanceSuggestion {
  symbol: string;
  action: "buy" | "sell";
  quantity: number;
  reason: string;
}

// Alert interfaces

export interface PriceAlert {
  id: string;
  symbol: string;
  type: "above" | "below" | "between" | "change";
  value: number | [number, number];
  active: boolean;
  createdDate: string;
  triggeredDate?: string;
  notificationMethods: NotificationMethod[];
}

export interface TechnicalAlertItem {
  id: string;
  symbol: string;
  indicator: string; // "rsi", "macd", "ma", etc.
  condition: string; // "rsi > 70", "macd > signal", etc.
  active: boolean;
  createdDate: string;
  notificationMethods: NotificationMethod[];
}

export interface FundamentalAlertItem {
  id: string;
  symbol: string;
  metric: string; // "pe", "roe", "dividend", etc.
  condition: string; // "pe < 15", "roe > 15%", etc.
  active: boolean;
  createdDate: string;
  notificationMethods: NotificationMethod[];
}

export interface NewsAlert {
  id: string;
  symbol: string;
  keywords: string[];
  sentimentFilter: "all" | "positive" | "negative";
  active: boolean;
  createdDate: string;
  notificationMethods: NotificationMethod[];
}

export interface PortfolioAlert {
  id: string;
  portfolioId: string;
  condition: string; // "total_gain > 10%", "volatility > 15%", etc.
  active: boolean;
  createdDate: string;
  notificationMethods: NotificationMethod[];
}

export type Alert = PriceAlert | TechnicalAlertItem | FundamentalAlertItem | NewsAlert | PortfolioAlert;

export type NotificationMethod = "email" | "sms" | "push" | "in-app" | "webhook";

export interface ExecutedAlert {
  id: string;
  alertId: string;
  symbol?: string;
  message: string;
  triggeredDate: string;
  conditions: string;
  stockPrice?: number;
  technicalValue?: number;
  fundamentalValue?: number;
}

export interface TriggerResult {
  alert: Alert;
  triggered: boolean;
  message: string;
  value?: number;
}

/**
 * Implementation
 */
export class PortfolioManager {
  portfolios: Portfolio[] = [];
  activePortfolioId: string = "";

  createPortfolio(name: string): Portfolio {
    const portfolio: Portfolio = {
      id: `pf_${Date.now()}`,
      name,
      holdings: [],
      cash: 0,
      totalValue: 0,
      totalInvested: 0,
      totalGain: 0,
      totalGainPercent: 0,
      allocations: [],
      performance: {
        dayReturn: 0,
        dayReturnPercent: 0,
        weekReturn: 0,
        monthReturn: 0,
        yearReturn: 0,
        ytdReturn: 0,
        cagr: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0,
      },
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    this.portfolios.push(portfolio);
    if (!this.activePortfolioId) this.activePortfolioId = portfolio.id;
    return portfolio;
  }

  deletePortfolio(id: string): void {
    this.portfolios = this.portfolios.filter((p) => p.id !== id);
  }

  switchPortfolio(id: string): void {
    if (this.portfolios.find((p) => p.id === id)) {
      this.activePortfolioId = id;
    }
  }

  getPortfolio(id: string): Portfolio | undefined {
    return this.portfolios.find((p) => p.id === id);
  }

  addHolding(portfolioId: string, symbol: string, quantity: number, cost: number, date: string): void {
    const portfolio = this.getPortfolio(portfolioId);
    if (portfolio) {
      portfolio.holdings.push({
        symbol,
        quantity,
        avgCost: cost,
        currentPrice: 0,
        marketValue: 0,
        gain: 0,
        gainPercent: 0,
        purchaseDate: date,
        costBasis: quantity * cost,
        unrealizedGain: 0,
        unrealizedGainPercent: 0,
      });
    }
  }

  updateHolding(portfolioId: string, symbol: string, quantity: number, cost: number): void {
    const portfolio = this.getPortfolio(portfolioId);
    if (portfolio) {
      const holding = portfolio.holdings.find((h) => h.symbol === symbol);
      if (holding) {
        holding.quantity = quantity;
        holding.avgCost = cost;
      }
    }
  }

  removeHolding(portfolioId: string, symbol: string): void {
    const portfolio = this.getPortfolio(portfolioId);
    if (portfolio) {
      portfolio.holdings = portfolio.holdings.filter((h) => h.symbol !== symbol);
    }
  }

  getSectorAllocation(portfolioId: string): SectorAllocation[] {
    const portfolio = this.getPortfolio(portfolioId);
    if (!portfolio) return [];

    const sectors: { [key: string]: SectorAllocation } = {};
    for (const holding of portfolio.holdings) {
      const sector = holding.symbol; // Simplified - would need to look up actual sector
      if (!sectors[sector]) {
        sectors[sector] = {
          sector,
          quantity: 0,
          marketValue: 0,
          percentOfPortfolio: 0,
        };
      }
      sectors[sector].quantity += holding.quantity;
      sectors[sector].marketValue += holding.marketValue;
    }

    return Object.values(sectors);
  }

  getPerformanceMetrics(portfolioId: string): PortfolioPerformance {
    const portfolio = this.getPortfolio(portfolioId);
    return (
      portfolio?.performance || {
        dayReturn: 0,
        dayReturnPercent: 0,
        weekReturn: 0,
        monthReturn: 0,
        yearReturn: 0,
        ytdReturn: 0,
        cagr: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0,
      }
    );
  }

  calculateRebalance(portfolioId: string, targets: AllocationTarget[]): RebalanceSuggestion[] {
    return [];
  }
}

export class AlertSystemImpl {
  priceAlerts: PriceAlert[] = [];
  technicalAlerts: TechnicalAlertItem[] = [];
  fundamentalAlerts: FundamentalAlertItem[] = [];
  newsAlerts: NewsAlert[] = [];
  portfolioAlerts: PortfolioAlert[] = [];
  executedAlerts: ExecutedAlert[] = [];

  createPriceAlert(symbol: string, condition: PriceAlertCondition): PriceAlert {
    const alert: PriceAlert = {
      id: `pa_${Date.now()}`,
      symbol,
      type: condition.type,
      value: condition.value,
      active: true,
      createdDate: new Date().toISOString(),
      notificationMethods: ["email", "push"],
    };
    this.priceAlerts.push(alert);
    return alert;
  }

  createTechnicalAlert(symbol: string, indicator: string, condition: string): TechnicalAlertItem {
    const alert: TechnicalAlertItem = {
      id: `ta_${Date.now()}`,
      symbol,
      indicator,
      condition,
      active: true,
      createdDate: new Date().toISOString(),
      notificationMethods: ["email", "push"],
    };
    this.technicalAlerts.push(alert);
    return alert;
  }

  createFundamentalAlert(symbol: string, metric: string, condition: string): FundamentalAlertItem {
    const alert: FundamentalAlertItem = {
      id: `fa_${Date.now()}`,
      symbol,
      metric,
      condition,
      active: true,
      createdDate: new Date().toISOString(),
      notificationMethods: ["email", "push"],
    };
    this.fundamentalAlerts.push(alert);
    return alert;
  }

  createNewsAlert(symbol: string, keywords: string[]): NewsAlert {
    const alert: NewsAlert = {
      id: `na_${Date.now()}`,
      symbol,
      keywords,
      sentimentFilter: "all",
      active: true,
      createdDate: new Date().toISOString(),
      notificationMethods: ["push"],
    };
    this.newsAlerts.push(alert);
    return alert;
  }

  createPortfolioAlert(portfolioId: string, condition: string): PortfolioAlert {
    const alert: PortfolioAlert = {
      id: `poa_${Date.now()}`,
      portfolioId,
      condition,
      active: true,
      createdDate: new Date().toISOString(),
      notificationMethods: ["email", "push"],
    };
    this.portfolioAlerts.push(alert);
    return alert;
  }

  updateAlert(id: string, active: boolean): void {
    const allAlerts = [
      ...this.priceAlerts,
      ...this.technicalAlerts,
      ...this.fundamentalAlerts,
      ...this.newsAlerts,
      ...this.portfolioAlerts,
    ];
    const alert = allAlerts.find((a) => a.id === id);
    if (alert) alert.active = active;
  }

  deleteAlert(id: string): void {
    this.priceAlerts = this.priceAlerts.filter((a) => a.id !== id);
    this.technicalAlerts = this.technicalAlerts.filter((a) => a.id !== id);
    this.fundamentalAlerts = this.fundamentalAlerts.filter((a) => a.id !== id);
    this.newsAlerts = this.newsAlerts.filter((a) => a.id !== id);
    this.portfolioAlerts = this.portfolioAlerts.filter((a) => a.id !== id);
  }

  getActiveAlerts(): Alert[] {
    return [
      ...this.priceAlerts.filter((a) => a.active),
      ...this.technicalAlerts.filter((a) => a.active),
      ...this.fundamentalAlerts.filter((a) => a.active),
      ...this.newsAlerts.filter((a) => a.active),
      ...this.portfolioAlerts.filter((a) => a.active),
    ];
  }

  checkAndTriggerAlerts(stockData: any): TriggerResult[] {
    return [];
  }

  sendNotification(alert: Alert, message: string): void {
    console.log(`Alert: ${alert.id} - ${message}`);
  }
}

export interface PriceAlertCondition {
  type: "above" | "below" | "between" | "change";
  value: number | [number, number];
}

export const portfolioManager = new PortfolioManager();
export const alertSystem = new AlertSystemImpl();
