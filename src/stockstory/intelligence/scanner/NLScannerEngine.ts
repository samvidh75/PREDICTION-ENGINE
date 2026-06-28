/**
 * NL Scanner Engine
 *
 * Natural language scanner for stock discovery. Translates user queries
 * into filter criteria against the intelligence input.
 *
 * Example queries:
 * - "companies with high ROE and low debt"
 * - "growth stocks under PE 20"
 * - "large-caps with dividend yield above 3%"
 */

import type { IntelligenceInput } from '../../types';

export interface ScannerQuery {
  text: string;
  parsed: ParsedFilter[];
}

export interface ParsedFilter {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'range' | 'contains';
  value: number | string | [number, number];
  confidence: number;            // 0-1 — how confident the parser is
}

export interface ScanResult {
  symbol: string;
  matched: boolean;
  matchDetails: string[];
  score: number;                 // How well it matches (0-100)
}

export interface ScannerReport {
  query: string;
  generatedAt: string;
  parsedFilters: ParsedFilter[];
  results: ScanResult[];
  totalMatched: number;
  summary: string;
}

/**
 * Keyword-to-field mapping for Indian stock context
 */
const FIELD_ALIASES: Record<string, string> = {
  'roe': 'financials.roe',
  'return on equity': 'financials.roe',
  'roce': 'financials.roce',
  'roic': 'financials.roic',
  'debt to equity': 'financials.debtToEquity',
  'debt/equity': 'financials.debtToEquity',
  'd/e': 'financials.debtToEquity',
  'debt': 'financials.debtToEquity',
  'leverage': 'financials.debtToEquity',
  'pe': 'financials.peRatio',
  'pe ratio': 'financials.peRatio',
  'price to earnings': 'financials.peRatio',
  'pb': 'financials.pbRatio',
  'pb ratio': 'financials.pbRatio',
  'price to book': 'financials.pbRatio',
  'dividend yield': 'financials.dividendYield',
  'dividend': 'financials.dividendYield',
  'yield': 'financials.dividendYield',
  'revenue growth': 'financials.revenueGrowth',
  'profit growth': 'financials.profitGrowth',
  'growth': 'financials.revenueGrowth',
  'eps growth': 'financials.epsGrowth',
  'margin': 'financials.operatingMargin',
  'operating margin': 'financials.operatingMargin',
  'opm': 'financials.operatingMargin',
  'gross margin': 'financials.grossMargin',
  'market cap': 'financials.marketCap',
  'large cap': 'financials.marketCap',
  'mid cap': 'financials.marketCap',
  'small cap': 'financials.marketCap',
  'free cash flow': 'financials.freeCashFlow',
  'fcf': 'financials.freeCashFlow',
  'interest coverage': 'financials.interestCoverage',
  'beta': 'technicals.beta',
  'rsi': 'technicals.rsi',
  'promoter': 'risks.promoterHolding',
  'promoter holding': 'risks.promoterHolding',
  'pledge': 'risks.pledgedShares',
  'pledged': 'risks.pledgedShares',
  'sector': 'sector.name',
  'industry': 'sector.name',
};

export class NLScannerEngine {
  /**
   * Scan a single input against a natural language query
   */
  scan(input: IntelligenceInput, query: string): ScannerReport {
    const parsedFilters = this.parseQuery(query);
    const result = this.evaluateFilters(input, parsedFilters);
    const matchCount = result.matched ? 1 : 0;

    return {
      query,
      generatedAt: new Date().toISOString(),
      parsedFilters,
      results: [result],
      totalMatched: matchCount,
      summary: matchCount > 0
        ? `${input.symbol} matches ${result.matchDetails.length} filter(s).`
        : `${input.symbol} does not match the scan criteria.`,
    };
  }

  /**
   * Batch scan multiple inputs
   */
  scanBatch(inputs: IntelligenceInput[], query: string): ScannerReport {
    const parsedFilters = this.parseQuery(query);
    const results = inputs.map(input => this.evaluateFilters(input, parsedFilters));
    const totalMatched = results.filter(r => r.matched).length;

    return {
      query,
      generatedAt: new Date().toISOString(),
      parsedFilters,
      results,
      totalMatched,
      summary: `${totalMatched}/${inputs.length} stocks match the scan criteria.`,
    };
  }

