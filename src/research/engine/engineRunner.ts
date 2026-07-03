/**
 * Engine Runner: Orchestrates all scoring engines for a given symbol.
 * Wraps the existing research engine into a unified scoring API.
 */

import { computeResearchConviction } from './researchEngine';

export async function runEngines(fundamentals: Record<string, any>) {
  const result = computeResearchConviction(fundamentals);
  const fs = result.factorScores ?? {};
  return {
    quality: fs.quality ?? 50,
    valuation: fs.valuation ?? 50,
    growth: fs.growth ?? 50,
    risk: fs.risk ?? 50,
    momentum: fs.momentum ?? 50,
    stability: fs.stability ?? 50
  };
}
