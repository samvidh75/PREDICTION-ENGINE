/**
 * Lensory Watchlist Engine
 *
 * Generates "Watch Next" items and "Review Triggers"
 * based on scenario results. Prioritizes by impact magnitude
 * and data availability.
 */

import type { ScenarioOutput, TrackedCompanyStress } from "./ScenarioTypes";

export interface WatchlistItem {
  priority: "high" | "medium" | "low";
  trigger: string;
  scenarioId: string;
  dueDate: string | null; // next expected filing date or null if unknown
}

export interface WatchlistReport {
  symbol: string;
  generatedAt: string;
  items: WatchlistItem[];
  summary: string;
}

export class WatchlistEngine {
  /** Generate watchlist items from a single scenario */
  generateFromScenario(scenario: ScenarioOutput): WatchlistReport {
    const items: WatchlistItem[] = [];

    // Prioritize by score delta magnitude
    const delta = Math.abs(scenario.impact.scoreDelta ?? 0);
    const priority: "high" | "medium" | "low" =
      delta > 10 ? "high" : delta > 5 ? "medium" : "low";

    for (const item of scenario.watchNext) {
      items.push({
        priority,
        trigger: item,
        scenarioId: scenario.id,
        dueDate: null,
      });
    }

    for (const trigger of scenario.reviewTriggers) {
      items.push({
        priority: "high", // review triggers are always high priority
        trigger,
        scenarioId: scenario.id,
        dueDate: null,
      });
    }

    // Sort by priority
    items.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    return {
      symbol: scenario.symbol,
      generatedAt: new Date().toISOString(),
      items,
      summary: this.buildWatchlistSummary(scenario, items),
    };
  }

  /** Generate watchlist from multiple scenarios */
  generateFromScenarios(scenarios: ScenarioOutput[]): WatchlistReport[] {
    const bySymbol = new Map<string, ScenarioOutput[]>();
    for (const s of scenarios) {
      const list = bySymbol.get(s.symbol) || [];
      list.push(s);
      bySymbol.set(s.symbol, list);
    }

    const reports: WatchlistReport[] = [];
    for (const [symbol, symbolScenarios] of bySymbol) {
      const allItems: WatchlistItem[] = [];

      for (const s of symbolScenarios) {
        const report = this.generateFromScenario(s);
        allItems.push(...report.items);
      }

      // Deduplicate and sort
      const seen = new Set<string>();
      const deduplicated = allItems.filter((item) => {
        if (seen.has(item.trigger)) return false;
        seen.add(item.trigger);
        return true;
      });

      deduplicated.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });

      const highCount = deduplicated.filter((i) => i.priority === "high").length;
      const medCount = deduplicated.filter((i) => i.priority === "medium").length;
      const lowCount = deduplicated.filter((i) => i.priority === "low").length;

      reports.push({
        symbol,
        generatedAt: new Date().toISOString(),
        items: deduplicated,
        summary: `Generated ${deduplicated.length} watch items from ${symbolScenarios.length} scenarios. ${highCount} high priority, ${medCount} medium, ${lowCount} low.`,
      });
    }

    return reports;
  }

  /** Generate watchlist for a tracked company */
  generateForTrackedCompany(stress: TrackedCompanyStress): WatchlistReport {
    const allItems: WatchlistItem[] = [];

    // From individual scenario results
    for (const scenario of stress.scenarioResults) {
      const report = this.generateFromScenario(scenario);
      allItems.push(...report.items);
    }

    // From thesis assessment
    if (stress.thesisAssessment?.thesisIntegrity === "needs_review") {
      allItems.push({
        priority: "high",
        trigger: `Thesis needs review for ${stress.symbol}`,
        scenarioId: "thesis-assessment",
        dueDate: null,
      });
    }

    // Deduplicate and sort
    const seen = new Set<string>();
    const deduplicated = allItems.filter((item) => {
      if (seen.has(item.trigger)) return false;
      seen.add(item.trigger);
      return true;
    });

    deduplicated.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    const highCount = deduplicated.filter((i) => i.priority === "high").length;
    return {
      symbol: stress.symbol,
      generatedAt: new Date().toISOString(),
      items: deduplicated,
      summary: `${highCount} high-priority watch items for ${stress.symbol}.`,
    };
  }

  // ── Private ────────────────────────────────────────────────

  private buildWatchlistSummary(
    scenario: ScenarioOutput,
    items: WatchlistItem[]
  ): string {
    const highCount = items.filter((i) => i.priority === "high").length;
    const bandText = scenario.impact.simulatedScoreBand ?? "Stable";
    return `${scenario.symbol}: ${items.length} watch items (${highCount} high priority). Score band: ${bandText}.`;
  }
}
