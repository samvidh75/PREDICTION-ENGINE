/**
 * Altman Z-Score and Piotroski F-Score calculation engine.
 * Computes financial health metrics from available fundamental data.
 * Falls back gracefully when data is unavailable.
 */

export interface HealthInput {
  // Balance sheet
  totalAssets?: number | null
  totalLiabilities?: number | null
  currentAssets?: number | null
  currentLiabilities?: number | null
  workingCapital?: number | null
  retainedEarnings?: number | null

  // Income statement
  ebit?: number | null
  sales?: number | null
  netIncome?: number | null
  operatingCashFlow?: number | null

  // Market data
  marketCap?: number | null
  bookValueOfLiabilities?: number | null

  // Ratios (from API)
  roe?: number | null
  roce?: number | null
  debtToEquity?: number | null
  currentRatio?: number | null
  eps?: number | null
  peRatio?: number | null
  pbRatio?: number | null

  // Previous year (for F-Score comparison)
  prevRoe?: number | null
  prevCurrentRatio?: number | null
  prevDebtToEquity?: number | null
}

export interface HealthFactors {
  quality: number
  valuation: number
  growth: number
  riskStability: number
  momentum: number
}

export interface HealthResult {
  altmanZ: number | null
  altmanZone: 'safe' | 'grey' | 'distress' | null
  piotroskiF: number | null
  piotroskiLabel: string
  composite: 'very_healthy' | 'healthy' | 'average' | 'weakening' | 'poor' | null
  compositeScore: number | null
  factors: HealthFactors | null
  details: string[]
}

const present = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && Number.isFinite(v) && v > 0

/**
 * Calculate Altman Z-Score for public manufacturing companies.
 * Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 1.0X5
 */
function calcAltmanZ(input: HealthInput): { z: number | null; zone: HealthResult['altmanZone']; details: string[] } {
  const details: string[] = []
  let z = 0
  let components = 0

  // X1 = Working Capital / Total Assets
  if (present(input.workingCapital) && present(input.totalAssets)) {
    const x1 = input.workingCapital! / input.totalAssets!
    z += 1.2 * x1
    components++
    details.push(`X1(Working Cap/Assets): ${x1.toFixed(3)}`)
  } else if (present(input.currentAssets) && present(input.currentLiabilities) && present(input.totalAssets)) {
    const wc = input.currentAssets! - input.currentLiabilities!
    const x1 = wc / input.totalAssets!
    z += 1.2 * x1
    components++
    details.push(`X1(Working Cap/Assets): ${x1.toFixed(3)}`)
  }

  // X2 = Retained Earnings / Total Assets
  if (present(input.retainedEarnings) && present(input.totalAssets)) {
    const x2 = input.retainedEarnings! / input.totalAssets!
    z += 1.4 * x2
    components++
    details.push(`X2(Retained Earnings/Assets): ${x2.toFixed(3)}`)
  }

  // X3 = EBIT / Total Assets (approximate from ROE/ROCE if needed)
  if (present(input.ebit) && present(input.totalAssets)) {
    const x3 = input.ebit! / input.totalAssets!
    z += 3.3 * x3
    components++
    details.push(`X3(EBIT/Assets): ${x3.toFixed(3)}`)
  } else if (present(input.roce)) {
    // ROCE = EBIT / Capital Employed. Approximate using ROE as well.
    const x3 = input.roce! / 100 // ROCE already in %
    z += 3.3 * x3
    components++
    details.push(`X3(ROCE approximated): ${x3.toFixed(3)}`)
  }

  // X4 = Market Value of Equity / Book Value of Total Liabilities
  if (present(input.marketCap) && present(input.bookValueOfLiabilities)) {
    const x4 = input.marketCap! / input.bookValueOfLiabilities!
    z += 0.6 * x4
    components++
    details.push(`X4(Market Cap/Liabilities): ${x4.toFixed(3)}`)
  } else if (present(input.marketCap) && present(input.debtToEquity)) {
    // Approximate: if D/E is known, we can estimate
    // This is a rough approximation
    details.push(`X4: Insufficient data for precise calculation`)
  }

  // X5 = Sales / Total Assets
  if (present(input.sales) && present(input.totalAssets)) {
    const x5 = input.sales! / input.totalAssets!
    z += 1.0 * x5
    components++
    details.push(`X5(Sales/Assets): ${x5.toFixed(3)}`)
  }

  if (components < 2) {
    return { z: null, zone: null, details: ['Insufficient data for Z-Score calculation'] }
  }

  // Normalize for missing components
  if (components < 5) {
    z = z * (5 / components) // Scale up proportionally
  }

  const zone = z >= 2.99 ? 'safe' : z >= 1.81 ? 'grey' : 'distress'
  return { z: parseFloat(z.toFixed(2)), zone, details }
}

