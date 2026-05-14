import type { MarketState } from "../../types/MarketState";
import type { MarketInputs } from "../../services/intelligence/marketState";
import { clamp01 } from "../../services/intelligence/marketState";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function absPctDelta(a: number, b: number): number {
  if (!isFinite(a) || a === 0) return 0;
  return Math.abs(b - a) / Math.abs(a);
}

/**
 * MarketStateEngine
 * - normalizes realtime MarketState into MarketInputs weights
 * - keeps internal smoothing so the UI feels alive but never jittery
 */
export class MarketStateEngine {
  private last: MarketState | null = null;

  private smoothedTrendConsistency = 0.62;
  private smoothedVolatilityStability = 0.66;
  private smoothedInstitutionalParticipation = 0.58;
  private smoothedLiquidityBreadth = 0.60;
  private smoothedSentimentAlignment = 0.56;
  private smoothedSectorMomentum = 0.57;
  private smoothedEarningsQuality = 0.60;

  private alpha: number;

  constructor({ alpha = 0.18 }: { alpha?: number } = {}) {
    this.alpha = clamp01(alpha);
  }

  update(state: MarketState): MarketInputs {
    const vol = state.vix;

    // Higher VIX -> lower stability
    // 10..20 maps roughly to 0.8..0.3 stability (kept restrained)
    const volatilityStabilityRaw = clamp01(1 - (vol - 10) / 15);

    // BreadthPct 35..72 -> liquidity breadth 0.3..0.95
    const liquidityBreadthRaw = clamp01((state.breadthPct - 35) / (72 - 35));

    // fiiDiiTone -1.6..1.6 -> participation 0..1
    const instRaw = clamp01((state.fiiDiiTone + 1.6) / 3.2);

    // Trend consistency based on short-term deltas (synthetic “structure steadiness”)
    let trendConsistencyRaw = this.smoothedTrendConsistency;

    if (this.last) {
      const dNifty = absPctDelta(this.last.nifty, state.nifty);
      const dSensex = absPctDelta(this.last.sensex, state.sensex);
      const dBank = absPctDelta(this.last.bankNifty, state.bankNifty);

      // Convert deltas into “how consistent” (larger delta -> lower consistency)
      const deltaAvg = (dNifty + dSensex + dBank) / 3;

      // Typical synthetic delta ~ 0..0.01. Map to 0.2..1
      const consistency = 1 - clamp01(deltaAvg / 0.012);
      trendConsistencyRaw = clamp01(lerp(0.35, 0.95, consistency));
    }

    // Sentiment alignment: calm bias when institutional participation is stronger
    // Keep this intentionally close to instRaw to avoid “random sentiment jumps”.
    const sentimentAlignmentRaw = clamp01(instRaw * 0.75 + 0.25 * liquidityBreadthRaw);

    // Sector momentum: breadth + trend consistency
    const sectorMomentumRaw = clamp01(0.45 * liquidityBreadthRaw + 0.55 * trendConsistencyRaw);

    // Earnings quality: indirect proxy from breadth + inst
    const earningsQualityRaw = clamp01(0.55 * instRaw + 0.45 * liquidityBreadthRaw);

    // Smooth everything to prevent UI shimmer storms.
    this.smoothedTrendConsistency = lerp(this.smoothedTrendConsistency, trendConsistencyRaw, this.alpha);
    this.smoothedVolatilityStability = lerp(this.smoothedVolatilityStability, volatilityStabilityRaw, this.alpha);
    this.smoothedInstitutionalParticipation = lerp(this.smoothedInstitutionalParticipation, instRaw, this.alpha);
    this.smoothedLiquidityBreadth = lerp(this.smoothedLiquidityBreadth, liquidityBreadthRaw, this.alpha);
    this.smoothedSentimentAlignment = lerp(this.smoothedSentimentAlignment, sentimentAlignmentRaw, this.alpha);
    this.smoothedSectorMomentum = lerp(this.smoothedSectorMomentum, sectorMomentumRaw, this.alpha);
    this.smoothedEarningsQuality = lerp(this.smoothedEarningsQuality, earningsQualityRaw, this.alpha);

    this.last = state;

    return {
      trendConsistency: this.smoothedTrendConsistency,
      volatilityStability: this.smoothedVolatilityStability,
      institutionalParticipation: this.smoothedInstitutionalParticipation,
      liquidityBreadth: this.smoothedLiquidityBreadth,
      sentimentAlignment: this.smoothedSentimentAlignment,
      sectorMomentum: this.smoothedSectorMomentum,
      earningsQuality: this.smoothedEarningsQuality,
    };
  }
}
