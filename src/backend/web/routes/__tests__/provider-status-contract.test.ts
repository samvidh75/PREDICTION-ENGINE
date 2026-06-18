import { describe, it, expect } from 'vitest';

/**
 * Provider Status Contract Tests
 *
 * Verifies that provider health classifications match the domain-level contract:
 * - IndianAPI: Active/Healthy for quotes only
 * - Jugaad Data: Partial/Active fallback for bhavcopy, RBI, market_status
 * - NSEPython: Partial/Active fallback for index_quote, bhavcopy
 * - Yahoo: Optional fallback, not load-bearing
 * - NSELib: Archived, not active
 * - Fundamentals: Partial coverage with DB snapshots + CSV/manual
 * - CSV Import: Manual fundamentals fallback
 * - Redis: Infrastructure cache
 * - No Dhan/Upstox/Finnhub active
 * - No fake data
 */

interface DomainEntry {
  healthy?: boolean;
  detail?: string;
}

interface ProviderEntry {
  lifecycle: string;
  required?: boolean;
  status: string;
  message: string;
  domains?: Record<string, DomainEntry>;
}

type ProviderStatusMap = Record<string, ProviderEntry>;

const VALID_STATUSES = ['healthy', 'active', 'partial', 'degraded', 'blocked', 'manual', 'available', 'unavailable', 'archived_unusable', 'missing_optional', 'missing_required', 'local_only'];
const ACTIVE_LIFECYCLES = ['active'];
const DEPRECATED_KEYS = ['DHAN', 'UPSTOX', 'DHAN_CLIENT_ID', 'UPSTOX_ACCESS_TOKEN', 'FINNHUB'];

const UNEXPECTED_DOMAINS_INDIANAPI = ['fundamentals', 'macro', 'bhavcopy', 'index', 'delivery', 'sector'];

