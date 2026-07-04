/**
 * Advanced stock filtering with multiple financial metrics
 */

export type FilterOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between';

export interface FilterCriteria {
  field: string;
  operator: FilterOperator;
  value: number | number[];
  label: string;
}

export interface FilterPreset {
  name: string;
  description: string;
  filters: FilterCriteria[];
}

export interface Stock {
  symbol: string;
  price: number;
  pe?: number;
  pb?: number;
  roe?: number;
  dividend?: number;
  debtToEquity?: number;
  revenueGrowth?: number;
  profitMargin?: number;
  currentRatio?: number;
  sector?: string;
  marketCap?: number;
}

export const FILTER_PRESETS: Record<string, FilterPreset> = {
  value: {
    name: 'Value Stocks',
    description: 'Low P/E, high dividend yield, reasonable P/B',
    filters: [
      { field: 'pe', operator: 'lte', value: 15, label: 'P/E Ratio ≤ 15' },
      { field: 'dividend', operator: 'gte', value: 2, label: 'Dividend Yield ≥ 2%' },
      { field: 'pb', operator: 'lte', value: 1.5, label: 'P/B Ratio ≤ 1.5' },
    ],
  },
  growth: {
    name: 'Growth Stocks',
    description: 'High revenue growth, good profitability, rising momentum',
    filters: [
      { field: 'revenueGrowth', operator: 'gte', value: 15, label: 'Revenue Growth ≥ 15%' },
      { field: 'profitMargin', operator: 'gte', value: 10, label: 'Profit Margin ≥ 10%' },
      { field: 'pe', operator: 'lte', value: 30, label: 'P/E Ratio ≤ 30' },
    ],
  },
  quality: {
    name: 'Quality Stocks',
    description: 'High ROE, low debt, strong balance sheet',
    filters: [
      { field: 'roe', operator: 'gte', value: 15, label: 'ROE ≥ 15%' },
      { field: 'debtToEquity', operator: 'lte', value: 0.5, label: 'Debt/Equity ≤ 0.5' },
      { field: 'currentRatio', operator: 'gte', value: 1.5, label: 'Current Ratio ≥ 1.5' },
    ],
  },
  emerging: {
    name: 'Emerging Stocks',
    description: 'Small cap, high growth potential, reasonable valuation',
    filters: [
      { field: 'marketCap', operator: 'lte', value: 50000, label: 'Market Cap ≤ ₹500Cr' },
      { field: 'revenueGrowth', operator: 'gte', value: 20, label: 'Revenue Growth ≥ 20%' },
      { field: 'pe', operator: 'lte', value: 25, label: 'P/E Ratio ≤ 25' },
    ],
  },
};

export class AdvancedFilterService {
  /**
   * Apply single filter criterion to a stock
   */
  static applyCriterion(stock: Stock, criterion: FilterCriteria): boolean {
    const value = (stock as any)[criterion.field];
    if (value === undefined || value === null) return false;

    switch (criterion.operator) {
      case 'gt':
        return value > criterion.value;
      case 'lt':
        return value < criterion.value;
      case 'gte':
        return value >= criterion.value;
      case 'lte':
        return value <= criterion.value;
      case 'eq':
        return value === criterion.value;
      case 'between':
        if (Array.isArray(criterion.value) && criterion.value.length === 2) {
          return value >= criterion.value[0] && value <= criterion.value[1];
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Apply all filters (AND logic - all must match)
   */
  static applyFilters(stocks: Stock[], filters: FilterCriteria[]): Stock[] {
    if (filters.length === 0) return stocks;

    return stocks.filter((stock) =>
      filters.every((filter) => this.applyCriterion(stock, filter))
    );
  }

  /**
   * Apply preset filter
   */
  static applyPreset(stocks: Stock[], presetName: string): Stock[] {
    const preset = FILTER_PRESETS[presetName];
    if (!preset) return stocks;
    return this.applyFilters(stocks, preset.filters);
  }

  /**
   * Get all available presets
   */
  static getPresets(): FilterPreset[] {
    return Object.values(FILTER_PRESETS);
  }

  /**
   * Calculate score for stock based on multiple metrics
   * Higher score = better stock
   */
  static calculateScore(stock: Stock): number {
    let score = 0;

    // Valuation (P/E) - lower is better (max 20 points)
    if (stock.pe) {
      score += Math.max(0, 20 - (stock.pe * 1.33));
    }

    // Profitability (ROE) - higher is better (max 20 points)
    if (stock.roe) {
      score += Math.min(20, stock.roe / 2);
    }

    // Growth - higher is better (max 20 points)
    if (stock.revenueGrowth) {
      score += Math.min(20, stock.revenueGrowth / 2);
    }

    // Dividend - higher is better (max 15 points)
    if (stock.dividend) {
      score += Math.min(15, stock.dividend * 3);
    }

    // Debt - lower is better (max 15 points)
    if (stock.debtToEquity) {
      score += Math.max(0, 15 - stock.debtToEquity * 10);
    }

    // Profit Margin - higher is better (max 10 points)
    if (stock.profitMargin) {
      score += Math.min(10, stock.profitMargin / 3);
    }

    return Math.round(score * 10) / 10;
  }

  /**
   * Sort stocks by score
   */
  static sortByScore(stocks: Stock[], descending = true): Stock[] {
    return [...stocks].sort((a, b) => {
      const scoreA = this.calculateScore(a);
      const scoreB = this.calculateScore(b);
      return descending ? scoreB - scoreA : scoreA - scoreB;
    });
  }

  /**
   * Get stocks by sector
   */
  static filterBySector(stocks: Stock[], sector: string): Stock[] {
    return stocks.filter((s) => s.sector?.toLowerCase() === sector.toLowerCase());
  }

  /**
   * Get price range
   */
  static getPriceRange(stocks: Stock[]): { min: number; max: number } {
    const prices = stocks.map((s) => s.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }
}

export const advancedFilterService = new AdvancedFilterService();
