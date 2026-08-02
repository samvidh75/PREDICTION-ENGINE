// Portfolio optimization and risk types

export interface PortfolioPosition {
  ticker: string;
  weight: number; // 0-1, sum should be 1
  quantity?: number;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  cash: number;
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  dailyReturnPercent: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  valueAtRisk: number; // VaR at 95% confidence
  conditionalVaR: number; // CVaR at 95%
  beta: number;
  correlation: number;
}

export interface OptimizationConstraints {
  minWeight?: number; // minimum weight per position (default 0)
  maxWeight?: number; // maximum weight per position (default 1)
  minPositions?: number; // minimum number of positions
  maxPositions?: number; // maximum number of positions
  sectorLimits?: { [sector: string]: number }; // max weight per sector
  cashAllocation?: { min: number; max: number }; // cash weight constraints
  leverage?: number; // max leverage (1 = no leverage)
  turnoverLimit?: number; // max portfolio turnover
}

export interface OptimizationObjective {
  type: 'maximize_sharpe' | 'minimize_volatility' | 'target_return' | 'risk_parity' | 'equal_weight';
  targetReturn?: number;
  riskAversion?: number; // lambda in Markowitz
}

export interface OptimizedPortfolio {
  positions: PortfolioPosition[];
  metrics: PortfolioMetrics;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  optimizationDetails: {
    objective: string;
    converged: boolean;
    iterations: number;
    computeTimeMs: number;
    successInfo?: string;
    errorMessage?: string;
  };
}

export interface CovarianceMatrix {
  tickers: string[];
  matrix: number[][]; // n x n symmetric matrix
  lookbackDays?: number;
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][]; // n x n, values -1 to 1
}
