import type { DiscoveryEntity, DiscoveryResult, DiscoverySearchInput } from "./discoveryTypes";
import { getDiscoveryIndex } from "./discoveryIndex";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim();
}

function tokenise(q: string): string[] {
  return normalizeQuery(q)
    .split(/[\s,]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function scoreEntity(entity: DiscoveryEntity, input: DiscoverySearchInput): number {
  const qTokens = tokenise(input.query);
  if (!qTokens.length) return 0.2;

  const title = entity.title.toLowerCase();
  const narrative = entity.shortNarrative.toLowerCase();

  const keywordHits = qTokens.reduce((acc, t) => {
    if (entity.keywords.some((k) => k.toLowerCase() === t)) return acc + 1.2;
    if (title.includes(t)) return acc + 0.9;
    if (narrative.includes(t)) return acc + 0.7;
    if (entity.relationshipTags.some((rt) => rt.includes(t))) return acc + 0.5;
    return acc;
  }, 0);

  // Confidence-driven modulation:
  // - in elevated risk, prefer behavioural_condition + cautious/guarded themes
  // - in stable conviction, prefer market_environment + institutional clarity
  const conf = input.confidenceState;

  let confidenceBoost = 0;
  if (conf === "ELEVATED_RISK") {
    if (entity.kind === "behavioural_condition" || entity.title.toLowerCase().includes("defensive")) confidenceBoost = 0.65;
    if (entity.kind === "theme") confidenceBoost = 0.4;
  } else if (conf === "MOMENTUM_WEAKENING") {
    if (entity.kind === "behavioural_condition" || entity.title.toLowerCase().includes("pacing")) confidenceBoost = 0.6;
    if (entity.kind === "market_narrative") confidenceBoost = 0.25;
  } else if (conf === "STABLE_CONVICTION") {
    if (entity.kind === "market_narrative" || entity.kind === "institutional_environment") confidenceBoost = 0.55;
  } else {
    if (entity.kind === "market_narrative") confidenceBoost = 0.45;
  }

  // Narrative key helps stable ordering but doesn't look like randomness.
  const narrativeStability = (input.narrativeKey % 17) / 100; // 0..0.16

  const raw = keywordHits + confidenceBoost + narrativeStability;
  return raw;
}

function buildNarrativeSummary(entity: DiscoveryEntity, input: DiscoverySearchInput): string {
  const conf = input.confidenceState;

  const confLine = (() => {
    switch (conf) {
      case "ELEVATED_RISK":
        return "Interpreted with tighter educational margins and pacing discipline.";
      case "MOMENTUM_WEAKENING":
        return "Interpreted as a selective pacing environment—context changes matter more than direction certainty.";
      case "CONFIDENCE_RISING":
        return "Interpreted as structural evolution—confidence is supportive but framed probabilistically.";
      case "NEUTRAL_ENVIRONMENT":
        return "Interpreted as balanced context—attention guided by structure, not guarantees.";
      case "STABLE_CONVICTION":
      default:
        return "Interpreted as continuity context—business understanding stays composed.";
    }
  })();

  const envHint = entity.details?.confidenceEnvironmentHint
    ? ` Context hint: ${entity.details.confidenceEnvironmentHint}`
    : "";

  return `${entity.shortNarrative}.${confLine}${envHint}`;
}

function buildMarketContext(entity: DiscoveryEntity, input: DiscoverySearchInput): string {
  const hint = entity.details?.marketContextHint;
  if (hint) return hint;

  // fallback: derived from confidence label
  return `Market context is treated as structure adaptation rather than prediction. Current label: ${input.marketStateLabel}.`;
}

function buildRelationshipIndicators(entity: DiscoveryEntity): string[] {
  const rel = entity.relationshipTags.slice(0, 4);
  if (!rel.length) return ["structure_first", "confidence_context", "pacing_awareness"];
  return rel.map((r) => r.replaceAll("_", " "));
}

function progressivePick<T>(arr: T[], limit: number): T[] {
  return arr.slice(0, clamp(limit, 1, 30));
}

export function universalIntelligenceSearch(input: DiscoverySearchInput): DiscoveryResult[] {
  const index = getDiscoveryIndex();

  // If query is empty, we still surface understanding (curiosity-first).
  const queryIsEmpty = !input.query.trim();

  // Score all entities
  const scored = index
    .map((e) => {
      const s = queryIsEmpty ? 0.3 : scoreEntity(e, input);
      return { e, s };
    })
    .sort((a, b) => b.s - a.s);

  // Adaptive output sizing: more when query exists, fewer when empty (reduce overload)
  const limit = queryIsEmpty ? 4 : 6;

  const picked = progressivePick(scored, limit).map((x) => x.e);

  return picked.map((entity) => {
    const narrativeSummary = buildNarrativeSummary(entity, input);
    const confidenceEnvironment = input.marketStateLabel; // educational label; we keep it consistent
    const marketContext = buildMarketContext(entity, input);

    return {
      id: entity.id,
      kind: entity.kind,
      title: entity.title,
      narrativeSummary,
      confidenceEnvironment,
      marketContext,
      relationshipIndicators: buildRelationshipIndicators(entity),
    };
  });
}