  private parseQuery(query: string): ParsedFilter[] {
    const filters: ParsedFilter[] = [];
    const lower = query.toLowerCase();

    // Pattern: "FIELD above/over/gt VALUE"
    const aboveMatch = lower.match(/(.+?)\s+(above|over|greater than|more than|>\s*|at least)\s+(\d+\.?\d*)/g);
    // Pattern: "FIELD below/under/lt VALUE"
    const belowMatch = lower.match(/(.+?)\s+(below|under|less than|<\s*|at most)\s+(\d+\.?\d*)/g);

    const allMatches = [...(aboveMatch ?? []), ...(belowMatch ?? [])];

    if (allMatches.length === 0) {
      // Try simple "FIELD VALUE" or "FIELD > VALUE"
      const simpleMatch = lower.match(/([a-z\s/]+?)\s*([><]=?)\s*(\d+\.?\d*)/);
      if (simpleMatch) {
        const field = this.resolveField(simpleMatch[1].trim());
        const op = simpleMatch[2].startsWith('>') ? 'gt' : 'lt';
        const value = parseFloat(simpleMatch[3]);
        if (field) {
          filters.push({ field, operator: op, value, confidence: 0.7 });
        }
      }
      return filters;
    }

    for (const match of allMatches) {
      const parts = match.match(/(.+?)\s+(above|over|greater than|more than|below|under|less than|at most|at least)\s+(\d+\.?\d*)/);
      if (!parts) continue;

      const fieldName = parts[1].trim();
      const comparator = parts[2].trim();
      const value = parseFloat(parts[3]);

      const field = this.resolveField(fieldName);
      if (!field) continue;

      let operator: ParsedFilter['operator'] = 'gt';
      if (['below', 'under', 'less than', 'at most'].includes(comparator)) operator = 'lt';
      if (comparator === 'at least') operator = 'gte';

      filters.push({ field, operator, value, confidence: 0.8 });
    }

    return filters;
  }

  private resolveField(name: string): string | null {
    const lower = name.toLowerCase().trim();
    // Direct match
    if (FIELD_ALIASES[lower]) return FIELD_ALIASES[lower];
    // Fuzzy: check partial matches
    for (const [alias, field] of Object.entries(FIELD_ALIASES)) {
      if (lower.includes(alias) || alias.includes(lower)) return field;
    }
    return null;
  }

  private evaluateFilters(input: IntelligenceInput, filters: ParsedFilter[]): ScanResult {
    const matchDetails: string[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    if (filters.length === 0) {
      return { symbol: input.symbol, matched: false, matchDetails: ['No valid filters parsed'], score: 0 };
    }

    for (const filter of filters) {
      totalWeight += filter.confidence;
      const actual = this.getFieldValue(input, filter.field);
      if (actual === null) continue;

      let matched = false;
      let detail = '';

      switch (filter.operator) {
        case 'gt':
          matched = actual > (filter.value as number);
          detail = `${filter.field}: ${actual} > ${filter.value} → ${matched ? '✓' : '✗'}`;
          break;
        case 'lt':
          matched = actual < (filter.value as number);
          detail = `${filter.field}: ${actual} < ${filter.value} → ${matched ? '✓' : '✗'}`;
          break;
        case 'gte':
          matched = actual >= (filter.value as number);
          detail = `${filter.field}: ${actual} >= ${filter.value} → ${matched ? '✓' : '✗'}`;
          break;
        case 'lte':
          matched = actual <= (filter.value as number);
          detail = `${filter.field}: ${actual} <= ${filter.value} → ${matched ? '✓' : '✗'}`;
          break;
        case 'eq':
          matched = actual === (filter.value as number);
          detail = `${filter.field}: ${actual} == ${filter.value} → ${matched ? '✓' : '✗'}`;
          break;
        default:
          continue;
      }

      if (matched) matchedWeight += filter.confidence;
      matchDetails.push(detail);
    }

    const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
    const matched = totalWeight > 0 && matchedWeight / totalWeight > 0.5;

    return { symbol: input.symbol, matched, matchDetails, score };
  }

  private getFieldValue(input: IntelligenceInput, field: string): number | null {
    const path = field.split('.');
    let current: unknown = input;
    for (const part of path) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return typeof current === 'number' ? current : null;
  }
}

export const nlScannerEngine = new NLScannerEngine();
