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

export interface HealthResult {
  altmanZ: number | null
  altmanZone: 'safe' | 'grey' | 'distress' | null
  piotroskiF: number | null
  piotroskiLabel: string
  composite: 'very_healthy' | 'healthy' | 'average' | 'weakening' | 'poor' | null
  compositeScore: number | null
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

  // --- Profitability (4 points) ---

  // 1. Positive Net Income
  if (present(input.netIncome) && input.netIncome! > 0) {
    score++
    details.push('✓ Positive Net Income')
  } else if (present(input.roe)) {
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
    score++
    details.push('✓ Positive Operating Cash Flow')
  } else {
    details.push('? Operating Cash Flow data unavailable')
  }

  // 3. ROA higher than previous year (use ROE as proxy)
  if (present(input.roe) && present(input.prevRoe)) {
    if (input.roe! > input.prevRoe!) {
      score++
      details.push('✓ ROE improving YoY')
    } else {
      details.push('✗ ROE declining YoY')
    }
  } else if (present(input.roe) && input.roe! > 10) {
    // If we can't compare, give benefit of doubt for strong ROE
    score++
    details.push('✓ Strong ROE (>10%)')
  }

  // 4. Cash Flow from Operations > Net Income
  if (present(input.operatingCashFlow) && present(input.netIncome)) {
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
    if (input.debtToEquity! < input.prevDebtToEquity!) {
      score++
      details.push('✓ D/E ratio improving')
    } else {
      details.push('✗ D/E ratio deteriorating')
    }
  } else if (present(input.debtToEquity) && input.debtToEquity! < 0.5) {
    score++
    details.push('✓ Low debt (D/E < 0.5)')
  }

  // 6. Current ratio higher than previous year
  if (present(input.currentRatio) && present(input.prevCurrentRatio)) {
    if (input.currentRatio! > input.prevCurrentRatio!) {
      score++
      details.push('✓ Current ratio improving')
    } else {
      details.push('✗ Current ratio declining')
    }
  } else if (present(input.currentRatio) && input.currentRatio! > 1.5) {
    score++
    details.push('✓ Healthy current ratio (>1.5)')
  }

  // 7. No new shares issued (cannot determine without share count data)
  // Skip this criterion if data unavailable

  // --- Operating Efficiency (2 points) ---

  // 8. Gross margin higher than previous year (skip - data unavailable)
  // 9. Asset turnover higher than previous year (skip - data unavailable)

  if (present(input.roce) && input.roce! > 15) {
    score++
    details.push('✓ Strong ROCE (>15%)')
  }

  const finalScore = score
  return { score: finalScore, details }
}

/**
 * Compute composite health score from available data.
 * Blends Z-Score zone and F-Score into a single health classification.
 */
export function computeHealthScore(input: HealthInput): HealthResult {
  const altman = calcAltmanZ(input)
  const piotroski = calcPiotroskiF(input)

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
    } else {
      compositeScore = Math.round(fScore)
    }
  }

  const composite: HealthResult['composite'] =
    compositeScore === null ? null :
    compositeScore >= 90 ? 'very_healthy' :
    compositeScore >= 75 ? 'healthy' :
    compositeScore >= 50 ? 'average' :
    compositeScore >= 30 ? 'weakening' :
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
    details: trimmedDetails,
  }
}

/**
 * Get a human-readable label for the composite health score.
 */
export function getHealthLabel(composite: HealthResult['composite']): string {
  switch (composite) {
    case 'very_healthy': return 'Optimal'
    case 'healthy': return 'Corrective'
    case 'average': return 'Accumulating'
    case 'weakening': return 'Vulnerable'
    case 'poor': return 'Vulnerable'
    default: return '—'
  }
}

/**
 * Get a color for the health score (hex).
 */
export function getHealthColor(composite: HealthResult['composite']): string {
  switch (composite) {
    case 'very_healthy': return '#06D6A0'
    case 'healthy': return '#00B4D8'
    case 'average': return '#7B2FF7'
    case 'weakening': return '#D946EF'
    case 'poor': return '#D946EF'
    default: return '#9CA3AF'
  }
}
