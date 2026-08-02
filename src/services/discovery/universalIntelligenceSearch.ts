import type { DiscoveryEntity, DiscoveryResult, DiscoverySearchInput } from "./discoveryTypes";
import { getDiscoveryIndex } from "./discoveryIndex";
import { MasterCompanyRegistry } from "../data/MasterCompanyRegistry";

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

  const titleLower = entity.title.toLowerCase();
  const narrativeLower = entity.shortNarrative.toLowerCase();

  const keywordHits = qTokens.length
    ? qTokens.reduce((acc, t) => {
        if (entity.keywords.some((k) => k.toLowerCase() === t)) return acc + 1.2;
        if (titleLower.includes(t)) return acc + 0.9;
        if (narrativeLower.includes(t)) return acc + 0.7;
        if (entity.relationshipTags.some((rt) => rt.includes(t))) return acc + 0.5;
        return acc;
      }, 0)
    : 0.2;

  const preferredSectors = input.preferredSectors ?? [];
  const preferredThemes = input.preferredThemes ?? [];

  const preferredSectorSet = new Set(preferredSectors.map((s) => s.toLowerCase().trim()));
  const preferredThemeSet = new Set(preferredThemes.map((t) => t.toLowerCase().trim()));

  function titleTokens(t: string): string[] {
    return normalizeQuery(t)
      .split(/[\s&,+/.-]+/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  let memoryBoost = 0;

  const entityRelatedSectors = entity.details?.relatedSectors ?? [];

  if (entity.kind === "sector" && preferredSectorSet.has(titleLower)) memoryBoost += 0.9;
  if (entity.kind === "theme" && preferredThemeSet.has(titleLower)) memoryBoost += 0.9;

  if (preferredSectors.length && entityRelatedSectors.some((s) => preferredSectorSet.has(s.toLowerCase().trim()))) {
    memoryBoost += 0.35;
  }

  if (preferredSectors.length || preferredThemes.length) {
    const tokens = [...preferredSectors, ...preferredThemes].flatMap(titleTokens);
    const keywordLower = entity.keywords.map((k) => k.toLowerCase());

    for (const tok of tokens) {
      if (!tok) continue;
      if (titleLower.includes(tok)) memoryBoost += 0.12;
      if (narrativeLower.includes(tok)) memoryBoost += 0.08;
      if (keywordLower.some((k) => k.includes(tok))) memoryBoost += 0.10;
      if (entity.relationshipTags.some((rt) => rt.includes(tok.replaceAll(" ", "_")))) memoryBoost += 0.05;
    }
  }

  memoryBoost = Math.min(memoryBoost, 1.6);

  const conf = input.confidenceState;

  let confidenceBoost = 0;
  if (conf === "ELEVATED_RISK") {
    if (entity.kind === "behavioural_condition" || titleLower.includes("defensive")) confidenceBoost = 0.65;
    if (entity.kind === "theme") confidenceBoost = 0.4;
  } else if (conf === "MOMENTUM_WEAKENING") {
    if (entity.kind === "behavioural_condition" || titleLower.includes("pacing")) confidenceBoost = 0.6;
    if (entity.kind === "market_narrative") confidenceBoost = 0.25;
  } else if (conf === "STABLE_CONVICTION") {
    if (entity.kind === "market_narrative" || entity.kind === "institutional_environment") confidenceBoost = 0.55;
  } else {
    if (entity.kind === "market_narrative") confidenceBoost = 0.45;
  }

  const narrativeStability = (input.narrativeKey % 17) / 100;

  const raw = keywordHits + confidenceBoost + memoryBoost + narrativeStability;
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

function getExactSymbolMatch(query: string, companies: any[]): number {
  const normalizedQuery = normalizeQuery(query).replace(/[^a-z0-9]/g, "");
  return companies.findIndex(({ entry }) => {
    const symbol = normalizeQuery(entry.symbol).replace(/[^a-z0-9]/g, "");
    const company = normalizeQuery(entry.companyName).replace(/[^a-z0-9]/g, "");
    return normalizedQuery === symbol || normalizedQuery === company;
  });
}

export function universalIntelligenceSearch(input: DiscoverySearchInput): DiscoveryResult[] {
  const index = getDiscoveryIndex();
  const queryIsEmpty = !input.query.trim();
  const normalizedQuery = normalizeQuery(input.query).replace(/[^a-z0-9]/g, "");

  const allEntries = MasterCompanyRegistry.getInstance().getAllEntries();
  const stockMatches: DiscoveryResult[] = queryIsEmpty ? [] : allEntries
    .map((entry) => {
      const symbol = normalizeQuery(entry.symbol).replace(/[^a-z0-9]/g, "");
      const company = normalizeQuery(entry.companyName).replace(/[^a-z0-9]/g, "");
      const exactSymbol = normalizedQuery === symbol;
      const exactCompany = !exactSymbol && normalizedQuery === company;
      const prefix = !exactSymbol && !exactCompany && (symbol.startsWith(normalizedQuery) || company.startsWith(normalizedQuery));
      const contains = !exactSymbol && !exactCompany && !prefix && (symbol.includes(normalizedQuery) || company.includes(normalizedQuery));
      const alias = !exactSymbol && !exactCompany && !prefix && !contains && entry.isin ? normalizeQuery(entry.isin).includes(normalizedQuery) : false;

      let score = 0;
      let matchType = "none";
      if (exactSymbol) { score = 1000; matchType = "exact_symbol"; }
      else if (exactCompany) { score = 900; matchType = "exact_company"; }
      else if (prefix) { score = 80; matchType = "prefix"; }
      else if (contains) { score = 60; matchType = "contains"; }
      else if (alias) { score = 50; matchType = "alias"; }

      return { entry, score, matchType };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (b.entry.marketCap ?? 0) - (a.entry.marketCap ?? 0))
    .slice(0, 5)
    .map(({ entry, matchType }) => ({
      id: `stock_${entry.symbol}`,
      kind: "stock" as const,
      title: entry.companyName,
      ticker: entry.symbol,
      companyName: entry.companyName,
      sector: entry.sector,
      narrativeSummary: matchType === "exact_symbol" || matchType === "exact_company"
        ? `${entry.symbol} · ${entry.exchange} · ${entry.industry}`
        : `${entry.symbol} · ${entry.exchange} · ${entry.industry}`,
      confidenceEnvironment: input.marketStateLabel,
      marketContext: "Open the company research page for current, sourced evidence.",
      relationshipIndicators: [entry.exchange, entry.sector, entry.industry],
    }));

  if (!queryIsEmpty && stockMatches.length > 0 && stockMatches[0].ticker) {
    const topSymbol = stockMatches[0].ticker;
    const exactIdx = allEntries.findIndex(e => normalizeQuery(e.symbol).replace(/[^a-z0-9]/g, "") === normalizedQuery);
    if (exactIdx >= 0) {
      const exactEntry = allEntries[exactIdx];
      const exactResult: DiscoveryResult = {
        id: `stock_${exactEntry.symbol}`,
        kind: "stock" as const,
        title: exactEntry.companyName,
        ticker: exactEntry.symbol,
        companyName: exactEntry.companyName,
        sector: exactEntry.sector,
        narrativeSummary: `${exactEntry.symbol} · ${exactEntry.exchange} · ${exactEntry.industry}`,
        confidenceEnvironment: input.marketStateLabel,
        marketContext: "Open the company research page for current, sourced evidence.",
        relationshipIndicators: [exactEntry.exchange, exactEntry.sector, exactEntry.industry],
      };
      const existingIdx = stockMatches.findIndex(r => r.ticker === exactEntry.symbol);
      if (existingIdx >= 0) {
        stockMatches.splice(existingIdx, 1);
      }
      stockMatches.unshift(exactResult);
    }
  }

  const scored = index
    .map((e) => {
      const s = scoreEntity(e, input);
      return { e, s };
    })
    .sort((a, b) => b.s - a.s);

  const limit = queryIsEmpty ? 4 : 6;

  const picked = progressivePick(scored, limit).map((x) => x.e);

  const narratives = picked.map((entity) => {
    const narrativeSummary = buildNarrativeSummary(entity, input);
    const confidenceEnvironment = input.marketStateLabel;
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

  const combined = [...stockMatches, ...narratives].slice(0, 8);

  return combined;
}
