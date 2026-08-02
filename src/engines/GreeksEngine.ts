export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface PortfolioGreeks {
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  netRho: number;
  deltaExposure: number;
  gammaExposure: number;
  thetaDecay: number;
  vegaExposure: number;
}

export interface PositionForGreeks {
  symbol: string;
  spotPrice: number;
  strike: number;
  timeToExpiry: number;
  volatility: number;
  optionType: 'call' | 'put';
  riskFreeRate: number;
  quantity: number;
  positionType: 'long' | 'short';
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export class GreeksEngine {
  computeOptionsGreeks(position: PositionForGreeks): OptionGreeks {
    const {
      spotPrice, strike, timeToExpiry, volatility,
      optionType, riskFreeRate,
    } = position;

    const t = Math.max(timeToExpiry, 0.0001);
    const sigma = Math.max(volatility, 0.0001);
    const d1 = (Math.log(spotPrice / strike) + (riskFreeRate + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
    const d2 = d1 - sigma * Math.sqrt(t);

    const isCall = optionType === 'call';

    const delta = isCall ? normalCDF(d1) : normalCDF(d1) - 1;
    const gamma = normalPDF(d1) / (spotPrice * sigma * Math.sqrt(t));
    const vega = spotPrice * normalPDF(d1) * Math.sqrt(t) / 100;
    const thetaNum = -(spotPrice * normalPDF(d1) * sigma) / (2 * Math.sqrt(t))
      - (isCall ? 1 : -1) * riskFreeRate * strike * Math.exp(-riskFreeRate * t) * normalCDF(isCall ? d2 : -d2);
    const theta = thetaNum / 365;
    const rho = (isCall ? 1 : -1) * strike * t * Math.exp(-riskFreeRate * t) * normalCDF(isCall ? d2 : -d2) / 100;

    return { delta, gamma, theta, vega, rho };
  }

  computePortfolioGreeks(positions: PositionForGreeks[]): PortfolioGreeks {
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    let netRho = 0;

    for (const pos of positions) {
      const greeks = this.computeOptionsGreeks(pos);
      const sign = pos.positionType === 'long' ? 1 : -1;

      netDelta += greeks.delta * pos.quantity * sign;
      netGamma += greeks.gamma * pos.quantity * sign;
      netTheta += greeks.theta * pos.quantity * sign;
      netVega += greeks.vega * pos.quantity * sign;
      netRho += greeks.rho * pos.quantity * sign;
    }

    return {
      netDelta,
      netGamma,
      netTheta,
      netVega,
      netRho,
      deltaExposure: netDelta,
      gammaExposure: netGamma * 100,
      thetaDecay: netTheta,
      vegaExposure: netVega * 100,
    };
  }

  computeRiskDecomposition(positions: PositionForGreeks[]): {
    greeks: PortfolioGreeks;
    largestDelta: { symbol: string; delta: number } | null;
    largestGamma: { symbol: string; gamma: number } | null;
    directionalBias: 'bullish' | 'bearish' | 'neutral';
  } {
    const greeks = this.computePortfolioGreeks(positions);

    let largestDelta: { symbol: string; delta: number } | null = null;
    let largestGamma: { symbol: string; gamma: number } | null = null;

    for (const pos of positions) {
      const g = this.computeOptionsGreeks(pos);
      const sign = pos.positionType === 'long' ? 1 : -1;
      const adjDelta = g.delta * pos.quantity * sign;

      if (!largestDelta || Math.abs(adjDelta) > Math.abs(largestDelta.delta)) {
        largestDelta = { symbol: pos.symbol, delta: adjDelta };
      }

      const adjGamma = g.gamma * pos.quantity * sign;
      if (!largestGamma || Math.abs(adjGamma) > Math.abs(largestGamma.gamma)) {
        largestGamma = { symbol: pos.symbol, gamma: adjGamma };
      }
    }

    const directionalBias = Math.abs(greeks.netDelta) < 0.1 ? 'neutral'
      : greeks.netDelta > 0 ? 'bullish' : 'bearish';

    return { greeks, largestDelta, largestGamma, directionalBias };
  }
}

export const greeksEngine = new GreeksEngine();
