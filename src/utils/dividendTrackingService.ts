/**
 * Dividend Tracking Service
 * Manages PSE stock dividend data, withholding tax calculation, and
 * historical tracking.
 *
 * Philippine dividend tax: cash/property dividends paid by a domestic
 * corporation to a resident individual are subject to a flat 10% FINAL
 * withholding tax (NIRC Sec. 24(B)(2)) — withheld at source by the payor,
 * with no further individual income tax due and no annual return needed
 * for that income. This is structurally different from India's TDS, which
 * is a prepayment credited against tax computed on an annual return (ITR) —
 * there is no Philippine equivalent of tax "slabs"/brackets applying on
 * top of already-finally-taxed dividend income.
 */

export interface DividendPayment {
  ticker: string;
  exDate: number; // timestamp
  paymentDate: number; // timestamp
  dividendPerShare: number; // in ₱
  quantity: number; // shares held
  totalDividend: number; // gross dividend
  withholdingTax: number; // final withholding tax deducted (10% standard)
  netDividend: number; // after withholding tax
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
  totalWithholdingTaxPaid: number; // lifetime ₱
  nextPaymentEstimate: number; // ₱
}

export interface DividendPortfolioStats {
  totalDividends: number; // ₱
  totalWithholdingTax: number; // ₱
  totalNetDividends: number; // ₱
  averageDividendYield: number; // weighted avg %
  monthlyIncome: number; // estimated avg
  annualIncome: number; // estimated
  holdingsWithDividends: number; // count
  nextPaymentDue: number | null; // timestamp
  nextPaymentAmount: number; // ₱
  /** Dividend income is already finally taxed at source — nothing further
      to declare for this income specifically. Kept for display only. */
  finallyTaxedIncome: number;
}

// PSE stock dividend database (common dividend-paying Philippine stocks)
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
  BDO: { frequency: 'quarterly', lastDividend: 3, lastExDate: 1719792000000, yieldApprox: 2.8 },
  BPI: { frequency: 'quarterly', lastDividend: 4, lastExDate: 1719792000000, yieldApprox: 3.2 },
  MBT: { frequency: 'quarterly', lastDividend: 1.5, lastExDate: 1719792000000, yieldApprox: 2.5 },
  PNB: { frequency: 'biannual', lastDividend: 0.8, lastExDate: 1719792000000, yieldApprox: 1.9 },
  SECB: { frequency: 'quarterly', lastDividend: 1, lastExDate: 1719792000000, yieldApprox: 2.1 },
  RCB: { frequency: 'biannual', lastDividend: 1.5, lastExDate: 1719792000000, yieldApprox: 2.3 },

  // Holding Firms
  AC: { frequency: 'quarterly', lastDividend: 5, lastExDate: 1719792000000, yieldApprox: 2.0 },
  JGS: { frequency: 'annual', lastDividend: 4, lastExDate: 1688169600000, yieldApprox: 1.8 },
  SMC: { frequency: 'biannual', lastDividend: 2, lastExDate: 1719792000000, yieldApprox: 1.5 },

  // Consumer
  JFC: { frequency: 'quarterly', lastDividend: 3.5, lastExDate: 1719792000000, yieldApprox: 1.2 },
  URC: { frequency: 'quarterly', lastDividend: 2.5, lastExDate: 1719792000000, yieldApprox: 2.8 },
  PGOLD: { frequency: 'annual', lastDividend: 0.5, lastExDate: 1688169600000, yieldApprox: 1.1 },

  // Property
  ALI: { frequency: 'quarterly', lastDividend: 1.5, lastExDate: 1719792000000, yieldApprox: 2.0 },
  SMPH: { frequency: 'annual', lastDividend: 1, lastExDate: 1688169600000, yieldApprox: 1.5 },
  RLC: { frequency: 'annual', lastDividend: 0.8, lastExDate: 1688169600000, yieldApprox: 2.2 },

  // Utilities & Energy
  MER: { frequency: 'quarterly', lastDividend: 10, lastExDate: 1719792000000, yieldApprox: 4.5 },
  AP: { frequency: 'biannual', lastDividend: 2, lastExDate: 1688169600000, yieldApprox: 3.0 },
  FGEN: { frequency: 'annual', lastDividend: 1.5, lastExDate: 1688169600000, yieldApprox: 2.1 },

  // Telecom
  TEL: { frequency: 'quarterly', lastDividend: 50, lastExDate: 1719792000000, yieldApprox: 5.2 },
  GLO: { frequency: 'quarterly', lastDividend: 35, lastExDate: 1719792000000, yieldApprox: 4.8 },

  // Mining
  SCC: { frequency: 'biannual', lastDividend: 3, lastExDate: 1688169600000, yieldApprox: 3.5 },
  NIKL: { frequency: 'annual', lastDividend: 0.5, lastExDate: 1688169600000, yieldApprox: 1.8 },
};

