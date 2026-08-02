// src/services/PredictionTargetFramework.ts
// Production Prediction Target Framework.
// Defines and computes training targets: 7D return, 30D return, 90D return, Risk Adjusted return, and Drawdown.

export interface PredictionTargets {
  return7D: number;
  return30D: number;
  return90D: number;
  riskAdjustedReturn30D: number;
  drawdownProbability30D: number;
}

export class PredictionTargetFramework {
  /**
   * Calculates target variables for a given index in a historical price series.
   */
  calculateTargets(
    prices: { close: number }[],
    volatility20D: number[],
    currentIndex: number
  ): PredictionTargets | null {
    const n = prices.length;
    const closeToday = prices[currentIndex].close;

    // Check if we have enough look-ahead data for each horizon
    const has7D = currentIndex + 7 < n;
    const has30D = currentIndex + 30 < n;
    const has90D = currentIndex + 90 < n;

    if (!has7D) return null;

    const close7D = prices[currentIndex + 7].close;
    const return7D = (close7D - closeToday) / closeToday;

    const return30D = has30D ? (prices[currentIndex + 30].close - closeToday) / closeToday : 0;
    const return90D = has90D ? (prices[currentIndex + 90].close - closeToday) / closeToday : 0;

    // Risk Adjusted Return: 30D Return / Volatility
    const vol = volatility20D[currentIndex] || 0.15;
    const riskAdjustedReturn30D = vol > 0 ? return30D / vol : 0;

    // Drawdown Probability: Check if price drops > 5% anytime in the next 30 days
    let maxDrawdown = 0;
    const maxLook = has30D ? 30 : n - currentIndex - 1;
    for (let d = 1; d <= maxLook; d++) {
      const closeFuture = prices[currentIndex + d].close;
      const drawdown = (closeFuture - closeToday) / closeToday;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    // Drawdown probability as a binary indicator target: 1 if drawdown exceeds 5%, else 0
    const drawdownProbability30D = maxDrawdown < -0.05 ? 1.0 : 0.0;

    return {
      return7D,
      return30D,
      return90D,
      riskAdjustedReturn30D,
      drawdownProbability30D,
    };
  }
}

export const predictionTargetFramework = new PredictionTargetFramework();
export default predictionTargetFramework;
