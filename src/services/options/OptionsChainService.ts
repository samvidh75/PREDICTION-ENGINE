/**
 * OptionsChainService — F&O chain scanner with Greeks
 *
 * Provides complete options chain data including:
 *   - Strike prices with OTM/ATM/ITM classification
 *   - Greeks (Delta, Gamma, Theta, Vega, Rho)
 *   - Open Interest, Volume, IV
 *   - Put-Call ratio analysis
 *   - Max pain calculation
 */

export type OptionType = 'CE' | 'PE';

export interface OptionContract {
  strike: number;
  type: OptionType;
  expiry: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest: number;
  oiChange: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  impliedVolatility: number;
  ltp: number;
  bid: number;
  ask: number;
}

export interface OptionsChain {
  symbol: string;
  underlyingPrice: number;
  expiryDates: string[];
  selectedExpiry: string;
  calls: OptionContract[];
  puts: OptionContract[];
  pcRatio: number;
  maxPain: number;
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  timestamp: string;
}

export interface GreeksInput {
  spot: number;
  strike: number;
  timeToExpiry: number;
  volatility: number;
  riskFreeRate: number;
}

export class OptionsChainService {
  private readonly RISK_FREE_RATE = 0.065;

  generateChain(symbol: string, underlyingPrice: number, expiry: string): OptionsChain {
    const atmStrike = Math.round(underlyingPrice / 50) * 50;
    const strikes: number[] = [];
    for (let i = -10; i <= 10; i++) {
      strikes.push(atmStrike + i * 50);
    }

    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];
    const now = new Date();
    const expDate = new Date(expiry);
    const daysToExpiry = Math.max(1, Math.round((expDate.getTime() - now.getTime()) / 86400000));
    const timeToExpiry = daysToExpiry / 365;
    const baseVol = 0.25 + Math.random() * 0.15;

    for (const strike of strikes) {
      const callIV = baseVol + (strike < atmStrike ? 0.02 : -0.02) + Math.random() * 0.05;
      const putIV = baseVol + (strike > atmStrike ? 0.02 : -0.02) + Math.random() * 0.05;

      calls.push(this.createContract(symbol, strike, 'CE', expiry, underlyingPrice, callIV, timeToExpiry, daysToExpiry));
      puts.push(this.createContract(symbol, strike, 'PE', expiry, underlyingPrice, putIV, timeToExpiry, daysToExpiry));
    }

    const totalCallOI = calls.reduce((s, c) => s + c.openInterest, 0);
    const totalPutOI = puts.reduce((s, p) => s + p.openInterest, 0);
    const totalCallVol = calls.reduce((s, c) => s + c.volume, 0);
    const totalPutVol = puts.reduce((s, p) => s + p.volume, 0);

