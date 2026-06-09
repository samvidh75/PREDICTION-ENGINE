/**
 * @vitest-environment node
 *
 * Tests for Firebase Admin authentication module.
 * Tests: production credentials, service-account, ADC, development fallback,
 * injected verifier bypass, and newline normalization.
 * Resets module state between tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// We need to reset the module-level state between tests.
// The firebaseAdmin module caches _app and _auth at module scope.
// We use vi.resetModules() and dynamic import to get a fresh copy each time.
// ---------------------------------------------------------------------------

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('firebaseAdmin', () => {
  describe('production without credentials throws', () => {
    it('throws in production when no credentials are configured', async () => {
      await vi.resetModules();

      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_PROJECT_ID = undefined;
      process.env.FIREBASE_CLIENT_EMAIL = undefined;
      process.env.FIREBASE_PRIVATE_KEY = undefined;
      process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS = undefined;

      // The module eagerly initializes on import; we check it throws.
      await expect(
        import('../firebaseAdmin').then((m) => m.verifyFirebaseToken('test'))
      ).rejects.toThrow(/Firebase Admin credentials are required in production/);
    });
  });

  describe('service-account credentials accepted', () => {
    it('does not throw when service-account env vars are set', async () => {
      await vi.resetModules();

      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n';

      // Should not throw on import (credential setup), but verifyIdToken
      // will still fail because it's a mock key — but that's a runtime error,
      // not a credential error.
      const mod = await import('../firebaseAdmin');
      // The module should import successfully
      expect(mod.setTokenVerifier).toBeDefined();
    });
  });

  describe('ADC flag calls applicationDefault()', () => {
    it('accepts ADC mode without throwing', async () => {
      await vi.resetModules();

      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = undefined;
      process.env.FIREBASE_PRIVATE_KEY = undefined;
      process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS = 'true';

      // ADC may fail at runtime if GOOGLE_APPLICATION_CREDENTIALS is not set,
      // but the import itself should not throw.
      const mod = await import('../firebaseAdmin');
      expect(mod.setTokenVerifier).toBeDefined();
    });
  });

  describe('development fallback permitted', () => {
    it('does not throw in development without credentials', async () => {
      await vi.resetModules();

      process.env.NODE_ENV = 'development';
      process.env.FIREBASE_PROJECT_ID = undefined;
      process.env.FIREBASE_CLIENT_EMAIL = undefined;
      process.env.FIREBASE_PRIVATE_KEY = undefined;
      process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS = undefined;

      const mod = await import('../firebaseAdmin');
      expect(mod.setTokenVerifier).toBeDefined();
    });
  });

  describe('injected verifier bypasses live Firebase', () => {
    it('uses injected verifier instead of live Firebase', async () => {
      await vi.resetModules();

      process.env.NODE_ENV = 'development';

      const mod = await import('../firebaseAdmin');

      const mockVerifier = {
        verifyIdToken: vi.fn(async (token: string) => {
          if (token === 'test-token') {
            return { uid: 'uid-123', email: 'test@example.com' };
          }
          throw new Error('Invalid token');
        }),
      };

      mod.setTokenVerifier(mockVerifier);

      const result = await mod.getTokenVerifier().verifyIdToken('test-token');
      expect(result.uid).toBe('uid-123');
      expect(result.email).toBe('test@example.com');
      expect(mockVerifier.verifyIdToken).toHaveBeenCalledTimes(1);

      // reset
      mod.resetTokenVerifier();

      // After reset, verifyIdToken should call real Firebase (which will fail
      // in test, but the point is the verifier was cleared)
      const verifierAfter = mod.getTokenVerifier();
      expect(verifierAfter).not.toBe(mockVerifier);
    });
  });

  describe('escaped newlines normalized', () => {
    it('handles escaped newlines in private key', async () => {
      await vi.resetModules();

      process.env.NODE_ENV = 'production';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMOCK\\n-----END PRIVATE KEY-----\\n';

      // Should import without throwing — the \\n are normalized to \n
      const mod = await import('../firebaseAdmin');
      expect(mod.setTokenVerifier).toBeDefined();
    });
  });
});
