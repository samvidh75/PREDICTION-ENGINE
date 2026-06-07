/**
 * RankingExplanationEngine — TRACK-34 Phase 2
 *
 * Every stock ranking must answer: "Why is this stock ranked here?"
 *
 * Produces per-stock explanation with:
 *   - TopDrivers[] — what pushed the score UP
 *   - NegativeDrivers[] — what pulled the score DOWN
 *   - EngineBreakdown[] — per-engine contribution
 *   - ConfidenceNarrative — how sure are we?
 *   - RiskNarrative — what to watch out for
 */
import pool from '../db/index';

export interface Driver {
  engine: string;
  score: number;
  description: string;
}

export interface EngineBreakdown {
  engine: string;
  score: number;
  contribution: number;
  label: string;
}

export interface RankingExplanation {
  symbol: string;
  rank: number;
  compositeScore: number;
  classification: string;
  topDrivers: Driver[];
  negativeDrivers: Driver[];
  engineBreakdown: EngineBreakdown[];
  confidenceNarrative: string;
  riskNarrative: string;
  summary: string;
}

export class RankingExplanationEngine {
  async explain(symbol: string, rank?: number): Promise<RankingExplanation> {
    const [factRes, featRes, finRes] = await Promise.all([
      pool.query(`SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]),
      pool.query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]),
      pool.query(`SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`, [symbol]),
    ]);

    const fact = factRes.rows[0];
    const feat = featRes.rows[0];
    const fin = finRes.rows[0];

    if (!fact) {
      return {
        symbol, rank: rank || 0, compositeScore: 0, classification: 'Unknown',
        topDrivers: [], negativeDrivers: [], engineBreakdown: [],
        confidenceNarrative: 'No factor data available for this symbol.',
        riskNarrative: 'Cannot assess risks without data.',
        summary: `${symbol} has no ranking data. Factor snapshots are required.`
      };
    }

    // Unpack scores
    const engines: Record<string, number> = {
      Quality: Number(fact.quality_factor || 50),
      Growth: Number(fact.growth_factor || 50),
      Value: Number(fact.value_factor || 50),
      Momentum: Number(fact.momentum_factor || 50),
      Risk: Number(fact.risk_factor || 50),
      Sector: Number(fact.sector_strength_factor || 50),
    };

    const compositeScore = Number(fact.factor_score || 50);
    const confidenceScore = Number(fact.confidence_score || 50);
    const confidenceLevel = String(fact.confidence_level || 'Medium');
    const classification = classifyCompositeScore(compositeScore);

    // Determine total magnitude for contribution calc
    const totalMag = Object.values(engines).reduce((a, b) => a + Math.abs(b), 0);

    // Build engine breakdown
    const breakdown: EngineBreakdown[] = Object.entries(engines)
      .map(([name, score]) => ({
        engine: name,
        score,
        contribution: totalMag > 0 ? Math.round((Math.abs(score) / totalMag) * 100) : 0,
        label: score >= 70 ? 'Strong' : score >= 50 ? 'Moderate' : score >= 30 ? 'Weak' : 'Critical',
      }))
      .sort((a, b) => b.score - a.score);

    // Identify top drivers (highest 3 scores, excluding Risk which is inverted)
    const topDrivers: Driver[] = breakdown
      .filter(e => e.engine !== 'Risk')
      .slice(0, 3)
      .map(e => ({
        engine: e.engine,
        score: e.score,
        description: buildDriverDescription(e.engine, e.score, fin),
      }));

    // Negative drivers (lowest 2 + Risk if > 65)
    const negativeDrivers: Driver[] = [];
    const weaknessCandidates = breakdown.filter(e => e.score < 40 && e.engine !== 'Risk');
    weaknessCandidates.sort((a, b) => a.score - b.score);
    for (const w of weaknessCandidates.slice(0, 2)) {
      negativeDrivers.push({
        engine: w.engine,
        score: w.score,
        description: buildWeaknessDescription(w.engine, w.score, fin, feat),
      });
    }

    // Risk is always a potential negative driver if elevated
    if (engines['Risk'] > 65) {
      negativeDrivers.push({
        engine: 'Risk',
        score: engines['Risk'],
        description: `Elevated risk profile (${engines['Risk']}). Volatility and drawdown risk are above sector average. Consider position sizing.`,
      });
    }

    // Confidence narrative
    const confNarr = buildConfidenceNarrative(confidenceLevel, confidenceScore, engines);

    // Risk narrative
    const riskNarr = buildRiskNarrative(fact, feat, fin);

    // Summary
    const drvSummary = topDrivers.map(d => d.description.split('.')[0]).join('. ');
    const summary = `Ranked ${rank || '-'} with ${classification} score (${compositeScore}/100). ${drvSummary}.`;

    return {
      symbol,
      rank: rank || 0,
      compositeScore,
      classification,
      topDrivers,
      negativeDrivers,
      engineBreakdown: breakdown,
      confidenceNarrative: confNarr,
      riskNarrative: riskNarr,
      summary,
    };
  }
}

// ── Helpers ──────────────────────────────────────

function classifyCompositeScore(score: number): string {
  if (score >= 85) return 'Exceptional';
  if (score >= 70) return 'Excellent';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 25) return 'Weak';
  return 'Critical';
}

function buildDriverDescription(engine: string, score: number, fin: any): string {
  switch (engine) {
    case 'Quality':
      const roic = fin?.roic != null ? Number(fin.roic) : null;
      const roe = fin?.roe != null ? Number(fin.roe) : null;
      return `Strong quality score (${score}). ${roic ? `High ROIC of ${(roic*100).toFixed(1)}%. ` : ''}${roe ? `ROE of ${(roe*100).toFixed(1)}%. ` : ''}Fundamentals are robust.`;
    case 'Growth':
      const revG = fin?.revenue_growth != null ? `${(Number(fin.revenue_growth)*100).toFixed(1)}% revenue growth` : '';
      const epsG = fin?.eps_growth != null ? `${(Number(fin.eps_growth)*100).toFixed(1)}% EPS growth` : '';
      return `Strong growth score (${score}). ${[revG, epsG].filter(Boolean).join(', ') || 'Growth trajectory is accelerating.'}`;
    case 'Value':
      const pe = fin?.pe_ratio != null ? Number(fin.pe_ratio).toFixed(1) : '';
      return `Strong value score (${score}). ${pe ? `PE ratio of ${pe}. ` : ''}Valuation is attractive relative to fundamentals.`;
    case 'Momentum':
      return `Strong momentum score (${score}). Price trend shows institutional follow-through with high conviction.`;
    default:
      return `Strong ${engine.toLowerCase()} score (${score}).`;
  }
}

function buildWeaknessDescription(engine: string, score: number, fin: any, feat: any): string {
  switch (engine) {
    case 'Quality':
      return `Weak quality score (${score}). Fundamentals may be deteriorating — check ROE, ROIC, and margins.`;
    case 'Growth':
      return `Weak growth score (${score}). Revenue and earnings trajectory may be slowing.`;
    case 'Value':
      return `Weak value score (${score}). The stock may be overpriced relative to its fundamentals.`;
    case 'Momentum':
      return `Weak momentum score (${score}). Price trend lacks conviction — consolidation or downtrend likely.`;
    case 'Sector':
      return `Weak sector position (${score}). The sector may be facing headwinds or rotation out of favor.`;
    default:
      return `Weak ${engine.toLowerCase()} score (${score}).`;
  }
}

function buildConfidenceNarrative(level: string, score: number, engines: Record<string, number>): string {
  const dispersion = Math.max(...Object.values(engines)) - Math.min(...Object.values(engines));
  if (level === 'Very High') return `Very high confidence (${score}/100). All data from verified API providers with strong signal agreement across engines.`;
  if (level === 'High') return `High confidence (${score}/100). Most data is fresh from reliable sources. Engine signals are ${dispersion < 30 ? 'well-aligned' : 'moderately dispersed'}.`;
  if (level === 'Medium') return `Medium confidence (${score}/100). Some data may be stale or from unverified sources. ${dispersion > 40 ? 'High dispersion between engines — use directionally.' : ''}`;
  return `Low confidence (${score}/100). Data is sparse or stale. This ranking should be treated as tentative.`;
}

function buildRiskNarrative(fact: any, feat: any, fin: any): string {
  const risks: string[] = [];
  const rf = Number(fact?.risk_factor || 50);
  const vol = feat?.volatility != null ? Number(feat.volatility) : null;
  const dte = fin?.debt_to_equity != null ? Number(fin.debt_to_equity) : null;

  if (rf > 75) risks.push(`High risk factor (${rf}/100)`);
  if (vol && vol > 60) risks.push(`Above-average volatility (${vol.toFixed(1)})`);
  if (dte && dte > 2) risks.push(`High leverage (D/E ${dte.toFixed(1)})`);

  if (risks.length === 0) return 'No significant risk factors identified. Standard market risks apply.';
  return risks.join('. ') + '.';
}

export const rankingExplanationEngine = new RankingExplanationEngine();
export default RankingExplanationEngine;
