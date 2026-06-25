import type { UnifiedPredictionInput, UnifiedPredictionOutput, UnifiedFactorGroup, UnifiedFactorScore } from "./types"

export interface EngineInput {
  roe:           number | null
  roce:          number | null
  debtToEquity:  number | null
  currentRatio:  number | null
  peRatio:       number | null
  pbRatio:       number | null
  dividendYield: number | null
  revenueGrowth: number | null
  profitGrowth:  number | null
  closes:        number[]
}

export interface FactorResult {
  score: number | null
  reason: string
}

export interface EngineOutput {
  composite: number | null
  classification: 'EXCELLENT'|'HEALTHY'|'STABLE'|'WEAKENING'|'AT_RISK'|'INSUFFICIENT_DATA'
  factorScores: {
    quality:   FactorResult
    valuation: FactorResult
    growth:    FactorResult
    stability: FactorResult
    momentum:  FactorResult
  }
  technicals: {
    rsi14:       number | null
    macd:        number | null
    macdSignal:  number | null
    macdHist:    number | null
    sma20:       number | null
    sma50:       number | null
    aboveSma20:  boolean | null
    aboveSma50:  boolean | null
    rsiZone:     'overbought'|'neutral'|'oversold' | null
    overallSignal: 'bullish'|'neutral'|'bearish' | null
  }
  dataCompleteness: number
  availableWeight:  number
}

function computeQuality(input: EngineInput): FactorResult {
  const { roe, roce, debtToEquity } = input
  if (roe === null && roce === null && debtToEquity === null)
    return { score: null, reason: 'No quality data from providers' }

  let score = 0, possible = 0

  if (roe !== null) {
    possible += 35
    score += roe > 25 ? 35 : roe > 18 ? 28 : roe > 12 ? 20 : roe > 8 ? 12 : 5
  }
  if (roce !== null) {
    possible += 35
    score += roce > 25 ? 35 : roce > 18 ? 28 : roce > 12 ? 20 : roce > 8 ? 12 : 5
  }
  if (debtToEquity !== null) {
    possible += 30
    score += debtToEquity < 0.2 ? 30 : debtToEquity < 0.5 ? 24
          : debtToEquity < 1.0 ? 16 : debtToEquity < 1.5 ? 8 : 2
  }

  return {
    score: possible > 0 ? Math.round((score / possible) * 100) : null,
    reason: `ROE ${roe?.toFixed(1) ?? '—'}% · ROCE ${roce?.toFixed(1) ?? '—'}% · D/E ${debtToEquity?.toFixed(2) ?? '—'}x`
  }
}

function computeValuation(input: EngineInput): FactorResult {
  const { peRatio, pbRatio, dividendYield } = input
  if (peRatio === null && pbRatio === null)
    return { score: null, reason: 'No valuation data from providers' }

  let score = 0, possible = 0

  if (peRatio !== null) {
    possible += 50
    score += peRatio < 12 ? 50 : peRatio < 18 ? 42 : peRatio < 24 ? 34
          : peRatio < 30 ? 24 : peRatio < 40 ? 14 : 6
  }
  if (pbRatio !== null) {
    possible += 35
    score += pbRatio < 1.5 ? 35 : pbRatio < 3 ? 28 : pbRatio < 5 ? 20
          : pbRatio < 8 ? 12 : 5
  }
  if (dividendYield !== null) {
    possible += 15
    score += dividendYield > 3 ? 15 : dividendYield > 2 ? 12
          : dividendYield > 1 ? 8 : dividendYield > 0 ? 4 : 0
  }

  return {
    score: possible > 0 ? Math.round((score / possible) * 100) : null,
    reason: `P/E ${peRatio?.toFixed(1) ?? '—'}x · P/B ${pbRatio?.toFixed(1) ?? '—'}x · Div ${dividendYield?.toFixed(1) ?? '—'}%`
  }
}

function computeGrowth(input: EngineInput): FactorResult {
  const { revenueGrowth, profitGrowth } = input
  if (revenueGrowth === null && profitGrowth === null)
    return { score: null, reason: 'No growth data from providers' }

  let score = 0, possible = 0

  if (revenueGrowth !== null) {
    possible += 50
    score += revenueGrowth > 25 ? 50 : revenueGrowth > 18 ? 42
          : revenueGrowth > 12 ? 34 : revenueGrowth > 8 ? 24
          : revenueGrowth > 4 ? 14 : revenueGrowth > 0 ? 7 : 2
  }
  if (profitGrowth !== null) {
    possible += 50
    score += profitGrowth > 25 ? 50 : profitGrowth > 18 ? 42
          : profitGrowth > 12 ? 34 : profitGrowth > 8 ? 24
          : profitGrowth > 4 ? 14 : profitGrowth > 0 ? 7 : 2
  }

  return {
    score: possible > 0 ? Math.round((score / possible) * 100) : null,
    reason: `Revenue 3Y CAGR ${revenueGrowth?.toFixed(1) ?? '—'}% · Profit 3Y CAGR ${profitGrowth?.toFixed(1) ?? '—'}%`
  }
}

