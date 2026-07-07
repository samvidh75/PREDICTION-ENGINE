/**
 * CompanyDataValidator — Validates company metadata profiles.
 * Disallows raw PSE registry names and missing fields for dashboard eligibility.
 */

import { CompanyMetadata } from './types';
import { CompanyDataValidator as BaseValidator } from './CompanyDataValidator';

export class CompanyDataValidatorExtended {
  private static baseValidator = new BaseValidator();

  /**
   * Validate if a company metadata has all fields required to be displayed on dashboard:
   *   - Must have symbol
   *   - Must have company name
   *   - Must have quote (checked separately or as pricing presence)
   *   - Must have sector
   *   - Must NOT contain raw PSE placeholders ("PSE Listed Security Code...")
   */
  static isValidForDashboard(meta: CompanyMetadata | null | undefined): boolean {
    if (!meta) return false;
    
    // Check missing fields
    if (!meta.symbol || !meta.companyName || !meta.sector) {
      return false;
    }

    // Exclude raw registry codes or placeholder names
    if (/^\d{5,6}$/.test(meta.symbol)) {
      return false;
    }

    if (meta.companyName.includes('PSE Listed Security Code')) {
      return false;
    }

    if (meta.companyName.toUpperCase() === meta.symbol.toUpperCase()) {
      return false;
    }

    const validation = this.baseValidator.validate(meta);
    return validation.status !== 'INVALID';
  }
}
