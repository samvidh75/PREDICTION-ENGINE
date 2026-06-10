/**
 * Predictive Discovery Architecture
 * Anticipation Engine (Search-first continuity)
 *
 * Important:
 * - NO hardcoded datasets (no ticker/company/sector example lists)
 * - Predictions are derived from:
 *   1) discoveryIndex (for sector suggestions)
 *   2) recent searches continuity (for quick “recall”)
 *   3) ticker-pattern detection (for direct ticker entry)
 */

import { getDiscoveryIndex } from "../discovery/discoveryIndex";
import type { DiscoveryEntity } from "../discovery/discoveryTypes";

import type { PredictionSuggestion } from "../../types/SearchTypes";
import { SearchResultType } from "../../types/SearchTypes";

const TICKER_REGEX = /^[A-Z0-9.-]{2,10}$/;

function isLikelyTickerToken(cleanedUpper: string): boolean {
  // Conservative heuristic:
  // - short codes (<=4) are treated as tickers
  // - longer tokens only count if they include digits or punctuation (. or -)
  if (!TICKER_REGEX.test(cleanedUpper)) return false;

  const hasDigitOrPunct = /[0-9.-]/.test(cleanedUpper);
  if (cleanedUpper.length <= 4) return true;
  return hasDigitOrPunct;
}

function normalise(s: string): string {
  return s.toLowerCase().trim();
}

function tokenise(q: string): string[] {
  return normalise(q)
    .split(/[\s,]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

class PredictiveDiscoveryArchitecture {
  private predictionCache: Map<string, PredictionSuggestion[]> = new Map();
  private recentSearches: string[] = [];
  private holographicIntensity = 0.5;

  generatePredictions(partialInput: string): PredictionSuggestion[] {
    const input = partialInput.toLowerCase().trim();
    const cacheKey = input;

    if (input.length === 0) {
      return this.getRecentExplorationSuggestions();
    }

    const cached = this.predictionCache.get(cacheKey);
    if (cached) return cached;

    const predictions: PredictionSuggestion[] = [];

    // 1) Ticker predictions (pattern-based, no datasets)
    predictions.push(...this.generateTickerPredictions(partialInput));

    // 2) Sector predictions (derived from discoveryIndex entities)
    predictions.push(...this.generateSectorPredictions(input));

    predictions.sort((a, b) => b.confidence - a.confidence);

    const top = predictions.slice(0, 10);
    this.predictionCache.set(cacheKey, top);
    return top;
  }

  private generateTickerPredictions(partialInput: string): PredictionSuggestion[] {
    const cleaned = partialInput.toUpperCase().trim().replace(/\s+/g, "");
    if (!isLikelyTickerToken(cleaned)) return [];

    // Confidence based on “how close” the user is to a stable ticker-looking token.
    const confidence = clamp(0.35 + (cleaned.length / 10) * 0.6, 0.1, 1) * this.holographicIntensity;

    return [
      {
        id: cleaned,
        type: SearchResultType.STOCK,
        title: cleaned,
        subtitle: cleaned, // deterministic (no company DB in this layer)
        confidence,
        category: "ticker",
      },
    ];
  }

  private generateSectorPredictions(inputLower: string): PredictionSuggestion[] {
    const index = getDiscoveryIndex();
    const sectors = index.filter((e) => e.kind === "sector") as DiscoveryEntity[];

    const qTokens = tokenise(inputLower);
    if (!inputLower) return [];

    const out: PredictionSuggestion[] = [];

    for (const sector of sectors) {
      const titleLower = normalise(sector.title);

      // Basic match scoring (calm + deterministic)
      let score = 0;

      if (titleLower === inputLower) score += 1.0;
      if (titleLower.includes(inputLower)) score += 0.85;

      if (qTokens.length) {
        for (const tok of qTokens) {
          if (!tok) continue;
          if (titleLower.includes(tok)) score += 0.28;
          const keywordHits = sector.keywords.some((k) => normalise(k).includes(tok));
          if (keywordHits) score += 0.18;
          const tagHits = sector.relationshipTags.some((rt) => normalise(rt).includes(tok.replaceAll(" ", "_")));
          if (tagHits) score += 0.08;
        }
      }

      score = clamp(score, 0, 2);

      if (score <= 0) continue;

      const confidence = clamp(0.25 + score * 0.38, 0.05, 1) * this.holographicIntensity;

      out.push({
        id: sector.id,
        type: SearchResultType.SECTOR,
        title: sector.title,
        subtitle: sector.shortNarrative,
        confidence,
        category: "sector",
      });
    }

    // Remove duplicates by id (shouldn’t happen, but safe)
    const seen = new Set<string>();
    const unique = out.filter((p) => {
      const k = `${p.type}_${p.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    unique.sort((a, b) => b.confidence - a.confidence);
    return unique.slice(0, 6);
  }

  private getRecentExplorationSuggestions(): PredictionSuggestion[] {
    const index = getDiscoveryIndex();
    const sectorEntities = index.filter((e) => e.kind === "sector") as DiscoveryEntity[];

    const seen = new Set<string>();
    const out: PredictionSuggestion[] = [];

    for (const rawRecent of this.recentSearches.slice(0, 10)) {
      const recent = rawRecent.trim();
      if (!recent) continue;

      const recentUpper = recent.toUpperCase().replace(/\s+/g, "");
      if (isLikelyTickerToken(recentUpper)) {
        const key = `${SearchResultType.STOCK}_${recentUpper}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            id: recentUpper,
            type: SearchResultType.STOCK,
            title: recentUpper,
            subtitle: recentUpper,
            confidence: 0.35 * this.holographicIntensity,
            category: "ticker",
          });
        }
        continue;
      }

      // Sector recall (match against title or partial)
      const recentLower = normalise(recent);

      const matched = sectorEntities.find((s) => {
        const t = normalise(s.title);
        return t === recentLower || t.includes(recentLower) || recentLower.includes(t);
      });

      if (!matched) continue;

      const key = `${SearchResultType.SECTOR}_${matched.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        id: matched.id,
        type: SearchResultType.SECTOR,
        title: matched.title,
        subtitle: matched.shortNarrative,
        confidence: 0.32 * this.holographicIntensity,
        category: "sector",
      });
    }

    out.sort((a, b) => b.confidence - a.confidence);
    return out.slice(0, 10);
  }

  addToRecentSearches(search: string): void {
    const s = search.trim();
    if (!s) return;

    const idx = this.recentSearches.indexOf(s);
    if (idx !== -1) this.recentSearches.splice(idx, 1);

    this.recentSearches.unshift(s);

    if (this.recentSearches.length > 20) {
      this.recentSearches = this.recentSearches.slice(0, 20);
    }
  }

  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
  }

  clearPredictionCache(): void {
    this.predictionCache.clear();
  }

  setHolographicIntensity(intensity: number): void {
    this.holographicIntensity = clamp(intensity, 0, 1);
    this.clearPredictionCache();
  }

  getHolographicIntensity(): number {
    return this.holographicIntensity;
  }

  resetToDefault(): void {
    this.clearPredictionCache();
    this.clearRecentSearches();
    this.holographicIntensity = 0.5;
  }
}

// Singleton instance (contract used across the app)
export const predictiveDiscoveryArchitecture = new PredictiveDiscoveryArchitecture();
