/**
 * XIRRCalculator — Extended Internal Rate of Return for portfolios
 *
 * Calculates the true annualized return of a portfolio considering
 * irregular cash flows (buys/sells at different dates).
 *
 * Uses Newton-Raphson method to solve for IRR.
 */

export interface CashFlow {
  date: Date;
  amount: number;
  note?: string;
}

export interface XIRRResult {
  xirr: number;
  totalInvested: number;
  currentValue: number;
  absoluteReturn: number;
  absoluteReturnPercent: number;
  yearsHeld: number;
  cagr: number;
  iterations: number;
  converged: boolean;
}

export class XIRRCalculator {
  private readonly MAX_ITERATIONS = 1000;
  private readonly TOLERANCE = 1e-7;

  calculate(cashFlows: CashFlow[], currentValue: number): XIRRResult {
    const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const flows: CashFlow[] = [...sorted, { date: new Date(), amount: currentValue }];

    const totalInvested = sorted.filter(f => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);
    const totalWithdrawn = sorted.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0);
    const absoluteReturn = currentValue + totalWithdrawn - totalInvested;
    const absoluteReturnPercent = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    const firstDate = sorted[0]?.date || new Date();
    const lastDate = sorted[sorted.length - 1]?.date || new Date();
    const yearsHeld = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 86400000);

    let rate = 0.1;
    let converged = false;
    let iterations = 0;

    for (let i = 0; i < this.MAX_ITERATIONS; i++) {
      iterations = i + 1;
      let f = 0;
      let fPrime = 0;

      for (const flow of flows) {
        const days = (flow.date.getTime() - firstDate.getTime()) / 86400000;
        const t = days / 365.25;

        if (Math.abs(t) < 1e-10) {
          f += flow.amount;
        } else {
          const factor = Math.pow(1 + rate, t);
          f += flow.amount / factor;
          fPrime -= flow.amount * t / (factor * (1 + rate));
        }
      }

      if (Math.abs(f) < this.TOLERANCE) {
        converged = true;
        break;
      }

      if (Math.abs(fPrime) < 1e-15) break;
      const newRate = rate - f / fPrime;

      if (newRate < -0.9999) {
        rate = -0.5;
      } else if (newRate > 100) {
        rate = 50;
      } else {
        rate = newRate;
      }
    }

    const xirr = rate * 100;
    const cagr = yearsHeld > 0 ? (Math.pow(currentValue / totalInvested, 1 / yearsHeld) - 1) * 100 : 0;

    return {
      xirr: Math.round(xirr * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentValue: Math.round(currentValue * 100) / 100,
      absoluteReturn: Math.round(absoluteReturn * 100) / 100,
      absoluteReturnPercent: Math.round(absoluteReturnPercent * 100) / 100,
      yearsHeld: Math.round(yearsHeld * 100) / 100,
      cagr: Math.round(cagr * 100) / 100,
      iterations,
      converged,
    };
  }

  portfolioFromHoldings(
    holdings: Array<{
      symbol: string;
      quantity: number;
      buyDate: string;
      buyPrice: number;
      currentPrice: number;
    }>,
  ): XIRRResult {
    const cashFlows: CashFlow[] = holdings.map(h => ({
      date: new Date(h.buyDate),
      amount: -(h.quantity * h.buyPrice),
      note: `Buy ${h.symbol}`,
    }));

    const currentValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
    return this.calculate(cashFlows, currentValue);
  }

  calculateSIP(
    monthlyAmount: number,
    months: number,
    currentValue: number,
    startDate?: Date,
  ): XIRRResult {
    const start = startDate || new Date(Date.now() - months * 30 * 86400000);
    const cashFlows: CashFlow[] = [];

    for (let i = 0; i < months; i++) {
      const date = new Date(start.getTime() + i * 30 * 86400000);
      cashFlows.push({ date, amount: -monthlyAmount, note: `SIP installment ${i + 1}` });
    }

    return this.calculate(cashFlows, currentValue);
  }

  calculateLumpSum(
    investedAmount: number,
    investDate: string,
    currentValue: number,
  ): XIRRResult {
    return this.calculate(
      [{ date: new Date(investDate), amount: -investedAmount, note: 'Lump sum investment' }],
      currentValue,
    );
  }
}

export const xirrCalculator = new XIRRCalculator();
