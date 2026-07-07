/**
 * Tax Planning Service
 * Calculates tax implications and optimization suggestions
 * For Philippine income tax (STCG/LTCG, Section 80C, etc.)
 */

export interface TaxableGain {
  ticker: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  holdingPeriod: number; // days
  purchaseDate: number; // timestamp
  saleDate: number; // timestamp
  gain: number;
  gainPercent: number;
  gainType: 'short-term' | 'long-term'; // STCG < 12 months, LTCG >= 12 months
  stcgTax: number; // Short-term capital gains tax (slab rate)
  ltcgTax: number; // Long-term capital gains tax (20% + cess)
}

export interface TaxSummary {
  totalGains: number;
  shortTermGains: number;
  longTermGains: number;
  totalSTCGTax: number;
  totalLTCGTax: number;
  totalTax: number;
  netGains: number;
  effectiveTaxRate: number; // %
  recommendations: string[];
}

export interface DividendRecord {
  ticker: string;
  dividendPerShare: number;
  quantity: number;
  totalDividend: number;
  exDate: number;
  paymentDate: number;
  taxability: 'dividend-income' | 'exempt'; // Depends on holding period and amount
}

const STCG_TAX_RATE = 15; // 15% STCG under Section 111A
const LTCG_TAX_RATE = 20; // 20% LTCG on equities
const LTCG_EXEMPTION = 100000; // ₹1L annual exemption
const CESS_RATE = 4; // 4% cess on LTCG tax
const HOLDING_PERIOD_THRESHOLD = 365; // 1 year = 365 days

class TaxPlanningService {
  /**
   * Calculate holding period in days
   */
  private calculateHoldingPeriod(buyDate: number, sellDate: number): number {
    return Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine gain type (STCG or LTCG)
   */
  private determineGainType(holdingPeriod: number): 'short-term' | 'long-term' {
    return holdingPeriod >= HOLDING_PERIOD_THRESHOLD ? 'long-term' : 'short-term';
  }

  /**
   * Calculate tax on gains
   */
  private calculateTax(gain: number, gainType: 'short-term' | 'long-term'): number {
    if (gain <= 0) return 0;

    if (gainType === 'short-term') {
      // STCG at slab rate (assuming 15% bracket)
      return gain * (STCG_TAX_RATE / 100);
    } else {
      // LTCG with ₹1L exemption
      const taxableGain = Math.max(0, gain - LTCG_EXEMPTION);
      const baseTax = taxableGain * (LTCG_TAX_RATE / 100);
      const cess = baseTax * (CESS_RATE / 100);
      return baseTax + cess;
    }
  }

  /**
   * Calculate tax summary for portfolio
   */
  calculateTaxSummary(holdings: Array<{ ticker: string; quantity: number; buyPrice: number; currentPrice: number; buyDate: number }>): TaxSummary {
    const gains: TaxableGain[] = [];
    let totalGains = 0;
    let shortTermGains = 0;
    let longTermGains = 0;
    let totalSTCGTax = 0;
    let totalLTCGTax = 0;

    const saleDate = Date.now();

    holdings.forEach((holding) => {
      const gain = (holding.currentPrice - holding.buyPrice) * holding.quantity;
      const holdingPeriod = this.calculateHoldingPeriod(holding.buyDate, saleDate);
      const gainType = this.determineGainType(holdingPeriod);
      const tax = this.calculateTax(gain, gainType);

      totalGains += gain;

      if (gainType === 'short-term') {
        shortTermGains += gain;
        totalSTCGTax += tax;
      } else {
        longTermGains += gain;
        totalLTCGTax += tax;
      }

      gains.push({
        ticker: holding.ticker,
        quantity: holding.quantity,
        buyPrice: holding.buyPrice,
        currentPrice: holding.currentPrice,
        holdingPeriod,
        purchaseDate: holding.buyDate,
        saleDate,
        gain,
        gainPercent: (gain / (holding.buyPrice * holding.quantity)) * 100,
        gainType,
        stcgTax: gainType === 'short-term' ? tax : 0,
        ltcgTax: gainType === 'long-term' ? tax : 0,
      });
    });

    const totalTax = totalSTCGTax + totalLTCGTax;
    const netGains = totalGains - totalTax;
    const effectiveTaxRate = totalGains > 0 ? (totalTax / totalGains) * 100 : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (shortTermGains > 0) {
      recommendations.push(`🔴 Short-term gains: ₹${shortTermGains.toLocaleString('en-IN')}. Tax: ₹${totalSTCGTax.toLocaleString('en-IN')} (15%). Consider holding until 12 months for LTCG benefit.`);
    }

    if (longTermGains > 0 && longTermGains > LTCG_EXEMPTION) {
      recommendations.push(`🟢 Long-term gains: ₹${longTermGains.toLocaleString('en-IN')}. Tax: ₹${totalLTCGTax.toLocaleString('en-IN')} (20% + cess). You've exceeded ₹1L LTCG exemption.`);
    }

    if (totalGains > 100000) {
      recommendations.push(`💡 High gains detected. Consider Section 80C deductions (PPF, ELSS) to offset tax liability.`);
    }

    if (shortTermGains > longTermGains) {
      recommendations.push(`📊 Your portfolio is heavily short-term. Diversify holdings to include long-term positions for tax efficiency.`);
    }

    return {
      totalGains,
      shortTermGains,
      longTermGains,
      totalSTCGTax,
      totalLTCGTax,
      totalTax,
      netGains,
      effectiveTaxRate,
      recommendations,
    };
  }

  /**
   * Get tax-loss harvesting opportunities
   */
  getTaxLossHarvestingOpportunities(holdings: Array<{ ticker: string; currentPrice: number; buyPrice: number; gain: number }>): Array<{
    ticker: string;
    loss: number;
    lossPercent: number;
    harvestable: boolean;
  }> {
    return holdings
      .filter((h) => h.gain < 0)
      .map((h) => ({
        ticker: h.ticker,
        loss: h.gain,
        lossPercent: (h.gain / (h.buyPrice * h.gain / (h.currentPrice - h.buyPrice))) * 100,
        harvestable: Math.abs(h.gain) > 10000, // Only show losses > ₹10k
      }));
  }

  /**
   * Get optimal portfolio structure for tax efficiency
   */
  getTaxOptimizationStrategy(totalIncome: number, gains: number): string[] {
    const strategies: string[] = [];

    // Income slab based recommendations
    if (totalIncome < 500000) {
      strategies.push('💰 In lowest tax bracket. You may have room for more STCG without impact.');
    } else if (totalIncome < 1000000) {
      strategies.push('📈 Consider harvest losses to offset gains and stay in lower bracket.');
    } else {
      strategies.push('⚠️ High income bracket. Maximize LTCG benefit to reduce tax burden.');
    }

    // Gain amount recommendations
    if (gains > 1000000) {
      strategies.push('🏛️ Large gains detected. Consult CA for Section 54 (property reinvestment) and other relief options.');
    }

    if (gains < -500000) {
      strategies.push('📉 Significant losses. Can be carried forward 8 years to offset future gains.');
    }

    return strategies;
  }
}

export const taxPlanningService = new TaxPlanningService();
