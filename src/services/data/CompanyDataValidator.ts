/**
 * CompanyDataValidator — Validates CompanyMetadata completeness and flags quality issues.
 *
 * Validates:
 *   - Company name is not the ticker symbol
 *   - Sector is not blank
 *   - Industry is not blank
 *   - Market cap is present and > 0
 *   - Exchange is valid (NSE, BSE)
 *   - Symbol format is clean (no raw BSE codes like "500002")
 */

import { CompanyMetadata } from './types';

export type VerificationStatus = 'VERIFIED' | 'PARTIAL' | 'INVALID';

export interface ValidationResult {
  status: VerificationStatus;
  reasons: string[];
}

const VALID_EXCHANGES = new Set(['NSE', 'BSE', 'NSE/BSE']);

// Raw numeric BSE codes (e.g. "500002", "532540") — these are NOT valid display symbols
const RAW_BSE_CODE_PATTERN = /^\d{5,6}$/;

export class CompanyDataValidator {
  /**
   * Validate a CompanyMetadata object and return a structured result.
   */
  validate(meta: CompanyMetadata): ValidationResult {
    const reasons: string[] = [];

    // 1. Company name must not be the ticker symbol
    if (!meta.companyName || meta.companyName.trim().length === 0) {
      reasons.push('missing_company_name');
    } else if (meta.companyName.trim().toUpperCase() === meta.symbol.toUpperCase()) {
      reasons.push('ticker_as_company_name');
    }

    // 2. Sector must be present and non-empty
    if (!meta.sector || meta.sector.trim().length === 0) {
      reasons.push('missing_sector');
    }

    // 3. Industry must be present and non-empty
    if (!meta.industry || meta.industry.trim().length === 0) {
      reasons.push('missing_industry');
    }

    // 4. Market cap must be present and > 0
    if (meta.marketCap == null || meta.marketCap <= 0) {
      reasons.push('missing_market_cap');
    }

    // 5. Exchange must be valid
    if (!meta.exchange || !VALID_EXCHANGES.has(meta.exchange.toUpperCase())) {
      reasons.push('invalid_exchange');
    }

    // 6. Symbol must not be a raw BSE code
    if (RAW_BSE_CODE_PATTERN.test(meta.symbol)) {
      reasons.push('raw_bse_code_as_symbol');
    }

    // 7. Symbol should not contain exchange suffix in metadata (clean it)
    if (/\.(NS|BO|NSE|BSE)$/i.test(meta.symbol)) {
      reasons.push('symbol_has_exchange_suffix');
    }

    // Determine status
    const criticalCount = reasons.filter(r =>
      ['missing_company_name', 'ticker_as_company_name', 'raw_bse_code_as_symbol'].includes(r)
    ).length;

    if (reasons.length === 0) {
      return { status: 'VERIFIED', reasons: [] };
    } else if (criticalCount > 0) {
      return { status: 'INVALID', reasons };
    } else {
      return { status: 'PARTIAL', reasons };
    }
  }

  /**
   * Quick check — is this metadata usable for display?
   */
  isDisplayable(meta: CompanyMetadata): boolean {
    const result = this.validate(meta);
    return result.status !== 'INVALID';
  }

  /**
   * Generate a validation report for a batch of metadata entries.
   */
  generateReport(entries: CompanyMetadata[]): {
    total: number;
    verified: number;
    partial: number;
    invalid: number;
    commonIssues: Map<string, number>;
  } {
    const results = entries.map(e => this.validate(e));
    const commonIssues = new Map<string, number>();

    for (const r of results) {
      for (const reason of r.reasons) {
        commonIssues.set(reason, (commonIssues.get(reason) || 0) + 1);
      }
    }

    return {
      total: entries.length,
      verified: results.filter(r => r.status === 'VERIFIED').length,
      partial: results.filter(r => r.status === 'PARTIAL').length,
      invalid: results.filter(r => r.status === 'INVALID').length,
      commonIssues,
    };
  }
}
