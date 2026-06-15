/**
 * src/config/firebase.ts
 *
 * Canonical Firebase client configuration for StockStory India.
 *
 * Known project values (projectId, authDomain, storageBucket) are hardcoded.
 * Secret values (apiKey, messagingSenderId, appId) are read from VITE_* env vars.
 *
 * In development:  set these in .env
 * In production:   set these in the deployment provider's secret/env UI
 *
 * ── How to obtain the missing values ──────────────────────────────────────
 *  1. Go to https://console.firebase.google.com/project/stockstory-india/settings/general
 *  2. Scroll to "Your apps" → click your web app → "Firebase SDK snippet" → "Config"
 *  3. Copy apiKey, messagingSenderId, appId into .env as VITE_FIREBASE_* vars
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ── Known project constants (safe to hardcode — public by Firebase design) ──
const PROJECT_ID = "stockstory-india";
const AUTH_DOMAIN = "stockstory-india.firebaseapp.com";
const STORAGE_BUCKET = "stockstory-india.firebasestorage.app";

// ── Secret values — must be set in .env / .env.production ──────────────────
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const MESSAGING_SENDER_ID = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined;
const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
export const isFirebaseClientConfigured = Boolean(
  API_KEY &&
    !API_KEY.includes("placeholder") &&
    MESSAGING_SENDER_ID &&
    APP_ID,
);

console.log("[Firebase bootstrap] env diagnostics", {
  hasApiKey: Boolean(API_KEY && !API_KEY.includes("placeholder")),
  hasMessagingSenderId: Boolean(MESSAGING_SENDER_ID),
  hasAppId: Boolean(APP_ID),
  hasAuthDomain: Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  hasProjectId: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  hasStorageBucket: Boolean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  hasGoogleClientId: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
  isProd: import.meta.env.PROD,
});

// ── Startup validation ─────────────────────────────────────────────────────
// Warn loudly if secrets are missing. Auth calls still fail closed, but the
// public app remains renderable so users see a clear sign-in error.
function assertFirebaseEnv(): void {
  const missing: string[] = [];

  if (!API_KEY || API_KEY.includes("placeholder")) missing.push("VITE_FIREBASE_API_KEY");
  if (!MESSAGING_SENDER_ID) missing.push("VITE_FIREBASE_MESSAGING_SENDER_ID");
  if (!APP_ID) missing.push("VITE_FIREBASE_APP_ID");

  if (missing.length > 0) {
    const msg =
      `[StockStory Firebase] Missing required environment variables: ${missing.join(", ")}.\n` +
      `Get them from: https://console.firebase.google.com/project/${PROJECT_ID}/settings/general`;

    console.warn(msg);
  }
}

assertFirebaseEnv();

// ── Firebase config object ─────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID ?? "",
  appId: APP_ID ?? "",
} as const;

// ── Singleton Firebase app ─────────────────────────────────────────────────
export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth (LOCAL persistence = survives browser refresh) ───────────────────
export const firebaseAuth: Auth = isFirebaseClientConfigured
  ? getAuth(firebaseApp)
  : (null as unknown as Auth);

// Set session persistence to LOCAL so users stay signed in across refreshes.
// This is async; components relying on auth state must use onAuthStateChanged.
export const firebasePersistenceReady = isFirebaseClientConfigured
  ? setPersistence(firebaseAuth, browserLocalPersistence).catch((err) => {
      console.warn("[Firebase] Could not set auth persistence:", err);
    })
  : Promise.resolve();

// ── Firestore ──────────────────────────────────────────────────────────────
export const firestoreDb: Firestore = getFirestore(firebaseApp);

// ── Google OAuth Provider ─────────────────────────────────────────────────
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope("profile");
googleAuthProvider.addScope("email");

export default firebaseApp;
