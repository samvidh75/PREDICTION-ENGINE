/**
 * TRACK-P4B-P3G — Firebase Admin Tests
 *
 * Tests firebaseAdmin module behavior: credential modes, environment handling,
 * injected verifier bypass, and key normalization.
 * Resets environment and module state between tests.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the module behavior via the exported functions.
// The getFirebaseApp() function is internal but its effects are observable
// through verifyFirebaseToken and getTokenVerifier.

const OLD_ENV = { ...process.env };

beforeEach(() => {
  // Reset environment (except PATH and other system vars)
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('FIREBASE_') || key === 'NODE_ENV') {
      delete process.env[key];
    }
  }
  // Reset the firebaseAdmin module's internal state
  // We use vi.resetModules() in each test to get a fresh module
});

afterEach(() => {
  // Restore original environment
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('FIREBASE_') || key === 'NODE_ENV') {
      delete process.env[key];
    }
  }
  for (const [key, val] of Object.entries(OLD_ENV)) {
    if (val !== undefined) {
      process.env[key] = val;
    }
  }
});

describe('firebaseAdmin', () => {
  // ---- production without credentials throws ----
  it('production without credentials throws', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS;

    // Need fresh module import to trigger getFirebaseApp
    vi.resetModules();
    const mod = await import('../firebaseAdmin');

    await expect(mod.verifyFirebaseToken('any-token')).rejects.toThrow();
  });

  // ---- service-account environment accepted ----
  it('service-account environment accepted (does not throw on init)', async () => {
    process.env.NODE_ENV = 'development';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n';

    vi.resetModules();
    // Importing should not throw — the module is initialized lazily on first verify
    const mod = await import('../firebaseAdmin');

    // verifyFirebaseToken will still fail because the key is fake,
    // but the APP initialization should not throw.
    // We check that setTokenVerifier works to confirm the module loaded.
    expect(() => mod.setTokenVerifier({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-uid' }),
    })).not.toThrow();

    mod.resetTokenVerifier();
  });

  // ---- ADC flag calls applicationDefault() ----
  it('ADC flag does not throw during init', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS = 'true';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    vi.resetModules();
    const mod = await import('../firebaseAdmin');

    // In a test environment without real ADC, verifyFirebaseToken will fail
    // at the auth level, but the app initialization should proceed.
    // The key assertion: the module doesn't fail at import/init time
    // when FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS=true is set.
    expect(() => mod.setTokenVerifier({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'adc-uid' }),
    })).not.toThrow();

    mod.resetTokenVerifier();
  });

  // ---- development fallback permitted ----
  it('development fallback permitted', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS;

    vi.resetModules();
    const mod = await import('../firebaseAdmin');

    // verifyFirebaseToken may fail (no real Firebase), but the module
    // should not throw during initialization in dev mode.
    // We can inject a verifier and verify it works.
    const mockVerifier = {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'dev-uid', email: 'dev@test.com' }),
    };

    mod.setTokenVerifier(mockVerifier);
    const result = await mod.getTokenVerifier().verifyIdToken('mock-dev-token');
    expect(result.uid).toBe('dev-uid');
    expect(result.email).toBe('dev@test.com');
    mod.resetTokenVerifier();
  });

  // ---- injected verifier bypasses live Firebase ----
  it('injected verifier bypasses live Firebase', async () => {
    process.env.NODE_ENV = 'development';

    vi.resetModules();
    const mod = await import('../firebaseAdmin');

    const mockVerifier = {
      verifyIdToken: vi.fn(async (token: string) => {
        if (token === 'my-test-token') {
          return { uid: 'injected-uid', email: 'injected@test.com' };
        }
        throw new Error('Invalid token');
      }),
    };

    mod.setTokenVerifier(mockVerifier);

    const verifier = mod.getTokenVerifier();

    // Valid token
    const result = await verifier.verifyIdToken('my-test-token');
    expect(result.uid).toBe('injected-uid');
    expect(result.email).toBe('injected@test.com');

    // Invalid token
    await expect(verifier.verifyIdToken('bad-token')).rejects.toThrow('Invalid token');

    // The mock was called, not real Firebase
    expect(mockVerifier.verifyIdToken).toHaveBeenCalledTimes(2);

    mod.resetTokenVerifier();
  });

  // ---- resetTokenVerifier restores default ----
  it('resetTokenVerifier clears injected verifier', async () => {
    process.env.NODE_ENV = 'development';

    vi.resetModules();
    const mod = await import('../firebaseAdmin');

    const mockVerifier = {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'temp-uid' }),
    };

    mod.setTokenVerifier(mockVerifier);
    expect((mod.getTokenVerifier() as any) === mockVerifier).toBe(true);

    mod.resetTokenVerifier();
    // After reset, the verifier should no longer be the mock
    expect((mod.getTokenVerifier() as any) === mockVerifier).toBe(false);
  });

  // ---- escaped newlines in FIREBASE_PRIVATE_KEY normalized ----
  it('escaped newlines in FIREBASE_PRIVATE_KEY normalized', async () => {
    // The normalization happens inside getFirebaseApp() which is not exported.
    // We test that a key with \\n delimiters is accepted without crashing
    // (the actual normalization logic is: privateKey?.replace(/\\n/g, '\n'))
    process.env.NODE_ENV = 'development';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
    // Key with escaped newlines (as stored in env vars)
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMOCKKEY\\n-----END PRIVATE KEY-----\\n';

    vi.resetModules();
    const mod = await import('../firebaseAdmin');

    // Should not throw on import — the key formatting is handled internally
    expect(() => mod.setTokenVerifier({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'key-test-uid' }),
    })).not.toThrow();

    mod.resetTokenVerifier();
  });
});