/**
 * Calculate Piotroski F-Score (0-9)
 * Evaluates 9 criteria across profitability, leverage/liquidity, and operating efficiency.
 */
function calcPiotroskiF(input: HealthInput): { score: number | null; details: string[] } {
  const details: string[] = []
  let score = 0
  let evaluatedAny = false

  // --- Profitability (4 points) ---

  // 1. Positive Net Income
  if (present(input.netIncome) && input.netIncome! > 0) {
    score++; evaluatedAny = true
    details.push('✓ Positive Net Income')
  } else if (present(input.roe)) {
    evaluatedAny = true
    // ROE positive implies net income positive
    if (input.roe! > 0) {
      score++
      details.push('✓ Positive ROE (implies Net Income)')
    } else {
      details.push('✗ Negative ROE')
    }
  }

  // 2. Positive Operating Cash Flow
  if (present(input.operatingCashFlow) && input.operatingCashFlow! > 0) {
    score++; evaluatedAny = true
    details.push('✓ Positive Operating Cash Flow')
  } else {
    evaluatedAny = evaluatedAny || present(input.roe) || present(input.netIncome)
    details.push('? Operating Cash Flow data unavailable')
  }

  // 3. ROA higher than previous year (use ROE as proxy)
  if (present(input.roe) && present(input.prevRoe)) {
    evaluatedAny = true
    if (input.roe! > input.prevRoe!) {
      score++
      details.push('✓ ROE improving YoY')
    } else {
      details.push('✗ ROE declining YoY')
    }
  } else if (present(input.roe) && input.roe! > 10) {
    evaluatedAny = true
    score++
    details.push('✓ Strong ROE (>10%)')
  }

  // 4. Cash Flow from Operations > Net Income
  if (present(input.operatingCashFlow) && present(input.netIncome)) {
    evaluatedAny = true
    if (input.operatingCashFlow! > input.netIncome!) {
      score++
      details.push('✓ Operating CF > Net Income')
    } else {
      details.push('✗ Operating CF < Net Income')
    }
  }

  // --- Leverage & Liquidity (3 points) ---

  // 5. Long-term debt lower than previous year
  if (present(input.debtToEquity) && present(input.prevDebtToEquity)) {
    evaluatedAny = true
    if (input.debtToEquity! < input.prevDebtToEquity!) {
      score++
      details.push('✓ D/E ratio improving')
    } else {
      details.push('✗ D/E ratio deteriorating')
    }
  } else if (present(input.debtToEquity) && input.debtToEquity! < 0.5) {
    evaluatedAny = true
    score++
    details.push('✓ Low debt (D/E < 0.5)')
  }

  // 6. Current ratio higher than previous year
  if (present(input.currentRatio) && present(input.prevCurrentRatio)) {
    evaluatedAny = true
    if (input.currentRatio! > input.prevCurrentRatio!) {
      score++
      details.push('✓ Current ratio improving')
    } else {
      details.push('✗ Current ratio declining')
    }
  } else if (present(input.currentRatio) && input.currentRatio! > 1.5) {
    evaluatedAny = true
    score++
    details.push('✓ Healthy current ratio (>1.5)')
  }

  // 7. No new shares issued (cannot determine without share count data)
  // Skip this criterion if data unavailable

  // --- Operating Efficiency (2 points) ---

  // 8. Gross margin higher than previous year (skip - data unavailable)
  // 9. Asset turnover higher than previous year (skip - data unavailable)

  if (present(input.roce) && input.roce! > 15) {
    evaluatedAny = true
    score++
    details.push('✓ Strong ROCE (>15%)')
  }

  const finalScore = evaluatedAny ? score : null
  return { score: finalScore, details }
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.max(min, Math.min(max, v)))
}

