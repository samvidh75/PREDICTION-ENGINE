/**
 * Competitive Position Scoring (0-20 points)
 *
 * Evaluates the stock's market position relative to sector peers.
 * Uses market cap rank, brand indicators, and customer stickiness.
 */
import logger from '../../../../config/logger';

export interface CompetitivePositionResult {
  score: number;
  marketCapRank: number | null;
  level: 'market_leader' | 'top_tier' | 'mid_tier' | 'small_player' | 'unknown';
  details: string[];
}

export function scoreCompetitivePosition(params: {
  marketCapRank?: number | null;     // Rank within sector (1 = largest)
  sectorPeerCount?: number | null;   // Total peers in sector
  brandStrength?: number | null;     // 0-100 synthetic brand score
  customerStickiness?: number | null; // 0-100: recurring revenue %, switching costs
}): CompetitivePositionResult {
  const details: string[] = [];
  const { marketCapRank, sectorPeerCount, brandStrength, customerStickiness } = params;

  let score = 10;
  let level: CompetitivePositionResult['level'] = 'unknown';

  const hasRank = marketCapRank != null && sectorPeerCount != null && sectorPeerCount > 0;
  const hasBrand = brandStrength != null;
  const hasStickiness = customerStickiness != null;

  if (!hasRank && !hasBrand && !hasStickiness) {
    return { score: 10, marketCapRank: null, level: 'unknown',
             details: ['No competitive position data (10/20 pts)'] };
  }

  // Score from market cap rank
  let rankScore = 10;
  if (hasRank) {
    const rankPct = marketCapRank! / sectorPeerCount!;
    if (rankPct <= 0.1) { rankScore = 18; level = 'market_leader'; }
    else if (rankPct <= 0.25) { rankScore = 15; level = 'top_tier'; }
    else if (rankPct <= 0.5) { rankScore = 11; level = 'mid_tier'; }
    else { rankScore = 5; level = 'small_player'; }
  }

  // Score from brand strength
  let brandScore = 10;
  if (hasBrand && brandStrength != null) {
    if (brandStrength >= 80) brandScore = 18;
    else if (brandStrength >= 60) brandScore = 14;
    else if (brandStrength >= 40) brandScore = 10;
    else if (brandStrength >= 20) brandScore = 6;
    else brandScore = 2;
  }

  // Score from customer stickiness
  let stickinessScore = 10;
  if (hasStickiness && customerStickiness != null) {
    if (customerStickiness >= 80) stickinessScore = 18;
    else if (customerStickiness >= 60) stickinessScore = 14;
    else if (customerStickiness >= 40) stickinessScore = 10;
    else if (customerStickiness >= 20) stickinessScore = 6;
    else stickinessScore = 2;
  }

  // Weighted composite
  const scores: number[] = [];
  if (hasRank) scores.push(rankScore);
  if (hasBrand) scores.push(brandScore);
  if (hasStickiness) scores.push(stickinessScore);

  score = Math.round(scores.reduce((a, s) => a + s, 0) / scores.length);

  // Final level determination
  if (score >= 16) level = 'market_leader';
  else if (score >= 13) level = 'top_tier';
  else if (score >= 8) level = 'mid_tier';
  else level = 'small_player';

  if (level === 'market_leader') details.push(`✓ #${marketCapRank ?? '?'} in sector — Market leader (${score}/20 pts)`);
  else if (level === 'top_tier') details.push(`✓ Top-tier position in sector (${score}/20 pts)`);
  else if (level === 'mid_tier') details.push(`⚠ Mid-tier competitive position (${score}/20 pts)`);
  else details.push(`✗ Smaller player in sector (${score}/20 pts)`);

  if (brandStrength != null) details.push(`Brand strength: ${brandStrength}/100`);
  if (customerStickiness != null) details.push(`Customer stickiness: ${customerStickiness}/100`);

  score = Math.min(20, Math.max(0, score));
  logger.info(`Competitive Position Score: ${score}/20 (${level})`);

  return { score, marketCapRank: marketCapRank ?? null, level, details };
}
