/**
 * Events Engine — Unified Catalyst Intelligence Aggregator
 *
 * 5 scoring modules:
 *   Catalyst Detection (0-25): Earnings, dividends, deals, approvals, products
 *   Event Impact (0-25):      Bullish vs bearish catalyst direction
 *   Timing & Probability (0-20): Days to nearest catalyst
 *   Strategic Catalyst (0-15): Transformational events (management, deals)
 *   Catalyst Richness (0-15):  Number of catalysts in next 90 days
 *
 * Total: 0-100
 */
import { EventMetrics, EventScore } from '../../types';
import { CatalystDetectionScoring } from './CatalystDetectionScoring';
import { EventImpactScoring } from './EventImpactScoring';
import { TimingProbabilityScoring } from './TimingProbabilityScoring';
import logger from '../../../../config/logger';

export class EventEngine {
  private detection: CatalystDetectionScoring;
  private impact: EventImpactScoring;
  private timing: TimingProbabilityScoring;

  constructor() {
    this.detection = new CatalystDetectionScoring();
    this.impact = new EventImpactScoring();
    this.timing = new TimingProbabilityScoring();
  }

  async analyze(metrics: EventMetrics): Promise<EventScore> {
    logger.info(`=== Events Engine Analyzing ===`);
    logger.info(`${metrics.events?.length || 0} events, Next earnings: ${metrics.nextEarningsDate}`);

    // ===== SCORE ALL MODULES =====
    const detectionResult = this.detection.analyze({
      events: metrics.events,
      nextEarningsDate: metrics.nextEarningsDate,
      nextDividendDate: metrics.nextDividendDate,
      pendingDeals: metrics.pendingDeals,
      pendingApprovals: metrics.pendingApprovals,
      productLaunchesPlanned: metrics.productLaunchesPlanned,
    });

    const impactResult = this.impact.analyze({
      events: metrics.events,
      bullishEventCount: metrics.bullishEventCount,
      bearishEventCount: metrics.bearishEventCount,
    });

    const timingResult = this.timing.analyze({
      events: metrics.events,
      nextEarningsDate: metrics.nextEarningsDate,
      eventCount90Days: metrics.eventCount90Days,
    });

    // ===== STRATEGIC CATALYST SCORE (0-15) =====
    let strategicScore = 5;
    const strategicCatalysts: string[] = [];

    if (metrics.managementChanges && metrics.managementChanges.length > 0) {
      strategicScore += 4;
      strategicCatalysts.push(...metrics.managementChanges);
    }

    if (metrics.pendingDeals && metrics.pendingDeals.length > 0) {
      strategicScore += 5;
      strategicCatalysts.push(...metrics.pendingDeals);
    }

    if (metrics.productLaunchesPlanned && metrics.productLaunchesPlanned.length > 0) {
      strategicScore += 3;
      strategicCatalysts.push(...metrics.productLaunchesPlanned);
    }

    strategicScore = Math.min(strategicScore, 15);

    // ===== CATALYST RICHNESS SCORE (0-15) =====
    const eventCount = metrics.eventCount90Days || detectionResult.detectedEvents.length;
    let richnessScore: number;

    if (eventCount >= 5) richnessScore = 14;
    else if (eventCount >= 3) richnessScore = 11;
    else if (eventCount >= 2) richnessScore = 8;
    else if (eventCount === 1) richnessScore = 4;
    else richnessScore = 1;

    const catalystRichness: 'catalyst_heavy' | 'moderate' | 'sparse' =
      eventCount >= 3 ? 'catalyst_heavy' : eventCount >= 1 ? 'moderate' : 'sparse';

    // ===== AGGREGATE =====
    const totalRaw =
      detectionResult.score +       // 0-25
      impactResult.score +          // 0-25
      timingResult.score +          // 0-20
      strategicScore +              // 0-15
      richnessScore;                // 0-15

    // ===== COMPILE UPCOMING EVENTS =====
    const upcomingEvents = detectionResult.detectedEvents.map((e) => ({
      event: e.description,
      date: e.date || new Date(),
      impact: 'medium' as const,
      direction: 'neutral' as const,
      daysAway: e.daysAway || 30,
      probability: 0.7,
    }));

    // ===== NEXT CATALYST =====
    let nextCatalyst = 'No upcoming catalysts';
    if (timingResult.daysToCatalyst && timingResult.daysToCatalyst < 999) {
      const days = timingResult.daysToCatalyst;
      nextCatalyst = `Catalyst in ${days} days (${timingResult.opportunityWindow})`;
    }

    // ===== DATA COMPLETENESS =====
    const fields = [metrics.nextEarningsDate, metrics.pendingDeals, metrics.events];
    const completeness = fields.filter(f => f).length / 3;
    const confidence = Math.min(0.99, completeness * 0.7 + 0.3);

    // ===== REASONING =====
    const reasoning = this.generateReasoning(
      timingResult.opportunityWindow,
      impactResult.direction,
      catalystRichness,
      totalRaw
    );

    const result: EventScore = {
      overall: Math.round(totalRaw),
      catalystDetectionScore: detectionResult.score,
      eventImpactScore: impactResult.score,
      timingProbabilityScore: timingResult.score,
      strategicCatalystScore: strategicScore,
      catalystRichnessScore: richnessScore,

      nextCatalyst,
      daysToCatalyst: timingResult.daysToCatalyst,
      catalystDirection: impactResult.direction,

      opportunityWindow: timingResult.opportunityWindow,
      catalystRichness,

      upcomingEvents,

      expectedVolatility: 15 + (eventCount * 2),
      expectedMoveRange: {
        low: impactResult.direction === 'bullish' ? 2 : -5,
        high: impactResult.direction === 'bullish' ? 8 : 2,
      },

      details: {
        bullishCatalysts: metrics.pendingDeals || [],
        bearishCatalysts: metrics.managementChanges || [],
        timingCertainty: metrics.nextEarningsDate ? 'high' : 'medium',
      },

      dataCompleteness: completeness,
      confidence,
      reasoning,
      timestamp: new Date(),
    };

    logger.info(`Events Result: ${result.overall}/100, Window: ${result.opportunityWindow}, Direction: ${result.catalystDirection}`);
    return result;
  }

  private generateReasoning(
    window: string,
    direction: string,
    richness: string,
    score: number
  ): string {
    const parts: string[] = [];

    if (window === 'immediate') parts.push('immediate catalyst opportunity');
    else if (window === 'near_term') parts.push('near-term catalysts identified');
    else if (window === 'medium_term') parts.push('medium-term catalysts ahead');
    else parts.push('limited near-term catalysts');

    if (direction === 'bullish') parts.push('net bullish');
    else if (direction === 'bearish') parts.push('net bearish');

    if (richness === 'catalyst_heavy') parts.push('catalyst-rich period');
    else if (richness === 'sparse') parts.push('sparse catalyst calendar');

    return `${parts.join(', ')}. ${score >= 65 ? 'Good event-driven opportunity window.' : 'Limited catalyst opportunities.'}`;
  }
}

export const eventEngine = new EventEngine();