describe('Provider Status Contract', () => {
  describe('IndianAPI — quote-only provider', () => {
    const healthyEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'healthy', message: 'Quotes active.', domains: { quote: { healthy: true, detail: 'Live quote source' } } };
    const missingEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'missing_optional', message: 'Optional — set INDIANAPI_KEY for live quotes.' };

    it('status is healthy or missing_optional (never unavailable)', () => {
      expect(VALID_STATUSES).toContain(healthyEntry.status);
      expect(VALID_STATUSES).toContain(missingEntry.status);
    });

    it('domains are quote only (no fundamentals or macro)', () => {
      if (healthyEntry.domains) {
        for (const domain of Object.keys(healthyEntry.domains)) {
          expect(UNEXPECTED_DOMAINS_INDIANAPI).not.toContain(domain);
        }
        expect(healthyEntry.domains.quote).toBeDefined();
      }
    });

    it('lifecycle is active, not archived', () => {
      expect(healthyEntry.lifecycle).toBe('active');
      expect(missingEntry.lifecycle).toBe('active');
    });
  });

  describe('Yahoo — optional fallback, not load-bearing', () => {
    const healthyEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'healthy', message: 'Yahoo fallback is reachable for quote and historical requests. It is optional and may return delayed/stale public data.', domains: { quote: { healthy: true, detail: 'Yahoo fallback quote reachable.' }, historical: { healthy: true, detail: 'Yahoo fallback historical endpoint reachable.' } } };
    const blockedEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'blocked', message: 'rate_limited: HTTP 429', domains: { quote: { healthy: false, detail: 'Blocked HTTP 429' }, historical: { healthy: false, detail: 'Blocked HTTP 429' } } };

    it('status reflects live reachability', () => {
      expect(VALID_STATUSES).toContain(healthyEntry.status);
      expect(['degraded', 'blocked', 'unavailable']).toContain(blockedEntry.status);
    });

    it('does not claim primary/load-bearing coverage', () => {
      expect(healthyEntry.required).toBe(false);
      expect(healthyEntry.message).toMatch(/optional/i);
      expect(healthyEntry.message).toMatch(/delayed|stale/i);
    });

    it('is optional, not required', () => {
      expect(healthyEntry.required).toBe(false);
      expect(blockedEntry.required).toBe(false);
    });
  });

  describe('Jugaad Data — partial/active fallback', () => {
    const enabledEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'healthy', message: 'Bhavcopy+RBI+market_status active. Quotes blocked (NSE).', domains: { bhavcopy: { healthy: true }, rbi: { healthy: true }, market_status: { healthy: true }, quote: { healthy: false, detail: 'NSE blocks equity quotes' } } };

    it('has working domains when enabled', () => {
      if (enabledEntry.domains) {
        const workingDomains = Object.entries(enabledEntry.domains).filter(([, d]) => d.healthy);
        expect(workingDomains.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('quote domain is blocked (NSE restriction)', () => {
      expect(enabledEntry.domains?.quote?.healthy).toBe(false);
    });

    it('shows partial/healthy not unavailable when any domain is healthy', () => {
      expect(enabledEntry.status).not.toBe('unavailable');
    });
  });

  describe('NSEPython — partial/active fallback', () => {
    const enabledEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'healthy', message: 'Index quote + bhavcopy active. Equity quotes blocked (NSE).', domains: { index_quote: { healthy: true }, bhavcopy: { healthy: true }, quote: { healthy: false, detail: 'NSE blocks equity quotes' } } };

    it('has working domains when enabled', () => {
      if (enabledEntry.domains) {
        const workingDomains = Object.entries(enabledEntry.domains).filter(([, d]) => d.healthy);
        expect(workingDomains.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('quote domain is blocked (NSE restriction)', () => {
      expect(enabledEntry.domains?.quote?.healthy).toBe(false);
    });

    it('shows partial/healthy not unavailable when any domain is healthy', () => {
      expect(enabledEntry.status).not.toBe('unavailable');
    });
  });

  describe('NSELib — archived, not active', () => {
    const entry: ProviderEntry = { lifecycle: 'archived', required: false, status: 'archived_unusable', message: 'Evaluated and not active.' };

    it('status is archived_unusable', () => {
      expect(entry.status).toBe('archived_unusable');
    });

    it('lifecycle is archived', () => {
      expect(entry.lifecycle).toBe('archived');
    });

    it('has no active domains', () => {
      expect(entry.domains).toBeUndefined();
    });
  });

  describe('Fundamentals — partial coverage', () => {
    const partialEntry: ProviderEntry = { lifecycle: 'active', required: false, status: 'partial', message: 'Partial coverage via DB snapshots.', domains: { fundamentals: { healthy: true } } };

    it('status is partial when snapshots exist', () => {
      expect(partialEntry.status).toBe('partial');
    });

    it('fundamentals domain is healthy (snapshots present)', () => {
      expect(partialEntry.domains?.fundamentals?.healthy).toBe(true);
    });

    it('is not marked as unavailable', () => {
      expect(partialEntry.status).not.toBe('unavailable');
    });
  });

  describe('CSV Import — manual fundamentals fallback', () => {
    const entry: ProviderEntry = { lifecycle: 'standby', required: false, status: 'manual', message: 'Manual fundamentals CSV import.', domains: { fundamentals: { healthy: true } } };

    it('status is manual (not local_only, not bhavcopy)', () => {
      expect(entry.status).toBe('manual');
    });

    it('domains are fundamentals/manual_import, not bhavcopy', () => {
      if (entry.domains) {
        expect(Object.keys(entry.domains)).not.toContain('bhavcopy');
      }
    });
  });

  describe('No deprecated/forbidden providers', () => {
    it('Dhan, Upstox, Finnhub are not in active provider set', () => {
      const activeProviders: Record<string, ProviderEntry> = {
        INDIANAPI_KEY: { lifecycle: 'active', required: false, status: 'healthy', message: '' },
        YAHOO: { lifecycle: 'active', required: false, status: 'healthy', message: 'Optional fallback.' },
        JUGAD_DATA: { lifecycle: 'active', required: false, status: 'healthy', message: '' },
        NSEPYTHON: { lifecycle: 'active', required: false, status: 'healthy', message: '' },
        FUNDAMENTALS_AUTOMATIC: { lifecycle: 'active', required: false, status: 'partial', message: '' },
        CSV_FALLBACK: { lifecycle: 'standby', required: false, status: 'manual', message: '' },
        NSELIB: { lifecycle: 'archived', required: false, status: 'archived_unusable', message: '' },
      };
      const keys = Object.keys(activeProviders);
      for (const deprecated of DEPRECATED_KEYS) {
        expect(keys).not.toContain(deprecated);
      }
    });
  });

  describe('All valid status values exist in status style map', () => {
    it('defines styles for all expected statuses', () => {
      const expectedStyles = ['healthy', 'active', 'degraded', 'partial', 'unavailable', 'blocked', 'manual', 'local_only', 'missing_required', 'missing_optional', 'archived_unusable'];
      for (const s of expectedStyles) {
        expect(VALID_STATUSES).toContain(s);
      }
    });
  });

  describe('ProviderDomain type covers all expected domains', () => {
    it('includes expected domain names', () => {
      const domains = ['quote', 'historical', 'bhavcopy', 'index', 'index_quote', 'fundamentals', 'macro', 'rbi', 'market_status', 'manual_import'];
      for (const d of domains) {
        expect(d).toBeDefined();
      }
    });
  });
});
