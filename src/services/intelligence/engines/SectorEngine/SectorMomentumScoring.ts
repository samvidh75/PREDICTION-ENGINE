/**
 * Sector Momentum Scoring (0-20 points)
 *
 * Evaluates whether the sector itself is in favor — sector-wide trend,
 * institutional flows, and analyst sentiment.
 */
import logger from '../../../../config/logger';

export interface SectorMomentumResult {
  score: number;
  sectorTrend: number | null;
  level: 'strong_uptrend' | 'uptrend' | 'neutral' | 'downtrend' | 'unknown';
  details: string[];
}

export function scoreSectorMomentum(params: {
  sectorReturn1M?: number | null;   // 1-month sector return (decimal, e.g., 0.05 = 5%)
  sectorReturn3M?: number | null;
  relativeStrength?: number | null; // 0-100 RSI-like metric for sector
  analystUpgrades?: number | null;  // Count of recent upgrades
  analystDowngrades?: number | null;
}): SectorMomentumResult {
  const details: string[] = [];
  const { sectorReturn1M, sectorReturn3M, relativeStrength,
          analystUpgrades, analystDowngrades } = params;

  let score = 10; // Default neutral
  let level: SectorMomentumResult['level'] = 'unknown';

  const hasReturnData = sectorReturn1M != null || sectorReturn3M != null;
  const hasRsData = relativeStrength != null;
  const hasAnalystData = analystUpgrades != null || analystDowngrades != null;

  if (!hasReturnData && !hasRsData && !hasAnalystData) {
    return { score: 10, sectorTrend: null, level: 'unknown',
             details: ['No sector momentum data (10/20 pts)'] };
  }

  // Score from returns
  let returnScore = 10;
  const ret1M = sectorReturn1M ?? 0;
  const ret3M = sectorReturn3M ?? 0;
  const compositeReturn = ret1M * 0.4 + ret3M * 0.6;

  if (compositeReturn >= 0.08) returnScore = 18;
  else if (compositeReturn >= 0.04) returnScore = 15;
  else if (compositeReturn >= 0.01) returnScore = 12;
  else if (compositeReturn >= -0.02) returnScore = 9;
  else if (compositeReturn >= -0.05) returnScore = 5;
  else returnScore = 2;

  // Score from relative strength
  let rsScore = 10;
  if (hasRsData && relativeStrength != null) {
    if (relativeStrength >= 65) rsScore = 18;
    else if (relativeStrength >= 55) rsScore = 14;
    else if (relativeStrength >= 45) rsScore = 10;
    else if (relativeStrength >= 35) rsScore = 6;
    else rsScore = 2;
  }

  // Score from analyst activity
  let analystScore = 10;
  if (hasAnalystData) {
    const upgrades = analystUpgrades ?? 0;
    const downgrades = analystDowngrades ?? 0;
    const netUpgrades = upgrades - downgrades;

    if (netUpgrades >= 3) analystScore = 18;
    else if (netUpgrades >= 1) analystScore = 14;
    else if (netUpgrades >= 0) analystScore = 10;
    else if (netUpgrades >= -2) analystScore = 6;
    else analystScore = 2;
  }

  // Weighted composite
  const dataPoints = [hasReturnData ? returnScore : null,
                      hasRsData ? rsScore : null,
                      hasAnalystData ? analystScore : null]
                      .filter((s): s is number => s !== null);

  score = Math.round(dataPoints.reduce((a, s) => a + s, 0) / dataPoints.length);

  if (score >= 16) {
    level = 'strong_uptrend';
    details.push(`✓ Sector on strong uptrend (${score}/20 pts)`);
  } else if (score >= 13) {
    level = 'uptrend';
    details.push(`✓ Sector in uptrend (${score}/20 pts)`);
  } else if (score >= 8) {
    level = 'neutral';
    details.push(`⚠ Sector neutral (${score}/20 pts)`);
  } else {
    level = 'downtrend';
    details.push(`✗ Sector in downtrend (${score}/20 pts)`);
  }

  if (sectorReturn1M != null) details.push(`1M return: ${(sectorReturn1M * 100).toFixed(1)}%`);
  if (relativeStrength != null) details.push(`Relative strength: ${relativeStrength}/100`);
  if (analystUpgrades != null || analystDowngrades != null) {
    details.push(`Analyst: ${analystUpgrades ?? 0} upgrades, ${analystDowngrades ?? 0} downgrades`);
  }

  score = Math.min(20, Math.max(0, score));
  logger.info(`Sector Momentum Score: ${score}/20 (${level})`);

  return { score, sectorTrend: compositeReturn, level, details };
}
