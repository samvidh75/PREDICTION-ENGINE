/**
 * ScreenerProvider — DISABLED QUARANTINED PROVIDER
 *
 * STATUS: QUARANTINED — F3 Phase 0 blocker.
 * REASON: HTML scraper with no API key, no authorization, no license.
 *         Violates the repository's data plane policy.
 *
 * This stub cannot be enabled without:
 *   1. A documented authorized-use record
 *   2. A non-HTML licensed endpoint (REST API with proper auth)
 *   3. Approval of the kill-switch environment variable
 *
 * No SCREENER_ENABLED=true production switch exists. This provider
 * intentionally throws on construction.
 */

import { FinancialProvider, FinancialData } from './FinancialProvider';

export class ScreenerProvider implements FinancialProvider {
  constructor() {
    throw new Error(
      'QUARANTINED: ScreenerProvider (HTML scraper) is disabled. ' +
      'See reports/f3-data-plane/02-PROVIDER-AUTHORIZATION-MATRIX.md for details. ' +
      'No SCREENER_ENABLED switch exists. Do not re-enable without documented authorization.',
    );
  }

  async getFinancials(_symbol: string): Promise<FinancialData> {
    throw new Error('ScreenerProvider is quarantined — cannot fetch financials.');
  }
}
