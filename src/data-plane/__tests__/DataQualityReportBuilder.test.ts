import { describe, it, expect } from 'vitest';
import {
  buildSymbolHealthSummary,
  buildEodQualitySummary,
  buildCalendarCoverageSummary,
  buildUniverseOverlapSummary,
  buildFullDataQualityReport,
  renderDataQualityReport,
} from '../reporting/DataQualityReportBuilder';
import { buildSymbolMasterFixture } from '../fixtures/symbol-master';
import { PSETradingCalendar } from '../calendar/PSETradingCalendar';
import type { IndianEodCandle } from '../eod/IndianEodCandle';
import type { PSESymbol } from '../symbols/PSESymbol';

function makeCandle(overrides?: Partial<IndianEodCandle>): IndianEodCandle {
  return {
    symbol: 'RELIANCE', exchange: 'NSE', date: '2026-06-17',
    open: 2500, high: 2550, low: 2480, close: 2540, volume: 5000000,
    deliveryPct: 45, unadjustedClose: 2540, dividend: 0, splitFactor: 1,
    ...overrides,
  };
}

describe('buildSymbolHealthSummary', () => {
  const symbols = [...buildSymbolMasterFixture()];

  it('counts total symbols', () => {
    const result = buildSymbolHealthSummary(symbols);
    expect(result.total).toBe(symbols.length);
  });

  it('breaks down by exchange', () => {
    const result = buildSymbolHealthSummary(symbols);
    expect(result.byExchange.NSE).toBeGreaterThan(0);
    expect(result.byExchange.BSE).toBeGreaterThan(0);
  });

  it('detects ISIN coverage', () => {
    const result = buildSymbolHealthSummary(symbols);
    expect(result.withIsin).toBeGreaterThan(0);
  });

  it('detects duplicates', () => {
    const symbolsWithDup = [...symbols, symbols[0]];
    const dupResult = buildSymbolHealthSummary(symbolsWithDup);
    expect(dupResult.duplicatesBySymbol.length).toBeGreaterThan(0);
  });
});

describe('buildEodQualitySummary', () => {
  it('reports 100% pass rate for valid candles', () => {
    const candles = [makeCandle(), makeCandle({ symbol: 'TCS', date: '2026-06-16' })];
    const result = buildEodQualitySummary(candles);
    expect(result.passRate).toBe(100);
    expect(result.passed).toBe(2);
  });

  it('detects failed candles', () => {
    const candles = [makeCandle(), makeCandle({ open: -100 })];
    const result = buildEodQualitySummary(candles);
    expect(result.failed).toBe(1);
    expect(result.passRate).toBe(50);
  });

  it('breaks down issues by kind', () => {
    const candles = [makeCandle({ open: -100 }), makeCandle({ high: 100, low: 200 })];
    const result = buildEodQualitySummary(candles);
    expect(Object.keys(result.issueBreakdown).length).toBeGreaterThan(0);
  });

  it('calculates average score', () => {
    const candles = [
      makeCandle(),                    // score 100
      makeCandle({ open: -100 }),       // score < 100
    ];
    const result = buildEodQualitySummary(candles);
    expect(result.avgScore).toBeGreaterThan(0);
    expect(result.avgScore).toBeLessThan(100);
  });
});

describe('buildCalendarCoverageSummary', () => {
  it('counts holidays', () => {
    const calendar = new PSETradingCalendar();
    const result = buildCalendarCoverageSummary(calendar);
    expect(result.holidays).toBeGreaterThan(0);
  });

  it('checks weekend consistency', () => {
    const calendar = new PSETradingCalendar();
    const result = buildCalendarCoverageSummary(calendar);
    expect(result.weekendSkipsCorrect).toBe(true);
  });
});

describe('buildUniverseOverlapSummary', () => {
  it('reports sizes by universe', () => {
    const symbols = buildSymbolMasterFixture();
    const universes = new Map<string, PSESymbol[]>();
    universes.set('pse-index_50', symbols.filter(s => s.marketCapCategory === 'large'));
    universes.set('mid_cap', symbols.filter(s => s.marketCapCategory === 'mid'));

    const result = buildUniverseOverlapSummary(universes);
    expect(result.sizeByUniverse['pse-index_50']).toBeGreaterThan(0);
    expect(result.sizeByUniverse.mid_cap).toBeGreaterThan(0);
  });

  it('finds common symbols', () => {
    const symbols = buildSymbolMasterFixture();
    const allActive = symbols;
    const nse = symbols.filter(s => s.exchange === 'NSE');
    const universes = new Map<string, PSESymbol[]>();
    universes.set('all', allActive);
    universes.set('nse', nse);

    const result = buildUniverseOverlapSummary(universes);
    expect(result.commonSymbols.length).toBeGreaterThan(0);
  });
});

describe('buildFullDataQualityReport', () => {
  it('generates a report with symbol health only', () => {
    const symbols = buildSymbolMasterFixture();
    const report = buildFullDataQualityReport(symbols, null, null, null);
    expect(report.symbolHealth.total).toBe(symbols.length);
    expect(report.eodQuality).toBeNull();
    expect(report.calendarCoverage).toBeNull();
    expect(report.universeOverlap).toBeNull();
  });

  it('generates a full report with all sections', () => {
    const symbols = buildSymbolMasterFixture();
    const candles = [makeCandle()];
    const calendar = new PSETradingCalendar();
    const universes = new Map<string, PSESymbol[]>();
    universes.set('test', symbols);

    const report = buildFullDataQualityReport(symbols, candles, calendar, universes);
    expect(report.eodQuality).not.toBeNull();
    expect(report.calendarCoverage).not.toBeNull();
    expect(report.universeOverlap).not.toBeNull();
  });
});

describe('renderDataQualityReport', () => {
  it('produces markdown', () => {
    const symbols = buildSymbolMasterFixture();
    const report = buildFullDataQualityReport(symbols, null, null, null);
    const md = renderDataQualityReport(report);
    expect(md).toContain('# Data Quality Report');
    expect(md).toContain('**Generated:**');
    expect(md).toContain('## Symbol Master Health');
  });

  it('includes EOD quality section when data present', () => {
    const symbols = buildSymbolMasterFixture();
    const report = buildFullDataQualityReport(symbols, [makeCandle()], null, null);
    const md = renderDataQualityReport(report);
    expect(md).toContain('## EOD Candle Quality');
  });

  it('disclaims determinism', () => {
    const symbols = buildSymbolMasterFixture();
    const report = buildFullDataQualityReport(symbols, null, null, null);
    const md = renderDataQualityReport(report);
    expect(md).toContain('no network calls');
  });
});