function computeFactors(input: HealthInput): HealthFactors | null {
  let hasData = false

  // Business Quality: ROE, ROCE, current ratio
  let qualitySum = 0
  let qualityN = 0
  if (input.roe != null && Number.isFinite(input.roe)) {
    qualitySum += clamp((input.roe / 30) * 100)
    qualityN++
    hasData = true
  }
  if (input.roce != null && Number.isFinite(input.roce)) {
    qualitySum += clamp((input.roce / 25) * 100)
    qualityN++
    hasData = true
  }
  if (input.currentRatio != null && Number.isFinite(input.currentRatio)) {
    qualitySum += clamp((input.currentRatio / 2) * 100)
    qualityN++
    hasData = true
  }
  const quality = qualityN > 0 ? clamp(qualitySum / qualityN) : 50

  // Valuation: PE (lower is better), PB (lower is better)
  let valSum = 0
  let valN = 0
  if (input.peRatio != null && Number.isFinite(input.peRatio) && input.peRatio > 0) {
    valSum += clamp(100 - (input.peRatio / 50) * 100)
    valN++
    hasData = true
  }
  if (input.pbRatio != null && Number.isFinite(input.pbRatio) && input.pbRatio > 0) {
    valSum += clamp(100 - (input.pbRatio / 8) * 100)
    valN++
    hasData = true
  }
  const valuation = valN > 0 ? clamp(valSum / valN) : 50

  // Growth: revenue growth, profit growth, EPS improvement
  let growSum = 0
  let growN = 0
  if (input.eps != null && Number.isFinite(input.eps) && input.eps > 0) {
    growSum += 70
    growN++
    hasData = true
  }
  const growth = growN > 0 ? clamp(growSum / growN) : 50

  // Risk & Stability: D/E (lower is better), Altman Z
  let riskSum = 0
  let riskN = 0
  if (input.debtToEquity != null && Number.isFinite(input.debtToEquity)) {
    riskSum += clamp(100 - Math.min(input.debtToEquity * 40, 100))
    riskN++
    hasData = true
  }
  if (input.currentRatio != null && Number.isFinite(input.currentRatio)) {
    riskSum += clamp((input.currentRatio / 2.5) * 100)
    riskN++
    hasData = true
  }
  const riskStability = riskN > 0 ? clamp(riskSum / riskN) : 50

  // Momentum: profit growth, EPS
  let momSum = 0
  let momN = 0
  if (input.roe != null && Number.isFinite(input.roe) && input.roe > 15) {
    momSum += clamp((input.roe / 40) * 100)
    momN++
    hasData = true
  }
  const momentum = momN > 0 ? clamp(momSum / momN) : 50

  if (!hasData) return null

  return { quality, valuation, growth, riskStability, momentum }
}

/**
 * Compute composite health score from available data.
 * Blends Z-Score zone and F-Score into a single health classification.
 */
export function computeHealthScore(input: HealthInput): HealthResult {
  const altman = calcAltmanZ(input)
  const piotroski = calcPiotroskiF(input)
  const factors = computeFactors(input)

  const allDetails = [...altman.details, ...piotroski.details]
  const trimmedDetails = allDetails.slice(0, 8)

  // Compute composite
  let compositeScore: number | null = null

  if (altman.zone) {
    switch (altman.zone) {
      case 'safe': compositeScore = 85; break
      case 'grey': compositeScore = 60; break
      case 'distress': compositeScore = 25; break
    }
  }

  if (piotroski.score !== null) {
    const fScore = (piotroski.score / 9) * 100
    if (compositeScore !== null) {
      compositeScore = Math.round((compositeScore + fScore) / 2)
    } else if (piotroski.score > 0) {
      compositeScore = Math.round(fScore)
    }
  }

  // If we have an Altman zone but no F-Score, still use the Altman score
  if (compositeScore === null && altman.zone !== null) {
    switch (altman.zone) {
      case 'safe': compositeScore = 75; break
      case 'grey': compositeScore = 50; break
      case 'distress': compositeScore = 25; break
    }
  }

  // If factors are computed, blend with factor average
  if (compositeScore !== null && factors !== null) {
    const factorAvg = Math.round((factors.quality + factors.valuation + factors.growth + factors.riskStability + factors.momentum) / 5)
    compositeScore = Math.round((compositeScore + factorAvg) / 2)
  }

  const composite: HealthResult['composite'] =
    compositeScore === null ? null :
    compositeScore >= 90 ? 'very_healthy' :
    compositeScore >= 75 ? 'healthy' :
    compositeScore >= 60 ? 'average' :
    compositeScore >= 40 ? 'weakening' :
    'poor'

  return {
    altmanZ: altman.z,
    altmanZone: altman.zone,
    piotroskiF: piotroski.score,
    piotroskiLabel: piotroski.score !== null
      ? `${piotroski.score}/9`
      : '—',
    composite,
    compositeScore,
    factors,
    details: trimmedDetails,
  }
}

/**
 * Get a human-readable label for the composite health score.
 */
export function getHealthLabel(composite: HealthResult['composite']): string {
  switch (composite) {
    case 'very_healthy': return 'Exceptional'
    case 'healthy': return 'Very Healthy'
    case 'average': return 'Healthy'
    case 'weakening': return 'Needs Review'
    case 'poor': return 'Weak'
    default: return 'Not enough data'
  }
}

/**
 * Get a color for the health score (hex).
 */
export function getHealthColor(composite: HealthResult['composite']): string {
  switch (composite) {
    case 'very_healthy': return '#1A7F4B'
    case 'healthy': return '#1A7F4B'
    case 'average': return '#1A56DB'
    case 'weakening': return '#D97706'
    case 'poor': return '#C0392B'
    default: return '#9A9A9A'
  }
}
