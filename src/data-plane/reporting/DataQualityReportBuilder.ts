// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Data Quality Report Builder
//
// Produces a markdown report that assesses:
//   1. Symbol master health (coverage, duplicates, missing fields)
//   2. EOD candle quality (pass rates, error patterns)
//   3. Calendar consistency (trading day coverage)
//   4. Universe coverage overlap analysis
//
// All computations are deterministic — no network calls.
// ─────────────────────────────────────────────────────────────────────────────

import type { PSESymbol, IndianExchange, IndianInstrumentSegment } from '../symbols/PSESymbol';
import type { IndianEodCandle } from '../eod/IndianEodCandle';
import { validateEodCandle } from '../eod/IndianEodCandle';
import type { PSETradingCalendar } from '../calendar/PSETradingCalendar';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SymbolHealthSummary {
  total: number;
  byExchange: Record<IndianExchange, number>;
  bySegment: Partial<Record<IndianInstrumentSegment, number>>;
  byCapCategory: Record<string, number>;
  withIsin: number;
  missingIsin: number;
  withBseCode: number;
  missingBseCode: number;
  duplicatesBySymbol: string[];
  duplicatesByIsin: string[];
  suspended: number;
  delisted: number;
  active: number;
}

export interface EodQualitySummary {
  totalCandles: number;
  passed: number;
  failed: number;
  passRate: number;
  issueBreakdown: Record<string, number>;
  avgScore: number;
  bySymbol: Array<{ symbol: string; count: number; avgScore: number }>;
}

export interface CalendarCoverageSummary {
  tradingDaysInRange: number;
  holidays: number;
  marketHourConsistency: boolean;
  weekendSkipsCorrect: boolean;
}

export interface UniverseOverlapSummary {
  universeNames: string[];
  sizeByUniverse: Record<string, number>;
  commonSymbols: string[];
}

export interface DataQualityReport {
  generatedAt: string;
  symbolHealth: SymbolHealthSummary;
  eodQuality: EodQualitySummary | null;
  calendarCoverage: CalendarCoverageSummary | null;
  universeOverlap: UniverseOverlapSummary | null;
  notes: string[];
}

// ── Symbol health ───────────────────────────────────────────────────────────

export function buildSymbolHealthSummary(symbols: PSESymbol[]): SymbolHealthSummary {
  const byExchange: Record<string, number> = {};
  const bySegment: Record<string, number> = {};
  const byCapCategory: Record<string, number> = {};
  let withIsin = 0;
  let missingIsin = 0;
  let withBseCode = 0;
  let missingBseCode = 0;
  let suspended = 0;
  let delisted = 0;
  let active = 0;

  for (const s of symbols) {
    byExchange[s.exchange] = (byExchange[s.exchange] || 0) + 1;
    bySegment[s.segment] = (bySegment[s.segment] || 0) + 1;
    const cap = s.marketCapCategory ?? 'unknown';
    byCapCategory[cap] = (byCapCategory[cap] || 0) + 1;
    if (s.isin) withIsin++; else missingIsin++;
    if (s.bseCode) withBseCode++; else missingBseCode++;
    if (s.listingStatus === 'suspended') suspended++;
    else if (s.listingStatus === 'delisted') delisted++;
    else active++;
  }

  // Duplicate detection
  const symbolCounts = new Map<string, number>();
  const isinCounts = new Map<string, number>();
  for (const s of symbols) {
    symbolCounts.set(s.canonicalSymbol, (symbolCounts.get(s.canonicalSymbol) || 0) + 1);
    if (s.isin) isinCounts.set(s.isin, (isinCounts.get(s.isin) || 0) + 1);
  }

  const duplicatesBySymbol = [...symbolCounts.entries()]
    .filter(([, c]) => c > 1).map(([s]) => s);
  const duplicatesByIsin = [...isinCounts.entries()]
    .filter(([, c]) => c > 1).map(([s]) => s);

  return {
    total: symbols.length,
    byExchange: byExchange as Record<IndianExchange, number>,
    bySegment: bySegment as Partial<Record<IndianInstrumentSegment, number>>,
    byCapCategory,
    withIsin,
    missingIsin,
    withBseCode,
    missingBseCode,
    duplicatesBySymbol,
    duplicatesByIsin,
    suspended,
    delisted,
    active,
  };
}

// ── EOD quality ─────────────────────────────────────────────────────────────

