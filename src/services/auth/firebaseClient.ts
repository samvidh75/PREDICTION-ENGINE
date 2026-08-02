/**
 * src/services/auth/firebaseClient.ts
 *
 * Returns the canonical Firebase app + auth singletons from src/config/firebase.ts.
 * Kept as a function so call-sites don't change (authService.ts calls getFirebaseAuthClient()).
 */

import { firebaseApp, firebaseAuth, isFirebaseClientConfigured } from "../../config/firebase";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

export function getFirebaseAuthClient(): { app: FirebaseApp; auth: Auth } {
  if (!isFirebaseClientConfigured) {
    throw { code: "auth/missing-api-key", message: "Firebase authentication is not configured for this deployment." };
  }
  return { app: firebaseApp as FirebaseApp, auth: firebaseAuth as Auth };
}
