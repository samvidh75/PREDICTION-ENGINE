/**
 * TRACK-P4B-P3D — Firebase Admin Authentication (production-hardened)
 *
 * Single source of truth for verifying Firebase ID tokens.
 * Never uses frontend VITE_ values. Never exposes private credentials.
 *
 * Production requires explicit credentials — no silent unsafe fallback.
 *
 * Environment variables (backend only):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY    (escaped with \n)
 *   FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS  (set to "true" for ADC)
 */
import { initializeApp, cert, applicationDefault, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let _app: App | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): App {
  if (_app) return _app;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    _app = existingApps[0];
    return _app;
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const useAdc = process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS === 'true';

  // Service account credentials
  if (projectId && clientEmail && privateKey) {
    _app = initializeApp({
      projectId,
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return _app;
  }

  // Application Default Credentials — explicitly uses applicationDefault()
  if (useAdc) {
    _app = initializeApp({
      projectId: projectId ?? 'stockstory',
      credential: applicationDefault(),
    });
    return _app;
  }

  // Production — fail if no credentials configured
  if (isProduction) {
    throw new Error(
      'Firebase Admin credentials are required in production. ' +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, ' +
      'or set FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS=true.'
    );
  }

  // Development/CI fallback
  _app = initializeApp({ projectId: projectId ?? 'stockstory-dev' });
  return _app;
}

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

/**
 * Verify a Firebase ID token and return the decoded uid.
 * Throws if token is invalid, expired, or revoked.
 */
export async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string }> {
  const decoded = await getFirebaseAuth().verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email,
  };
}

/**
 * For testing: allow injection of a mock verifier.
 */
export interface TokenVerifier {
  verifyIdToken(token: string): Promise<{ uid: string; email?: string }>;
}

let _injectedVerifier: TokenVerifier | null = null;

export function setTokenVerifier(verifier: TokenVerifier): void {
  _injectedVerifier = verifier;
}

export function getTokenVerifier(): TokenVerifier {
  return _injectedVerifier ?? {
    verifyIdToken: verifyFirebaseToken,
  };
}

export function resetTokenVerifier(): void {
  _injectedVerifier = null;
}

/** Type for a Firebase token verification function. */
export type VerifyTokenFn = (token: string) => Promise<{ uid: string; email?: string }>;