function computeStability(input: EngineInput): FactorResult {
  const { currentRatio, debtToEquity, roce } = input
  if (currentRatio === null && debtToEquity === null)
    return { score: null, reason: 'No stability data from providers' }

  let score = 0, possible = 0

  if (currentRatio !== null) {
    possible += 45
    score += currentRatio > 2.5 ? 45 : currentRatio > 2 ? 38
          : currentRatio > 1.5 ? 30 : currentRatio > 1 ? 20 : 8
  }
  if (debtToEquity !== null) {
    possible += 40
    score += debtToEquity < 0.2 ? 40 : debtToEquity < 0.5 ? 33
          : debtToEquity < 1 ? 24 : debtToEquity < 1.5 ? 14 : 4
  }
  if (roce !== null) {
    possible += 15
    score += roce > 20 ? 15 : roce > 15 ? 12 : roce > 10 ? 8 : 3
  }

  return {
    score: possible > 0 ? Math.round((score / possible) * 100) : null,
    reason: `Current Ratio ${currentRatio?.toFixed(1) ?? '—'}x · D/E ${debtToEquity?.toFixed(2) ?? '—'}x`
  }
}

function computeEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return []
  const k = 2 / (period + 1)
  const ema: number[] = [closes.slice(0, period).reduce((a,b) => a+b, 0) / period]
  for (let i = period; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[ema.length-1] * (1-k))
  }
  return ema
}

function computeRSI(closes: number[], period=14): number | null {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i-1]
    if (d > 0) gains += d; else losses -= d
  }
  let avgGain = gains / period, avgLoss = losses / period
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i-1]
    avgGain = (avgGain * (period-1) + Math.max(d,0)) / period
    avgLoss = (avgLoss * (period-1) + Math.max(-d,0)) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return parseFloat((100 - 100/(1+rs)).toFixed(2))
}

function computeMACD(closes: number[]): { macd:number|null; signal:number|null; hist:number|null } {
  if (closes.length < 35) return { macd:null, signal:null, hist:null }
  const ema12 = computeEMA(closes, 12)
  const ema26 = computeEMA(closes, 26)
  const offset = ema12.length - ema26.length
  const macdLine = ema26.map((v,i) => ema12[i+offset] - v)
  const signalLine = computeEMA(macdLine, 9)
  const last = macdLine[macdLine.length-1]
  const sig  = signalLine[signalLine.length-1]
  return {
    macd:   parseFloat(last.toFixed(4)),
    signal: parseFloat(sig.toFixed(4)),
    hist:   parseFloat((last - sig).toFixed(4)),
  }
}

function computeMomentum(input: EngineInput): { factor: FactorResult; technicals: EngineOutput['technicals'] } {
  const { closes } = input

  const rsi14    = computeRSI(closes)
  const { macd, signal: macdSignal, hist: macdHist } = computeMACD(closes)
  const last     = closes.length > 0 ? closes[closes.length-1] : null
  const sma20    = closes.length >= 20
    ? closes.slice(-20).reduce((a,b)=>a+b,0)/20 : null
  const sma50    = closes.length >= 50
    ? closes.slice(-50).reduce((a,b)=>a+b,0)/50 : null

  const technicals: EngineOutput['technicals'] = {
    rsi14, macd, macdSignal, macdHist,
    sma20:      sma20 ? parseFloat(sma20.toFixed(2)) : null,
    sma50:      sma50 ? parseFloat(sma50.toFixed(2)) : null,
    aboveSma20: last !== null && sma20 !== null ? last > sma20 : null,
    aboveSma50: last !== null && sma50 !== null ? last > sma50 : null,
    rsiZone:    rsi14 ? (rsi14 > 70 ? 'overbought' : rsi14 < 30 ? 'oversold' : 'neutral') : null,
    overallSignal: null,
  }

  if (rsi14 !== null && macdHist !== null && last !== null && sma20 !== null) {
    technicals.overallSignal =
      rsi14 > 55 && macdHist > 0 && last > sma20 ? 'bullish' :
      rsi14 < 45 && macdHist < 0 && last < sma20 ? 'bearish' : 'neutral'
  }

  if (closes.length < 10)
    return { factor: { score: null, reason: 'Need 10+ days of price history' }, technicals }

  let score = 0, possible = 0

  if (rsi14 !== null) {
    possible += 30
    score += rsi14 > 70 ? 10 : rsi14 > 60 ? 24 : rsi14 > 45 ? 20
          : rsi14 > 30 ? 14 : 8
  }
  if (macdHist !== null) {
    possible += 35
    score += macdHist > 0 ? 35 : 10
  }
  if (last !== null && sma20 !== null) {
    possible += 20
    score += last > sma20 ? 20 : 5
  }
  if (last !== null && sma50 !== null) {
    possible += 15
    score += last > sma50 ? 15 : 5
  }

  return {
    factor: {
      score: possible > 0 ? Math.round((score / possible) * 100) : null,
      reason: `RSI ${rsi14?.toFixed(1) ?? '—'} · MACD ${macdHist !== null ? (macdHist > 0 ? '↑ Positive' : '↓ Negative') : '—'}`
    },
    technicals,
  }
}

