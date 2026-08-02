/**
 * src/config/firebaseAdmin.ts
 *
 * Firebase Admin SDK initialization for the backend (Render/Fastify).
 *
 * Reads credentials from env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * In production (Render), these are set via the Render dashboard.
 * In development, set them in .env (with private key as a single-line string).
 *
 * Falls back to `applicationDefault` credentials when available
 * (useful in GCP environments or local gcloud auth).
 */

import { randomUUID } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

// ── Configuration ──────────────────────────────────────────────────────────

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID?.trim();
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.trim();
const USE_ADC = process.env.FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS === "true";

function isFullyConfigured(): boolean {
  return Boolean(
    PROJECT_ID &&
      CLIENT_EMAIL &&
      PRIVATE_KEY &&
      !PRIVATE_KEY.includes("placeholder"),
  );
}

// ── Lazy singleton ─────────────────────────────────────────────────────────

let _app: App | null = null;
let _auth: Auth | null = null;

function getAdminApp(): App | null {
  if (_app) return _app;

  // Already initialized by another module
  const existing = getApps().find((a) => a.name !== "[DEFAULT]");
  if (existing) {
    _app = existing;
    return _app;
  }

  if (!isFullyConfigured() && !USE_ADC) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Firebase Admin] Not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
          "FIREBASE_PRIVATE_KEY, or enable FIREBASE_USE_APPLICATION_DEFAULT_CREDENTIALS. " +
          "Auth token verification will be unavailable.",
      );
    }
    return null;
  }

  try {
    if (USE_ADC) {
      _app = initializeApp({ projectId: PROJECT_ID });
    } else {
      _app = initializeApp({
        credential: cert({
          projectId: PROJECT_ID,
          clientEmail: CLIENT_EMAIL,
          privateKey: (PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
        }),
      });
    }
    _auth = getAuth(_app);
    return _app;
  } catch (err) {
    console.error("[Firebase Admin] Failed to initialize:", err);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the Firebase Admin Auth instance, or null if not configured.
 */
export function getFirebaseAdminAuth(): Auth | null {
  if (_auth) return _auth;
  const app = getAdminApp();
  if (!app) return null;
  _auth = getAuth(app);
  return _auth;
}

/**
 * Verifies a Firebase ID token and returns its decoded payload.
 * Returns null if verification fails or Admin SDK is not configured.
 */
export async function verifyFirebaseToken(
  idToken: string,
): Promise<{ uid: string; email?: string; phoneNumber?: string } | null> {
  const auth = getFirebaseAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      phoneNumber: decoded.phone_number,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a session cookie from an ID token (for cookie-based auth flows).
 * Expires in 14 days by default (max Firebase allows without refresh).
 */
export async function createSessionCookie(
  idToken: string,
  expiresInMs: number = 14 * 24 * 60 * 60 * 1000,
): Promise<string | null> {
  const auth = getFirebaseAdminAuth();
  if (!auth) return null;

  try {
    return await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  } catch {
    return null;
  }
}

/**
 * Generates a one-time (nonce) for CSRF protection on session cookie login.
 */
export function generateCsrfNonce(): string {
  return randomUUID();
}
