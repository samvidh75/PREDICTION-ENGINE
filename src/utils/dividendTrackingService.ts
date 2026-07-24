/**
 * Dividend Tracking Service
 * Manages stock dividend data, TDS calculation, and historical tracking
 * For PSX equities (PSE/PSE stocks)
 */

export interface DividendPayment {
  ticker: string;
  exDate: number; // timestamp
  paymentDate: number; // timestamp
  dividendPerShare: number; // in ₱
  quantity: number; // shares held
  totalDividend: number; // gross dividend
  tds: number; // TDS deducted (10% standard)
  netDividend: number; // after TDS
  status: 'announced' | 'ex-date-passed' | 'paid'; // lifecycle
  frequency: 'interim' | 'final'; // dividend type
}

export interface DividendSummary {
  ticker: string;
  quantity: number;
  currentPrice: number;
  annualDividendYield: number; // %
  expectedAnnualDividend: number; // ₱
  lastPaymentDate: number; // timestamp
  lastDividendPerShare: number; // ₱
  upcomingExDate: number | null; // next ex-date
  totalDividendsPaid: number; // lifetime ₱
  totalTDSPaid: number; // lifetime ₱
  nextPaymentEstimate: number; // ₱
}

export interface DividendPortfolioStats {
  totalDividends: number; // ₱
  totalTDS: number; // ₱
  totalNetDividends: number; // ₱
  averageDividendYield: number; // weighted avg %
  monthlyIncome: number; // estimated avg
  annualIncome: number; // estimated
  holdingsWithDividends: number; // count
  nextPaymentDue: number | null; // timestamp
  nextPaymentAmount: number; // ₱
  taxableIncome: number; // total dividends (before TDS)
}

// PSX stock dividend database (common dividend-paying stocks)
const STOCK_DIVIDEND_DB: Record<
  string,
  {
    frequency: 'quarterly' | 'biannual' | 'annual';
    lastDividend: number;
    lastExDate: number;
    yieldApprox: number; // %
  }
> = {
  // Banking & Finance
  HDFC: { frequency: 'quarterly', lastDividend: 50, lastExDate: 1719792000000, yieldApprox: 2.5 },
  ICICIBANK: { frequency: 'quarterly', lastDividend: 8, lastExDate: 1719792000000, yieldApprox: 2.1 },
  SBIN: { frequency: 'quarterly', lastDividend: 3, lastExDate: 1719792000000, yieldApprox: 2.3 },
  INFY: { frequency: 'quarterly', lastDividend: 23, lastExDate: 1719792000000, yieldApprox: 1.2 },
  TCS: { frequency: 'quarterly', lastDividend: 30, lastExDate: 1719792000000, yieldApprox: 1.8 },

  // Auto & Infrastructure
  MARUTI: { frequency: 'annual', lastDividend: 300, lastExDate: 1688169600000, yieldApprox: 3.2 },
  BAJAJ: { frequency: 'annual', lastDividend: 90, lastExDate: 1688169600000, yieldApprox: 2.8 },

  // FMCG & Consumer
  ITC: { frequency: 'quarterly', lastDividend: 5.15, lastExDate: 1719792000000, yieldApprox: 3.5 },
  LT: { frequency: 'biannual', lastDividend: 50, lastExDate: 1719792000000, yieldApprox: 1.9 },
  NESTLEIND: { frequency: 'quarterly', lastDividend: 380, lastExDate: 1719792000000, yieldApprox: 1.4 },

  // Energy & Utilities
  RELIANCE: { frequency: 'biannual', lastDividend: 10, lastExDate: 1688169600000, yieldApprox: 2.2 },
  NTPC: { frequency: 'quarterly', lastDividend: 3.51, lastExDate: 1719792000000, yieldApprox: 4.1 },

  // Pharma
  CIPLA: { frequency: 'biannual', lastDividend: 12, lastExDate: 1688169600000, yieldApprox: 2.6 },
  SUNPHARMA: { frequency: 'annual', lastDividend: 7, lastExDate: 1688169600000, yieldApprox: 1.1 },
};

const TDS_RATE = 10; // 10% TDS on dividends (standard for non-resident/resident)

class DividendTrackingService {
  /**
   * Get dividend summary for a single holding
   */
  getDividendSummary(
    ticker: string,
    quantity: number,
    currentPrice: number,
    dividendHistory: DividendPayment[] = [],
  ): DividendSummary {
    const stockData = STOCK_DIVIDEND_DB[ticker] || { frequency: 'annual', lastDividend: 0, lastExDate: 0, yieldApprox: 0 };

    // Calculate yield
    const annualYield = (stockData.lastDividend / currentPrice) * 100;
    const expectedAnnualDividend = quantity * stockData.lastDividend;

    // Calculate total dividends paid
    const totalDividendsPaid = dividendHistory.reduce((sum, payment) => sum + payment.totalDividend, 0);
    const totalTDSPaid = dividendHistory.reduce((sum, payment) => sum + payment.tds, 0);

    // Get last payment
    const lastPayment = dividendHistory.length > 0 ? dividendHistory[dividendHistory.length - 1] : null;

    // Estimate next payment (based on frequency)
    const nextPaymentEstimate =
      stockData.frequency === 'quarterly'
        ? (expectedAnnualDividend / 4) * 0.9
        : stockData.frequency === 'biannual'
          ? (expectedAnnualDividend / 2) * 0.9
          : expectedAnnualDividend * 0.9;

    const nextExDate =
      stockData.frequency === 'quarterly'
        ? this.getNextExDate(stockData.lastExDate, 'quarterly')
        : stockData.frequency === 'biannual'
          ? this.getNextExDate(stockData.lastExDate, 'biannual')
          : this.getNextExDate(stockData.lastExDate, 'annual');

    return {
      ticker,
      quantity,
      currentPrice,
      annualDividendYield: annualYield,
      expectedAnnualDividend,
      lastPaymentDate: lastPayment?.paymentDate || stockData.lastExDate,
      lastDividendPerShare: stockData.lastDividend,
      upcomingExDate: nextExDate,
      totalDividendsPaid,
      totalTDSPaid,
      nextPaymentEstimate,
    };
  }