export class UnifiedPredictionEngine {
  constructor(_config?: any) {}

  static predict(input: EngineInput): EngineOutput {
    const quality   = computeQuality(input)
    const valuation = computeValuation(input)
    const growth    = computeGrowth(input)
    const stability = computeStability(input)
    const { factor: momentum, technicals } = computeMomentum(input)

    const WEIGHTS = { quality:0.25, valuation:0.20, growth:0.20, stability:0.20, momentum:0.15 }
    const factors = { quality, valuation, growth, stability, momentum }

    let weightedSum = 0, availableWeight = 0
    for (const [key, w] of Object.entries(WEIGHTS)) {
      const s = factors[key as keyof typeof factors].score
      if (s !== null) {
        weightedSum    += s * w
        availableWeight += w
      }
    }

    const composite = availableWeight > 0
      ? Math.round(weightedSum / availableWeight)
      : null

    const classification =
      composite === null ? 'INSUFFICIENT_DATA' :
      composite >= 80    ? 'EXCELLENT' :
      composite >= 65    ? 'HEALTHY'   :
      composite >= 50    ? 'STABLE'    :
      composite >= 35    ? 'WEAKENING' :
                           'AT_RISK'

    const filledCount = Object.values(factors).filter(f => f.score !== null).length
    const dataCompleteness = Math.round(filledCount / 5 * 100)

    return { composite, classification, factorScores: factors,
             technicals, dataCompleteness, availableWeight }
  }

  evaluate(input: UnifiedPredictionInput): UnifiedPredictionOutput {
    const prediction = UnifiedPredictionEngine.predict({
      peRatio: input.peRatio,
      pbRatio: input.pbRatio,
      roe: input.roe,
      roce: input.roic,
      debtToEquity: input.debtToEquity,
      currentRatio: input.currentRatio,
      revenueGrowth: input.revenueGrowth,
      profitGrowth: input.profitGrowth,
      dividendYield: input.dividendYield,
      closes: input.closePrices,
    })
    const legacyFactors = Object.entries(prediction.factorScores).map(([group, value]) => ({
      group: group as UnifiedFactorGroup,
      value: value.score,
      availability: value.score === null ? 0 : 100,
      confidence: value.score === null ? null : prediction.dataCompleteness,
      featureCount: 1,
      availableFeatureCount: value.score === null ? 0 : 1,
      missingFeatures: value.score === null ? [group] : [],
      reason: value.reason,
    })) satisfies UnifiedFactorScore[]
    return {
      symbol: input.symbol,
      horizon: input.horizon,
      tradeDate: input.tradeDate,
      generatedAt: new Date().toISOString(),
      modelVersion: '2.0.0',
      rankingScore: prediction.composite,
      healthScore: prediction.composite,
      classification: prediction.classification,
      confidenceScore: prediction.dataCompleteness,
      confidenceLevel: prediction.dataCompleteness >= 75 ? 'HIGH' : prediction.dataCompleteness >= 50 ? 'MEDIUM' : 'LOW',
      factorScores: legacyFactors,
      featureVector: [],
      dataCompleteness: prediction.dataCompleteness,
      missingFields: legacyFactors.flatMap((item) => item.missingFeatures),
      unavailableFeatures: [],
      explanation: prediction.composite === null ? 'Insufficient data.' : `${prediction.classification} calibrated factor score.`,
      keyStrengths: [],
      keyWeaknesses: [],
      keyRisks: [],
      sourceEngine: 'UnifiedPredictionEngine',
      createdBy: 'system',
      availableWeight: prediction.availableWeight,
      isFabricated: false,
      fabricationReason: null,
    }
  }

  evaluateBatch(inputs: UnifiedPredictionInput[]): UnifiedPredictionOutput[] {
    return inputs.map((input) => this.evaluate(input))
  }
}

export { computeRSI, computeMACD }
