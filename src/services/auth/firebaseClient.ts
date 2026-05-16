import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

type Env = {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
};

function getEnv(): Env {
  return import.meta.env as unknown as Env;
}

function requireEnv(value: string | undefined, key: string): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(`[auth] Missing required env var ${key}. Configure Firebase auth for production-grade sign-in.`);
  }
  return v;
}

function buildFirebaseConfig() {
  const env = getEnv();

  return {
    apiKey: requireEnv(env.VITE_FIREBASE_API_KEY, "VITE_FIREBASE_API_KEY"),
    authDomain: requireEnv(env.VITE_FIREBASE_AUTH_DOMAIN, "VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnv(env.VITE_FIREBASE_PROJECT_ID, "VITE_FIREBASE_PROJECT_ID"),
    storageBucket: requireEnv(env.VITE_FIREBASE_STORAGE_BUCKET, "VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requireEnv(env.VITE_FIREBASE_MESSAGING_SENDER_ID, "VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requireEnv(env.VITE_FIREBASE_APP_ID, "VITE_FIREBASE_APP_ID"),
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuthClient(): { app: FirebaseApp; auth: Auth } {
  if (app && auth) return { app, auth };

  app = initializeApp(buildFirebaseConfig());
  auth = getAuth(app);
  return { app, auth };
}
