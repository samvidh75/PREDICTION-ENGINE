/**
 * StockStory Intelligence Layer — TRACK-46B
 *
 * Three engines built on top of the existing factor/prediction infrastructure:
 *
 * 1. ExplainabilityEngine — answers WHY for every score
 *    Factor contribution breakdowns, positive/negative drivers, no black boxes.
 *
 * 2. NarrativeEngine — converts quantitative signals into readable stories
 *    Strengthening/weakening narratives, trend detection, risk assessment.
 *
 * 3. FutureHealthEngine — projects factor trajectories forward
 *    3m/6m/12m health outlook with confidence intervals.
 */

export { ExplainabilityEngine, explainabilityEngine } from './ExplainabilityEngine';
export type {
  ExplainabilityOutput,
  ScoreExplanation,
  FactorContribution,
} from './ExplainabilityEngine';

export { NarrativeEngine, narrativeEngine } from './NarrativeEngine';
export type {
  NarrativeOutput,
  NarrativeStory,
  NarrativeSignal,
} from './NarrativeEngine';
