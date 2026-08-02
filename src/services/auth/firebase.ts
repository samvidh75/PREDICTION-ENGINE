/**
 * src/services/auth/firebase.ts
 *
 * Re-exports the canonical Firebase singletons from src/config/firebase.ts.
 *
 * All application code should import from HERE (not directly from src/config)
 * so that import paths remain stable if the config location ever changes.
 */

export {
  firebaseApp as default,
  firebaseApp as app,
  firebaseAuth as auth,
  firestoreDb as db,
  googleAuthProvider as googleProvider,
  firebasePersistenceReady,
  firebaseConfig,
} from "../../config/firebase";