const WITHHOLDING_TAX_RATE = 10; // 10% final withholding tax on cash dividends (NIRC Sec. 24(B)(2))

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
    const totalWithholdingTaxPaid = dividendHistory.reduce((sum, payment) => sum + payment.withholdingTax, 0);

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
      totalWithholdingTaxPaid,
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
    let totalWithholdingTax = 0;
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
      totalWithholdingTax += summary.totalWithholdingTaxPaid;
      yields.push(summary.annualDividendYield);

      // Track earliest next payment
      if (summary.upcomingExDate) {
        if (!nextPaymentDue || summary.upcomingExDate < nextPaymentDue) {
          nextPaymentDue = summary.upcomingExDate;
          nextPaymentAmount = summary.nextPaymentEstimate;
        }
      }
    });

    const totalNetDividends = totalDividends - totalWithholdingTax;
    const averageYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;
    const monthlyIncome = totalDividends / 12;
    const annualIncome = totalDividends;

    return {
      totalDividends,
      totalWithholdingTax,
      totalNetDividends,
      averageDividendYield: averageYield,
      monthlyIncome,
      annualIncome,
      holdingsWithDividends,
      nextPaymentDue,
      nextPaymentAmount,
      finallyTaxedIncome: totalDividends,
    };
  }

  /**
   * Calculate the final withholding tax on a dividend payment.
   */
  calculateWithholdingTax(dividendAmount: number, rate: number = WITHHOLDING_TAX_RATE): number {
    return (dividendAmount * rate) / 100;
  }

  /**
   * Get tax optimization strategy for dividends
   */
  /**
   * Notes on dividend income for a PH investor. Unlike a progressive-bracket
   * system, PH cash dividend income from a domestic corporation is subject
   * to a flat 10% FINAL withholding tax — already deducted by the payor,
   * with no further individual income tax due and no bracket to "move into"
   * regardless of `otherIncome`. `otherIncome` is accepted for API
   * compatibility but doesn't change the dividend-specific notes below.
   */
  getDividendTaxStrategy(
    totalDividendIncome: number,
    _otherIncome: number,
    holdingsCount: number,
  ): string[] {
    const notes: string[] = [];

    notes.push('🟢 Cash dividends from PH-listed corporations are subject to a flat 10% final withholding tax, deducted at source — no further individual income tax is due on this income, and it isn\'t added to your other taxable income.');

    if (holdingsCount < 5 && totalDividendIncome > 100_000) {
      notes.push('💡 Diversify your dividend holdings across sectors — more holdings generally means better risk management and steadier income.');
    }

    if (totalDividendIncome > 500_000) {
      notes.push('📌 REITs (e.g. AREIT, RCR) distribute most of their taxable income and are popular for dividend income specifically — compare their payout consistency against straight equity dividend payers.');
    }

    notes.push(`💰 Estimated annual dividend income: ₱${totalDividendIncome.toLocaleString('en-PH')}`);

    return notes;
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