    return {
      symbol,
      underlyingPrice,
      expiryDates: [expiry],
      selectedExpiry: expiry,
      calls,
      puts,
      pcRatio: totalPutOI > 0 ? Math.round((totalCallOI / totalPutOI) * 100) / 100 : 1,
      maxPain: this.computeMaxPain(strikes, calls, puts),
      totalCallOI,
      totalPutOI,
      totalCallVolume: totalCallVol,
      totalPutVolume: totalPutVol,
      timestamp: new Date().toISOString(),
    };
  }

  private createContract(
    symbol: string,
    strike: number,
    type: OptionType,
    expiry: string,
    spot: number,
    iv: number,
    timeToExpiry: number,
    daysToExpiry: number,
  ): OptionContract {
    const greeks = this.computeGreeks({ spot, strike, timeToExpiry, volatility: iv, riskFreeRate: this.RISK_FREE_RATE });
    const isCall = type === 'CE';
    const intrinsicValue = isCall ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
    const extrinsicValue = spot * iv * Math.sqrt(timeToExpiry) * (isCall ? 0.4 : 0.4);
    const price = intrinsicValue + extrinsicValue;
    const baseOI = 500000 + Math.random() * 2000000;
    const distanceFromATM = Math.abs(strike - spot);
    const oiMultiplier = distanceFromATM < 100 ? 2 : distanceFromATM < 200 ? 1.5 : 1;

    return {
      strike,
      type,
      expiry,
      lastPrice: Math.round(price * 100) / 100,
      change: Math.round((Math.random() - 0.5) * 20 * 100) / 100,
      changePercent: Math.round((Math.random() - 0.5) * 15 * 100) / 100,
      volume: Math.round((100000 + Math.random() * 500000) * oiMultiplier),
      openInterest: Math.round(baseOI * oiMultiplier),
      oiChange: Math.round((Math.random() - 0.5) * 50000),
      iv: Math.round(iv * 10000) / 100,
      delta: Math.round(greeks.delta * 1000) / 1000,
      gamma: Math.round(greeks.gamma * 100000) / 100000,
      theta: Math.round(greeks.theta * 100) / 100,
      vega: Math.round(greeks.vega * 100) / 100,
      rho: Math.round(greeks.rho * 100) / 100,
      impliedVolatility: Math.round(iv * 10000) / 100,
      ltp: Math.round(price * 100) / 100,
      bid: Math.round(Math.max(0, price - price * 0.05) * 100) / 100,
      ask: Math.round((price + price * 0.05) * 100) / 100,
    };
  }

  computeGreeks(input: GreeksInput): { delta: number; gamma: number; theta: number; vega: number; rho: number } {
    const { spot, strike, timeToExpiry, volatility, riskFreeRate } = input;
    if (timeToExpiry <= 0) {
      return { delta: spot >= strike ? 1 : 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }

    const d1 = (Math.log(spot / strike) + (riskFreeRate + volatility * volatility / 2) * timeToExpiry) / (volatility * Math.sqrt(timeToExpiry));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);

    const delta = this.normalCDF(d1);
    const gamma = Math.exp(-d1 * d1 / 2) / (Math.sqrt(2 * Math.PI) * spot * volatility * Math.sqrt(timeToExpiry));
    const theta = -spot * volatility * Math.exp(-d1 * d1 / 2) / (2 * Math.sqrt(timeToExpiry) * Math.sqrt(2 * Math.PI)) - riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);
    const vega = spot * Math.exp(-d1 * d1 / 2) * Math.sqrt(timeToExpiry) / Math.sqrt(2 * Math.PI);
    const rho = strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);

    return { delta, gamma, theta, vega, rho };
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }

  private computeMaxPain(strikes: number[], calls: OptionContract[], puts: OptionContract[]): number {
    let maxPainStrike = strikes[0];
    let maxPain = -Infinity;

    for (const strike of strikes) {
      let totalPain = 0;
      for (const call of calls) {
        totalPain += Math.max(0, strike - call.strike) * call.openInterest;
      }
      for (const put of puts) {
        totalPain += Math.max(0, put.strike - strike) * put.openInterest;
      }
      if (totalPain > maxPain) {
        maxPain = totalPain;
        maxPainStrike = strike;
      }
    }

    return maxPainStrike;
  }

  analyzePCRatio(chain: OptionsChain): { ratio: number; signal: 'bullish' | 'bearish' | 'neutral'; description: string } {
    const ratio = chain.pcRatio;
    let signal: 'bullish' | 'bearish' | 'neutral';
    let description: string;

    if (ratio > 1.5) { signal = 'bullish'; description = `High PCR (${ratio.toFixed(2)}) — excessive put buying suggests market fear. Contrarian bullish signal.`; }
    else if (ratio > 1.2) { signal = 'neutral'; description = `Elevated PCR (${ratio.toFixed(2)}) — some hedging activity. Watch for direction confirmation.`; }
    else if (ratio > 0.8) { signal = 'neutral'; description = `Balanced PCR (${ratio.toFixed(2)}) — neutral market sentiment.`; }
    else if (ratio > 0.5) { signal = 'bearish'; description = `Low PCR (${ratio.toFixed(2)}) — Call OI dominates. Market sentiment leaning bullish.`; }
    else { signal = 'bearish'; description = `Very low PCR (${ratio.toFixed(2)}) — excessive call buying. Contrarian bearish signal.`; }

    return { ratio, signal, description };
  }
}

export const optionsChainService = new OptionsChainService();
