export type TechnicalState =
  | "Strong momentum"
  | "Improving"
  | "Neutral"
  | "Weakening"
  | "Risk rising"
  | "Not enough information";

export interface TechnicalCheck {
  label: string;
  status: "positive" | "neutral" | "risk";
  detail: string;
}

export interface TechnicalIntelligenceView {
  state: TechnicalState;
  score: number | null;
  checks: TechnicalCheck[];
  topDrivers: string[];
  riskFlags: string[];
  activeFactorCount: number;
  explanation: string;
}

export interface TechnicalInput {
  priceHistory: { close: number; volume?: number }[];
  momentumScore: number | null;
  volatilityScore: number | null;
  rsiValue: number | null;
  macdValue: number | null;
  priceChangePercent: number | null;
  distanceFrom52WeekHigh: number | null;
}

function computeSimpleRSI(prices: number[], periods: number): number | null {
  if (prices.length < periods + 1) return null;
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recentChanges = changes.slice(-periods);
  const gains = recentChanges.filter((c) => c > 0).reduce((s, c) => s + c, 0);
  const losses = recentChanges.filter((c) => c < 0).reduce((s, c) => s - c, 0);
  const avgGain = gains / periods;
  const avgLoss = losses / periods;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

function computeSimpleMACD(prices: number[]): { macd: number; signal: number } | null {
  if (prices.length < 26) return null;
  const ema12 = computeEMA(prices, 12);
  const ema26 = computeEMA(prices, 26);
  if (ema12 === null || ema26 === null) return null;
  const macdLine = ema12 - ema26;
  const signalLine = computeEMA(
    prices.map((_, i) => {
      const e12 = computeEMA(prices.slice(0, i + 1), 12);
      const e26 = computeEMA(prices.slice(0, i + 1), 26);
      return e12 !== null && e26 !== null ? e12 - e26 : 0;
    }).filter((v) => v !== 0),
    9
  );
  return { macd: Math.round(macdLine * 100) / 100, signal: signalLine !== null ? Math.round(signalLine * 100) / 100 : 0 };
}

function computeEMA(prices: number[], periods: number): number | null {
  if (prices.length < periods) return null;
  const k = 2 / (periods + 1);
  let ema = prices.slice(0, periods).reduce((s, p) => s + p, 0) / periods;
  for (let i = periods; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export function buildTechnicalIntelligence(input: TechnicalInput): TechnicalIntelligenceView {
  const checks: TechnicalCheck[] = [];
  const topDrivers: string[] = [];
  const riskFlags: string[] = [];

  const prices = input.priceHistory;
  const enoughPriceData = prices.length >= 20;

  if (!enoughPriceData && input.momentumScore === null && input.volatilityScore === null) {
    return {
      state: "Not enough information",
      score: null,
      checks: [],
      topDrivers: [],
      riskFlags: [],
      activeFactorCount: 0,
      explanation: "Insufficient price history and factor data to assess technical condition.",
    };
  }

  const closingPrices = prices.map((p) => p.close);
  const volumes = prices.map((p) => p.volume).filter((v): v is number => v !== undefined);

  if (closingPrices.length >= 14) {
    const rsi = input.rsiValue ?? computeSimpleRSI(closingPrices, 14);
    if (rsi !== null) {
      checks.push({
        label: "RSI context",
        status: rsi >= 60 ? "positive" : rsi >= 40 ? "neutral" : "risk",
        detail: rsi >= 70 ? "Approaching overbought" : rsi <= 30 ? "Approaching oversold" : `${rsi} - neutral range`,
      });
      if (rsi >= 60) topDrivers.push("Momentum strength");
      if (rsi <= 30) riskFlags.push("RSI oversold territory");
    }
  }

  if (closingPrices.length >= 26) {
    const macdResult = input.macdValue !== null ? { macd: input.macdValue, signal: 0 } : computeSimpleMACD(closingPrices);
    if (macdResult !== null) {
      const macdPositive = macdResult.macd > 0;
      checks.push({
        label: "MACD context",
        status: macdPositive ? "positive" : "risk",
        detail: macdPositive
          ? "Positive momentum indication"
          : "Negative momentum indication",
      });
      if (macdPositive) topDrivers.push("MACD positive");
      else riskFlags.push("MACD negative");
    }
  }

  if (closingPrices.length >= 50) {
    const sma50 = computeEMA(closingPrices, 50);
    const lastPrice = closingPrices[closingPrices.length - 1];
    if (sma50 !== null && lastPrice !== undefined) {
      const aboveSMA = lastPrice >= sma50;
      checks.push({
        label: "Moving average trend",
        status: aboveSMA ? "positive" : "risk",
        detail: aboveSMA
          ? "Price above 50-period average"
          : "Price below 50-period average",
      });
      if (aboveSMA) topDrivers.push("Above key moving average");
      else riskFlags.push("Below key moving average");
    }
  }

  if (input.priceChangePercent !== null) {
    checks.push({
      label: "Price change",
      status: input.priceChangePercent >= 0 ? "positive" : "risk",
      detail: `${input.priceChangePercent >= 0 ? "+" : ""}${input.priceChangePercent.toFixed(1)}% recent change`,
    });
    if (input.priceChangePercent >= 5) topDrivers.push("Recent price strength");
    if (input.priceChangePercent <= -5) riskFlags.push("Recent price decline");
  }

  if (volumes.length >= 10) {
    const recentAvg = volumes.slice(-5).reduce((s, v) => s + v, 0) / 5;
    const olderAvg = volumes.slice(-10, -5).reduce((s, v) => s + v, 0) / 5;
    if (olderAvg > 0) {
      const volRatio = recentAvg / olderAvg;
      checks.push({
        label: "Volume trend",
        status: volRatio >= 0.8 ? "neutral" : "risk",
        detail: volRatio >= 1.2
          ? "Above average volume"
          : volRatio >= 0.8
            ? "Normal volume range"
            : "Below average volume",
      });
    }
  }

  if (input.volatilityScore !== null) {
    checks.push({
      label: "Volatility context",
      status: input.volatilityScore >= 65 ? "risk" : input.volatilityScore >= 40 ? "neutral" : "positive",
      detail: input.volatilityScore >= 65
        ? "Elevated volatility"
        : input.volatilityScore <= 35
          ? "Low volatility"
          : "Moderate volatility",
    });
    if (input.volatilityScore >= 65) riskFlags.push("Elevated volatility");
    if (input.volatilityScore <= 35) topDrivers.push("Low volatility");
  }

  if (input.distanceFrom52WeekHigh !== null) {
    checks.push({
      label: "52-week high distance",
      status: input.distanceFrom52WeekHigh <= 10 ? "positive" : input.distanceFrom52WeekHigh <= 30 ? "neutral" : "risk",
      detail: input.distanceFrom52WeekHigh <= 5
        ? "Near 52-week high"
        : input.distanceFrom52WeekHigh <= 15
          ? "Close to 52-week high"
          : input.distanceFrom52WeekHigh <= 30
            ? "Moderate distance from high"
            : "Far from 52-week high",
    });
  }

  const positiveCount = checks.filter((c) => c.status === "positive").length;
  const riskCount = checks.filter((c) => c.status === "risk").length;
  const neutralCount = checks.filter((c) => c.status === "neutral").length;
  const totalChecked = checks.length;

  const momentumScore = input.momentumScore;
  const score = momentumScore !== null
    ? momentumScore
    : totalChecked > 0
      ? Math.round((positiveCount / totalChecked) * 100)
      : null;

  let state: TechnicalState;
  if (score === null || (totalChecked === 0 && input.momentumScore === null && input.volatilityScore === null && input.priceChangePercent === null)) {
    state = "Not enough information";
  } else if (positiveCount >= totalChecked * 0.6 && riskCount === 0) {
    state = "Strong momentum";
  } else if (positiveCount >= totalChecked * 0.5 && riskCount <= 1) {
    state = "Improving";
  } else if (riskCount >= totalChecked * 0.5) {
    state = "Risk rising";
  } else if (riskCount > positiveCount) {
    state = "Weakening";
  } else {
    state = "Neutral";
  }

  const explanation = buildExplanation(state, positiveCount, riskCount, totalChecked);

  return {
    state,
    score,
    checks,
    topDrivers: [...new Set(topDrivers)],
    riskFlags: [...new Set(riskFlags)],
    activeFactorCount: checks.length,
    explanation,
  };
}

function buildExplanation(state: TechnicalState, positive: number, risk: number, total: number): string {
  switch (state) {
    case "Strong momentum":
      return "Multiple technical indicators show aligned positive signals with minimal risk flags.";
    case "Improving":
      return "Technical condition is constructive with more positive than risk indicators.";
    case "Neutral":
      return "Mixed technical signals with balanced positive and risk indicators.";
    case "Weakening":
      return "Risk indicators outnumber positive signals. Monitor for further deterioration.";
    case "Risk rising":
      return "Technical risk signals are dominant. Review before further commitment.";
    default:
      return "Not enough information to assess technical condition.";
  }
}
