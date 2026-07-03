/**
 * BacktestEngine — Strategy backtesting on historical data
 *
 * Allows users to test investment strategies on historical data:
 *   - Moving Average crossover
 *   - RSI-based entry/exit
 *   - MACD crossover
 *   - Bollinger Band breakout
 *   - Buy & Hold benchmark
 *   - Custom strategy builder
 */

export type StrategyType = 'ma_crossover' | 'rsi' | 'macd' | 'bollinger' | 'buy_hold';

export interface BacktestInput {
  symbol: string;
  strategy: StrategyType;
  startDate: string;
  endDate: string;
  initialCapital: number;
  params: Record<string, number>;
}

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  side: 'buy' | 'sell';
  reason: string;
}

export interface BacktestResult {
  symbol: string;
  strategy: StrategyType;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturns: number;
  totalReturnsPercent: number;
  cagr: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; value: number }[];
  buyHoldReturns: number;
  buyHoldCagr: number;
  alpha: number;
  benchmarkSymbol?: string;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class BacktestEngine {
  async run(input: BacktestInput, priceBars: PriceBar[]): Promise<BacktestResult> {
    const sorted = [...priceBars].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const filtered = sorted.filter(b => b.date >= input.startDate && b.date <= input.endDate);
    if (filtered.length < 50) {
      throw new Error(`Insufficient data: need at least 50 bars, got ${filtered.length}`);
    }

    const closes = filtered.map(b => b.close);
    const equity: { date: string; value: number }[] = [];
    const trades: BacktestTrade[] = [];
    let capital = input.initialCapital;
    let peak = capital;
    let maxDrawdown = 0;
    let position = 0;
    let entryPrice = 0;
    let entryDate = '';
    let tradeCount = 0;
    let wins = 0;
    let losses = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;

    const computeSMA = (data: number[], period: number, idx: number): number => {
      if (idx < period) return 0;
      return data.slice(idx - period, idx).reduce((a, b) => a + b, 0) / period;
    };

    const computeRSI = (data: number[], period: number, idx: number): number => {
      if (idx < period + 1) return 50;
      let gains = 0, losses = 0;
      for (let i = idx - period; i < idx; i++) {
        const delta = data[i] - data[i - 1];
        if (delta > 0) gains += delta;
        else losses -= delta;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      return 100 - 100 / (1 + avgGain / avgLoss);
    };

    const computeMACD = (data: number[], idx: number): { macd: number; signal: number } => {
      if (idx < 26) return { macd: 0, signal: 0 };

      const ema = (vals: number[], period: number): number => {
        if (vals.length < period) return vals.reduce((a, b) => a + b, 0) / vals.length;
        const mult = 2 / (period + 1);
        let ema = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
        for (let i = period; i < vals.length; i++) ema = (vals[i] - ema) * mult + ema;
        return ema;
      };

      const recent12 = data.slice(Math.max(0, idx - 12), idx + 1);
      const recent26 = data.slice(Math.max(0, idx - 26), idx + 1);
      const macdLine = ema(recent12, 12) - ema(recent26, 26);
      const signal = ema([macdLine], 9);
      return { macd: macdLine, signal };
    };

    const calculateReturns = (data: number[]): { totalReturn: number; cagr: number } => {
      if (data.length < 2) return { totalReturn: 0, cagr: 0 };
      const totalReturn = ((data[data.length - 1] - data[0]) / data[0]) * 100;
      const years = (data.length - 1) / 252;
      const cagr = years > 0 ? (Math.pow(data[data.length - 1] / data[0], 1 / years) - 1) * 100 : 0;
      return { totalReturn, cagr };
    };

    for (let i = 50; i < filtered.length; i++) {
      const bar = filtered[i];
      const signal = this.getSignal(input.strategy, closes, i, input.params);

      if (signal === 'buy' && position === 0) {
        position = Math.floor(capital / bar.close);
        if (position > 0) {
          capital -= position * bar.close;
          entryPrice = bar.close;
          entryDate = bar.date;
          tradeCount++;
        }
      } else if (signal === 'sell' && position > 0) {
        const pnl = position * bar.close - position * entryPrice;
        const pnlPercent = ((bar.close - entryPrice) / entryPrice) * 100;
        capital += position * bar.close;

        trades.push({
          entryDate,
          entryPrice,
          exitDate: bar.date,
          exitPrice: bar.close,
          quantity: position,
          pnl: Math.round(pnl * 100) / 100,
          pnlPercent: Math.round(pnlPercent * 100) / 100,
          side: 'buy',
          reason: this.getSignalName(input.strategy, input.params),
        });

        if (pnl >= 0) { wins++; totalWinAmount += pnl; }
        else { losses++; totalLossAmount += Math.abs(pnl); }

        position = 0;
      }

      const totalValue = capital + position * bar.close;
      equity.push({ date: bar.date, value: Math.round(totalValue * 100) / 100 });

      if (totalValue > peak) peak = totalValue;
      const drawdown = peak - totalValue;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    if (position > 0) {
      capital += position * filtered[filtered.length - 1].close;
    }

    const finalCapital = capital;
    const totalReturns = finalCapital - input.initialCapital;
    const totalReturnsPercent = (totalReturns / input.initialCapital) * 100;
    const years = (filtered.length - 1) / 252;
    const cagr = years > 0 ? (Math.pow(finalCapital / input.initialCapital, 1 / years) - 1) * 100 : 0;
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    const dailyReturns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      dailyReturns.push((equity[i].value - equity[i - 1].value) / equity[i - 1].value);
    }
    const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const variance = dailyReturns.length > 0 ? dailyReturns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / dailyReturns.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn * 252) / (stdDev * Math.sqrt(252)) : 0;

    const bhReturns = calculateReturns(closes);
    const alpha = cagr - bhReturns.cagr;

    return {
      symbol: input.symbol,
      strategy: input.strategy,
      startDate: input.startDate,
      endDate: input.endDate,
      initialCapital: input.initialCapital,
      finalCapital: Math.round(finalCapital * 100) / 100,
      totalReturns: Math.round(totalReturns * 100) / 100,
      totalReturnsPercent: Math.round(totalReturnsPercent * 100) / 100,
      cagr: Math.round(cagr * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      winRate: tradeCount > 0 ? Math.round((wins / tradeCount) * 10000) / 100 : 0,
      totalTrades: tradeCount,
      winningTrades: wins,
      losingTrades: losses,
      avgWin: wins > 0 ? Math.round((totalWinAmount / wins) * 100) / 100 : 0,
      avgLoss: losses > 0 ? Math.round((totalLossAmount / losses) * 100) / 100 : 0,
      profitFactor: totalLossAmount > 0 ? Math.round((totalWinAmount / totalLossAmount) * 100) / 100 : wins > 0 ? Infinity : 0,
      trades,
      equityCurve: equity,
      buyHoldReturns: Math.round(bhReturns.totalReturn * 100) / 100,
      buyHoldCagr: Math.round(bhReturns.cagr * 100) / 100,
      alpha: Math.round(alpha * 100) / 100,
    };
  }

  private getSignal(strategy: StrategyType, prices: number[], idx: number, params: Record<string, number>): 'buy' | 'sell' | null {
    switch (strategy) {
      case 'ma_crossover': {
        const fastPeriod = params.fastPeriod || 20;
        const slowPeriod = params.slowPeriod || 50;
        const fastSMA = this.computeSMA(prices, fastPeriod, idx);
        const slowSMA = this.computeSMA(prices, slowPeriod, idx);
        const prevFastSMA = this.computeSMA(prices, fastPeriod, idx - 1);
        const prevSlowSMA = this.computeSMA(prices, slowPeriod, idx - 1);
        if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) return 'buy';
        if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) return 'sell';
        return null;
      }
      case 'rsi': {
        const period = params.period || 14;
        const oversold = params.oversold || 30;
        const overbought = params.overbought || 70;
        const rsi = this.computeRSI(prices, period, idx);
        const prevRsi = this.computeRSI(prices, period, idx - 1);
        if (prevRsi <= oversold && rsi > oversold) return 'buy';
        if (prevRsi >= overbought && rsi < overbought) return 'sell';
        return null;
      }
      case 'macd': {
        const macd = this.computeMACD(prices, idx);
        const prevMacd = this.computeMACD(prices, idx - 1);
        if (prevMacd.macd <= prevMacd.signal && macd.macd > macd.signal) return 'buy';
        if (prevMacd.macd >= prevMacd.signal && macd.macd < macd.signal) return 'sell';
        return null;
      }
      case 'bollinger': {
        const period = params.period || 20;
        const stdDev = params.stdDev || 2;
        const sma = this.computeSMA(prices, period, idx);
        const slice = prices.slice(idx - period, idx);
        const variance = slice.reduce((sum, val) => sum + (val - sma) ** 2, 0) / slice.length;
        const sd = Math.sqrt(variance);
        const lower = sma - stdDev * sd;
        const upper = sma + stdDev * sd;
        const prevClose = prices[idx - 1];
        if (prevClose <= lower && prices[idx] > lower) return 'buy';
        if (prevClose >= upper && prices[idx] < upper) return 'sell';
        return null;
      }
      case 'buy_hold': {
        if (idx === 50) return 'buy';
        return null;
      }
      default:
        return null;
    }
  }

  private getSignalName(strategy: StrategyType, params: Record<string, number>): string {
    const names: Record<StrategyType, string> = {
      ma_crossover: `MA Crossover (${params.fastPeriod || 20}/${params.slowPeriod || 50})`,
      rsi: `RSI-${params.period || 14} (${params.oversold || 30}/${params.overbought || 70})`,
      macd: 'MACD Crossover',
      bollinger: `Bollinger (${params.period || 20}, ${params.stdDev || 2}σ)`,
      buy_hold: 'Buy & Hold',
    };
    return names[strategy];
  }

  private computeSMA(data: number[], period: number, idx: number): number {
    if (idx < period) return 0;
    return data.slice(idx - period, idx).reduce((a, b) => a + b, 0) / period;
  }

  private computeRSI(data: number[], period: number, idx: number): number {
    if (idx < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = idx - period; i < idx; i++) {
      const delta = data[i] - data[i - 1];
      if (delta > 0) gains += delta;
      else losses -= delta;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
  }

  private computeMACD(data: number[], idx: number): { macd: number; signal: number } {
    if (idx < 26) return { macd: 0, signal: 0 };
    const ema = (vals: number[], period: number): number => {
      if (vals.length < period) return vals.reduce((a, b) => a + b, 0) / vals.length;
      const mult = 2 / (period + 1);
      let ema = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < vals.length; i++) ema = (vals[i] - ema) * mult + ema;
      return ema;
    };
    const recent12 = data.slice(Math.max(0, idx - 12), idx + 1);
    const recent26 = data.slice(Math.max(0, idx - 26), idx + 1);
    const macdLine = ema(recent12, 12) - ema(recent26, 26);
    const signal = ema([macdLine], 9);
    return { macd: macdLine, signal };
  }
}

export const backtestEngine = new BacktestEngine();
