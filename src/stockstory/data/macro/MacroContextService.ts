/**
 * Macro Context Service
 *
 * Provides access to macroeconomic indicator data. Designed to be optional —
 * missing macro data never blocks research. All methods return undefined or
 * empty arrays if data is not available.
 */

import type { MacroIndicator, MacroIndicatorValue, MacroContext, SectorMacroImpact } from './MacroTypes';

export class MacroContextService {
  private indicators: Map<MacroIndicator, MacroIndicatorValue[]> = new Map();
  private impacts: SectorMacroImpact[] = [];

  /** Add a macro indicator value */
  addIndicator(indicator: MacroIndicator, value: MacroIndicatorValue): void {
    const existing = this.indicators.get(indicator) ?? [];
    existing.push(value);
    existing.sort((a, b) => b.date.localeCompare(a.date)); // newest first
    this.indicators.set(indicator, existing);
  }

  /** Register sector‑macro impact relationships */
  addImpact(impact: SectorMacroImpact): void {
    this.impacts.push(impact);
  }

  /** Get all values for a given indicator (oldest first) */
  getIndicator(indicator: MacroIndicator): MacroIndicatorValue[] | undefined {
    const values = this.indicators.get(indicator);
    if (values) {
      return [...values].reverse(); // chronological order
    }
    return undefined;
  }

  /** Get the single latest value for a given indicator */
  getLatest(indicator: MacroIndicator): MacroIndicatorValue | undefined {
    const values = this.indicators.get(indicator);
    return values?.[0];
  }

  /** Get all available indicators as a MacroContext */
  getIndicators(): MacroContext {
    const context: MacroContext = {
      indicators: {},
      asOf: new Date().toISOString(),
    };

    for (const [indicator, values] of this.indicators.entries()) {
      context.indicators[indicator] = [...values].reverse();
    }

    // Derive overall sentiment based on available indicators
    const latestRate = this.getLatest('interest_rate');
    const latestInflation = this.getLatest('inflation');
    if (latestRate && latestInflation) {
      if (latestRate.value > 6.5 || latestInflation.value > 6) {
        context.sentiment = 'bearish';
      } else if (latestRate.value < 5 && latestInflation.value < 4) {
        context.sentiment = 'bullish';
      } else {
        context.sentiment = 'neutral';
      }
    }

    return context;
  }

  /** Get all registered sector‑macro impacts */
  getImpacts(): SectorMacroImpact[] {
    return [...this.impacts];
  }

  /** Get impacts relevant to a specific sector */
  getImpactsBySector(sectorId: string): SectorMacroImpact[] {
    return this.impacts.filter(i => i.sectorId === sectorId);
  }

  /** Clear all data */
  reset(): void {
    this.indicators.clear();
    this.impacts = [];
  }
}

export const macroContextService = new MacroContextService();