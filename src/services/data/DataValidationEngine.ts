// src/services/data/DataValidationEngine.ts
import { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from './types';

export interface ValidationResult {
  symbol: string;
  success: boolean;
  validationStatus: 'PASSED' | 'FAILED' | 'WARNING';
  errors: string[];
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
  timestamp: string;
}

export class DataValidationEngine {
  /**
   * Validate a stock's full dataset
   */
  public static validate(
    symbol: string,
    quote: StockQuote | null,
    metadata: CompanyMetadata | null,
    history: HistoricalPoint[] | null,
    financials: FinancialSnapshot | null
  ): ValidationResult {
    const errors: string[] = [];
    const checks: ValidationResult['checks'] = [];
    const timestamp = new Date().toISOString();

    // 1. Metadata check
    const hasMetadata = !!(metadata && metadata.companyName && metadata.sector);
    if (!hasMetadata) {
      errors.push('Missing metadata or incomplete company profile fields (companyName, sector)');
    }
    checks.push({
      name: 'missing_metadata',
      passed: hasMetadata,
      details: hasMetadata ? 'Metadata present' : 'Metadata missing critical fields',
    });

    // 2. Financials check
    const hasFinancials = !!(financials && (financials.peRatio !== undefined || financials.eps !== undefined));
    if (!hasFinancials) {
      errors.push('Missing financials or critical snapshot fields (peRatio, eps)');
    }
    checks.push({
      name: 'missing_financials',
      passed: hasFinancials,
      details: hasFinancials ? 'Financials present' : 'Financial snapshot missing critical fields',
    });

    // 3. Historical Candles check
    let missingCandles = false;
    let duplicateCandles = false;
    let negativePrices = false;
    let invalidVolume = false;

    if (!history || history.length === 0) {
      missingCandles = true;
      errors.push('Historical price series is completely empty (missing candles)');
    } else {
      const dates = new Set<string>();
      let prevDateObj: Date | null = null;

      // Sort points ascending by date just in case
      const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));

      for (const p of sortedHistory) {
        // Duplicate check
        if (dates.has(p.date)) {
          duplicateCandles = true;
        }
        dates.add(p.date);

        // Negative prices check
        if (p.open < 0 || p.high < 0 || p.low < 0 || p.close < 0) {
          negativePrices = true;
        }

        // Invalid volume check (volume should not be negative)
        if (p.volume < 0) {
          invalidVolume = true;
        }

        // Gap/Missing candles check (e.g. gap > 7 days between consecutive trading days)
        if (prevDateObj) {
          const currDateObj = new Date(p.date);
          const diffMs = currDateObj.getTime() - prevDateObj.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays > 10) {
            missingCandles = true;
          }
        }
        prevDateObj = new Date(p.date);
      }
    }

    if (duplicateCandles) errors.push('Duplicate candles found in historical series');
    if (negativePrices) errors.push('Negative prices detected in historical series');
    if (invalidVolume) errors.push('Invalid negative volume detected in historical series');

    checks.push({
      name: 'missing_candles',
      passed: !missingCandles,
      details: missingCandles ? 'Gaps or empty series found' : 'No major gaps in historical candles',
    });
    checks.push({
      name: 'duplicate_candles',
      passed: !duplicateCandles,
      details: duplicateCandles ? 'Duplicate dates found' : 'All historical candles have unique dates',
    });
    checks.push({
      name: 'negative_prices',
      passed: !negativePrices,
      details: negativePrices ? 'Negative prices found' : 'All historical prices are non-negative',
    });
    checks.push({
      name: 'invalid_volume',
      passed: !invalidVolume,
      details: invalidVolume ? 'Negative volume found' : 'All historical volumes are non-negative',
    });

    // Overall status
    let validationStatus: ValidationResult['validationStatus'] = 'PASSED';
    if (errors.length > 0) {
      // If we have negative prices or completely missing candles, it fails
      if (negativePrices || !history || history.length === 0 || duplicateCandles) {
        validationStatus = 'FAILED';
      } else {
        // Missing metadata or financials is a warning
        validationStatus = 'WARNING';
      }
    }

    return {
      symbol,
      success: validationStatus !== 'FAILED',
      validationStatus,
      errors,
      checks,
      timestamp,
    };
  }
}