export function buildEodQualitySummary(candles: IndianEodCandle[]): EodQualitySummary {
  const qualities = candles.map(c => validateEodCandle(c));

  const passed = qualities.filter(q => q.valid).length;
  const failed = qualities.filter(q => !q.valid).length;
  const total = qualities.length;

  const issueBreakdown: Record<string, number> = {};
  for (const q of qualities) {
    for (const issue of q.issues) {
      issueBreakdown[issue.kind] = (issueBreakdown[issue.kind] || 0) + 1;
    }
  }

  const totalScore = qualities.reduce((sum, q) => sum + q.score, 0);
  const avgScore = total > 0 ? Math.round((totalScore / total) * 100) / 100 : 0;

  // By-symbol stats
  const bySymbolMap = new Map<string, { count: number; totalScore: number }>();
  for (let i = 0; i < candles.length; i++) {
    const sym = candles[i].symbol;
    const entry = bySymbolMap.get(sym) || { count: 0, totalScore: 0 };
    entry.count++;
    entry.totalScore += qualities[i].score;
    bySymbolMap.set(sym, entry);
  }

  const bySymbol = [...bySymbolMap.entries()]
    .map(([symbol, data]) => ({
      symbol,
      count: data.count,
      avgScore: Math.round((data.totalScore / data.count) * 100) / 100,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  return {
    totalCandles: total,
    passed,
    failed,
    passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
    issueBreakdown,
    avgScore,
    bySymbol,
  };
}

// ── Calendar coverage ───────────────────────────────────────────────────────

export function buildCalendarCoverageSummary(calendar: PSETradingCalendar): CalendarCoverageSummary {
  const holidayList = calendar.getHolidays();
  const tradingDaysInRange = holidayList.length > 0 ? 248 : 0; // Approx NSE trading days
  const holidays = holidayList.length;

  // Verify weekend consistency
  let weekendSkipsCorrect = true;
  if (holidayList.length > 0) {
    for (const h of holidayList) {
      const dt = new Date(h + 'T00:00:00Z');
      const day = dt.getUTCDay();
      if (day === 0 || day === 6) {
        weekendSkipsCorrect = false;
        break;
      }
    }
  }

  return {
    tradingDaysInRange,
    holidays,
    marketHourConsistency: true,
    weekendSkipsCorrect,
  };
}

// ── Universe overlap ────────────────────────────────────────────────────────

export function buildUniverseOverlapSummary(
  universes: Map<string, PSESymbol[]>,
): UniverseOverlapSummary {
  const universeNames = [...universes.keys()];
  const sizeByUniverse: Record<string, number> = {};
  for (const [name, syms] of universes) {
    sizeByUniverse[name] = syms.length;
  }

  // Common symbols: symbols present in ALL universes
  const symbolSets = [...universes.values()].map((arr: PSESymbol[]) => new Set(arr.map(s => s.canonicalSymbol)));
  const commonSymbols = symbolSets.length > 0
    ? [...symbolSets[0]].filter(s => symbolSets.every(set => set.has(s)))
    : [];

  return {
    universeNames,
    sizeByUniverse,
    commonSymbols,
  };
}

// ── Full report builder ─────────────────────────────────────────────────────

export function buildFullDataQualityReport(
  symbols: PSESymbol[],
  candles: IndianEodCandle[] | null,
  calendar: PSETradingCalendar | null,
  universes: Map<string, PSESymbol[]> | null,
): DataQualityReport {
  const notes: string[] = [];

  const symbolHealth = buildSymbolHealthSummary(symbols);

  if (symbolHealth.duplicatesBySymbol.length > 0) {
    notes.push(`⚠️  Found ${symbolHealth.duplicatesBySymbol.length} duplicate canonical symbols.`);
  }
  if (symbolHealth.missingIsin > 0) {
    notes.push(`⚠️  ${symbolHealth.missingIsin} symbols missing ISIN.`);
  }
  if (symbolHealth.missingBseCode > 0) {
    notes.push(`ℹ️  ${symbolHealth.missingBseCode} symbols missing BSE code (expected for BSE-primary).`);
  }

  const eodQuality = candles ? buildEodQualitySummary(candles) : null;
  if (eodQuality && eodQuality.passRate < 100) {
    notes.push(`⚠️  EOD pass rate is ${eodQuality.passRate}% (${eodQuality.failed}/${eodQuality.totalCandles} candles failed).`);
  }

  const calendarCoverage = calendar ? buildCalendarCoverageSummary(calendar) : null;
  if (calendarCoverage && !calendarCoverage.weekendSkipsCorrect) {
    notes.push('⚠️  Calendar has holidays falling on weekends — check hardcoded list.');
  }

  const universeOverlap = universes ? buildUniverseOverlapSummary(universes) : null;

  return {
    generatedAt: new Date().toISOString(),
    symbolHealth,
    eodQuality,
    calendarCoverage,
    universeOverlap,
    notes,
  };
}

// ── Markdown renderer ───────────────────────────────────────────────────────

export function renderDataQualityReport(report: DataQualityReport): string {
  const lines: string[] = [];

  lines.push('# Data Quality Report');
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push('');

  // ── Symbol Health ──
  lines.push('## Symbol Master Health');
  lines.push('');
  lines.push(`- **Total symbols:** ${report.symbolHealth.total}`);
  lines.push(`- **Active:** ${report.symbolHealth.active}`);
  lines.push(`- **Suspended:** ${report.symbolHealth.suspended}`);
  lines.push(`- **Delisted:** ${report.symbolHealth.delisted}`);
  lines.push('- **By exchange:**');
  for (const [ex, count] of Object.entries(report.symbolHealth.byExchange)) {
    lines.push(`  - ${ex}: ${count}`);
  }
  lines.push('- **By segment:**');
  for (const [seg, count] of Object.entries(report.symbolHealth.bySegment)) {
    lines.push(`  - ${seg}: ${count}`);
  }
  lines.push('- **By market cap:**');
  for (const [cat, count] of Object.entries(report.symbolHealth.byCapCategory)) {
    lines.push(`  - ${cat}: ${count}`);
  }
  lines.push(`- **With ISIN:** ${report.symbolHealth.withIsin}`);
  lines.push(`- **Missing ISIN:** ${report.symbolHealth.missingIsin}`);
  lines.push(`- **With BSE code:** ${report.symbolHealth.withBseCode}`);
  if (report.symbolHealth.duplicatesBySymbol.length > 0) {
    lines.push(`- **Duplicate symbols:** ${report.symbolHealth.duplicatesBySymbol.join(', ')}`);
  }
  if (report.symbolHealth.duplicatesByIsin.length > 0) {
    lines.push(`- **Duplicate ISINs:** ${report.symbolHealth.duplicatesByIsin.join(', ')}`);
  }
  lines.push('');

  // ── EOD Quality ──
  if (report.eodQuality) {
    lines.push('## EOD Candle Quality');
    lines.push('');
    lines.push(`- **Total candles:** ${report.eodQuality.totalCandles}`);
    lines.push(`- **Passed:** ${report.eodQuality.passed}`);
    lines.push(`- **Failed:** ${report.eodQuality.failed}`);
    lines.push(`- **Pass rate:** ${report.eodQuality.passRate}%`);
    lines.push(`- **Average quality score:** ${report.eodQuality.avgScore}`);
    if (Object.keys(report.eodQuality.issueBreakdown).length > 0) {
      lines.push('- **Issue breakdown:**');
      const sorted = [...Object.entries(report.eodQuality.issueBreakdown)].sort(([, a], [, b]) => b - a);
      for (const [issue, count] of sorted) {
        lines.push(`  - ${issue}: ${count}`);
      }
    }
    if (report.eodQuality.bySymbol.length > 0) {
      lines.push('- **By symbol (worst first):**');
      const worst = report.eodQuality.bySymbol.slice(0, 5);
      for (const s of worst) {
        lines.push(`  - ${s.symbol}: ${s.count} candles, avg score ${s.avgScore}`);
      }
    }
    lines.push('');
  }

  // ── Calendar Coverage ──
  if (report.calendarCoverage) {
    lines.push('## Calendar Coverage');
    lines.push('');
    lines.push(`- **Approx trading days:** ${report.calendarCoverage.tradingDaysInRange}`);
    lines.push(`- **Holidays defined:** ${report.calendarCoverage.holidays}`);
    lines.push(`- **Weekend skip consistency:** ${report.calendarCoverage.weekendSkipsCorrect ? '✅' : '❌'}`);
    lines.push('');
  }

  // ── Universe Overlap ──
  if (report.universeOverlap) {
    lines.push('## Universe Overlap');
    lines.push('');
    lines.push('| Universe | Size |');
    lines.push('|----------|------|');
    for (const [name, size] of Object.entries(report.universeOverlap.sizeByUniverse)) {
      lines.push(`| ${name} | ${size} |`);
    }
    lines.push('');
    const common = report.universeOverlap.commonSymbols;
    if (common.length > 0) {
      lines.push(`- **Symbols in all universes:** ${common.length} (${common.slice(0, 5).join(', ')}${common.length > 5 ? ', ...' : ''})`);
    }
    lines.push('');
  }

  // ── Notes ──
  if (report.notes.length > 0) {
    lines.push('## Notes');
    lines.push('');
    for (const note of report.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Report generated by DataQualityReportBuilder — deterministic, no network calls.*');

  return lines.join('\n');
}