  /**
   * Calculate next ex-date based on frequency
   */
  private getNextExDate(lastExDate: number, frequency: 'quarterly' | 'biannual' | 'annual'): number {
    const now = Date.now();
    const nextDate = new Date(lastExDate);

    // Add months based on frequency
    const monthsToAdd = frequency === 'quarterly' ? 3 : frequency === 'biannual' ? 6 : 12;
    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

    // If calculated date is in the past, add another cycle
    while (nextDate.getTime() < now) {
      nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    }

    return nextDate.getTime();
  }

  /**
   * Calculate portfolio dividend statistics
   */
  calculatePortfolioStats(
    holdings: Array<{ ticker: string; quantity: number; currentPrice: number }>,
    dividendHistory: DividendPayment[] = [],
  ): DividendPortfolioStats {
    let totalDividends = 0;
    let totalTDS = 0;
    let holdingsWithDividends = 0;
    let nextPaymentDue: number | null = null;
    let nextPaymentAmount = 0;
    const yields: number[] = [];

    holdings.forEach((holding) => {
      const summary = this.getDividendSummary(
        holding.ticker,
        holding.quantity,
        holding.currentPrice,
        dividendHistory.filter((d) => d.ticker === holding.ticker),
      );

      if (summary.expectedAnnualDividend > 0) {
        holdingsWithDividends++;
      }

      totalDividends += summary.totalDividendsPaid;
      totalTDS += summary.totalTDSPaid;
      yields.push(summary.annualDividendYield);

      // Track earliest next payment
      if (summary.upcomingExDate) {
        if (!nextPaymentDue || summary.upcomingExDate < nextPaymentDue) {
          nextPaymentDue = summary.upcomingExDate;
          nextPaymentAmount = summary.nextPaymentEstimate;
        }
      }
    });

    const totalNetDividends = totalDividends - totalTDS;
    const averageYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;
    const monthlyIncome = totalDividends / 12;
    const annualIncome = totalDividends;

    return {
      totalDividends,
      totalTDS,
      totalNetDividends,
      averageDividendYield: averageYield,
      monthlyIncome,
      annualIncome,
      holdingsWithDividends,
      nextPaymentDue,
      nextPaymentAmount,
      taxableIncome: totalDividends,
    };
  }

  /**
   * Calculate TDS on dividend
   */
  calculateTDS(dividendAmount: number, tdsRate: number = TDS_RATE): number {
    return (dividendAmount * tdsRate) / 100;
  }

  /**
   * Get tax optimization strategy for dividends
   */
  getDividendTaxStrategy(
    totalDividendIncome: number,
    otherIncome: number,
    holdingsCount: number,
  ): string[] {
    const strategies: string[] = [];
    const combinedIncome = totalDividendIncome + otherIncome;

    if (totalDividendIncome > 500000) {
      strategies.push('🔴 High dividend income detected. Consider tax-efficient strategies like buying dividend stocks in tax-deferred accounts.');
    }

    if (holdingsCount < 5 && totalDividendIncome > 100000) {
      strategies.push('💡 Diversify dividend portfolio. More holdings = better risk management and income stability.');
    }

    if (combinedIncome < 250000) {
      strategies.push('🟢 Your income may qualify for dividend tax exemption. Check ITR-1 eligibility for nil tax on eligible dividends.');
    } else if (combinedIncome < 500000) {
      strategies.push('📊 You\'re in 5% tax bracket. Dividend income will be taxed at 5% + cess after standard deduction.');
    } else {
      strategies.push('⚠️ You\'re in higher tax bracket. Dividend income faces 20-30% effective tax. Consider long-term capital gains for gains instead.');
    }

    strategies.push(`💰 Estimated annual dividend income: ₱${totalDividendIncome.toLocaleString('en-PH')}`);

    return strategies;
  }

  /**
   * Get upcoming dividend calendar
   */
  getUpcomingDividendCalendar(
    holdings: Array<{ ticker: string; quantity: number; currentPrice: number }>,
    daysAhead: number = 90,
  ): Array<{ date: number; ticker: string; amount: number; exDate: number }> {
    const now = Date.now();
    const calendar: Array<{ date: number; ticker: string; amount: number; exDate: number }> = [];

    holdings.forEach((holding) => {
      const stockData = STOCK_DIVIDEND_DB[holding.ticker];
      if (!stockData) return;

      const summary = this.getDividendSummary(holding.ticker, holding.quantity, holding.currentPrice);

      if (summary.upcomingExDate && summary.upcomingExDate < now + daysAhead * 24 * 60 * 60 * 1000) {
        // Estimate payment date (typically 1-2 weeks after ex-date)
        const paymentDate = summary.upcomingExDate + 10 * 24 * 60 * 60 * 1000;

        calendar.push({
          date: paymentDate,
          ticker: holding.ticker,
          amount: summary.nextPaymentEstimate,
          exDate: summary.upcomingExDate,
        });
      }
    });

    return calendar.sort((a, b) => a.date - b.date);
  }
}

export const dividendTrackingService = new DividendTrackingService();
