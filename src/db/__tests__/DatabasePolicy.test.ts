import { describe, it, expect } from 'vitest';
import { loadDatabasePolicy, resolveAdapter } from '../DatabasePolicy';

describe('DatabasePolicy', () => {
  describe('loadDatabasePolicy', () => {
    it('defaults to auto adapter in production', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production' });
      expect(policy.requestedAdapter).toBe('auto');
      expect(policy.allowSqliteInProduction).toBe(false);
      expect(policy.sqliteProductionAllowed).toBe(false);
    });

    it('loads explicit postgres adapter in production', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production', DB_ADAPTER: 'postgres' });
      expect(policy.requestedAdapter).toBe('postgres');
    });

    it('rejects sqlite in production without ALLOW_SQLITE_IN_PRODUCTION', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production', DB_ADAPTER: 'sqlite' });
      expect(policy.sqliteProductionAllowed).toBe(false);
    });

    it('allows sqlite in production when ALLOW_SQLITE_IN_PRODUCTION=true', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production', DB_ADAPTER: 'sqlite', ALLOW_SQLITE_IN_PRODUCTION: 'true' });
      expect(policy.sqliteProductionAllowed).toBe(true);
    });

    it('requires explicit DB_ADAPTER in test environment', () => {
      expect(() => loadDatabasePolicy({ NODE_ENV: 'test' })).toThrow('DB_ADAPTER must be explicitly set');
    });

    it('accepts explicit sqlite in test', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'test', DB_ADAPTER: 'sqlite' });
      expect(policy.requestedAdapter).toBe('sqlite');
    });
  });

  describe('resolveAdapter', () => {
    it('returns postgres when available and requested', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production', DB_ADAPTER: 'postgres' });
      const resolved = resolveAdapter(policy, true);
      expect(resolved.kind).toBe('postgres');
      expect(resolved.fallbackUsed).toBe(false);
    });

    it('returns unavailable when postgres unavailable and no fallback', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production', DB_ADAPTER: 'postgres', ALLOW_SQLITE_FALLBACK: 'false' });
      const resolved = resolveAdapter(policy, false);
      expect(resolved.kind).toBe('unavailable');
    });

    it('returns unavailable when sqlite not allowed in production', () => {
      const policy = loadDatabasePolicy({ NODE_ENV: 'production', DB_ADAPTER: 'sqlite' });
      const resolved = resolveAdapter(policy, false);
      expect(resolved.kind).toBe('unavailable');
      expect(resolved.detail).toContain('SQLite is not allowed in production');
    });
  });
});
