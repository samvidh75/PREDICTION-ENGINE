import {
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { firebaseConfig, firebasePersistenceReady, googleAuthProvider } from "../../config/firebase";
import { clearAuthSession, saveAuthSession } from "./sessionStore";
import { getFirebaseAuthClient } from "./firebaseClient";

export type AuthUser = {
  uid: string;
  email?: string;
  displayName?: string;
  provider: "google" | "email";
  isNewUser?: boolean;
};

export type SignInWithGoogle = () => Promise<AuthUser>;
export type BeginGoogleRedirect = () => Promise<void>;
export type SignInWithEmail = (email: string, password: string) => Promise<AuthUser>;
export type SignUpWithEmail = (name: string, email: string, password: string) => Promise<AuthUser>;
export type SendPasswordReset = (email: string) => Promise<{ email: string }>;
export type SubscribeSession = (cb: (user: AuthUser | null) => void) => () => void;

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function validatePassword(password: string): string | null {
  const trimmed = password.trim();
  if (trimmed.length < 6) return null;
  return trimmed;
}

function userProviderToAuthProvider(user: User): AuthUser["provider"] {
  const providerIds = user.providerData.map((provider) => provider.providerId);
  if (providerIds.some((id) => id.includes("google"))) return "google";
  return "email";
}

function persistAuthUser(user: User, isNewUser?: boolean): AuthUser {
  const authUser: AuthUser = {
    uid: user.uid,
    provider: userProviderToAuthProvider(user),
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
    isNewUser,
  };

  saveAuthSession({
    status: "authenticated",
    uid: authUser.uid,
    provider: authUser.provider,
    email: authUser.email,
    displayName: authUser.displayName,
    createdAtMs: Date.now(),
  });

  if (typeof window !== "undefined") window.dispatchEvent(new Event("ss:auth-session-changed"));

  return authUser;
}

async function ensureAuthPersistence(): Promise<void> {
  await firebasePersistenceReady;
}

function logAuthDiagnostic(scope: string, error: unknown): void {
  const maybeError = error as {
    code?: string;
    message?: string;
    name?: string;
    stack?: string;
    customData?: { email?: string; credential?: { providerId?: string } };
  };

  const diagnostic = {
    code: maybeError?.code,
    message: maybeError?.message,
    name: maybeError?.name,
    stack: maybeError?.stack,
    email: maybeError?.customData?.email,
    providerId: maybeError?.customData?.credential?.providerId,
  };

  if (typeof window !== "undefined") {
    (window as typeof window & { __authLastError?: unknown; __googleAuthLastError?: unknown }).__authLastError =
      diagnostic;
    if (scope === "google") {
      (window as typeof window & { __googleAuthLastError?: unknown }).__googleAuthLastError = diagnostic;
    }
  }

  console.error(`[Auth ${scope} error details]`, JSON.stringify(diagnostic));
  console.error(`[Auth ${scope} error raw]`, error);
}

function getErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : undefined;
}

async function postIdentityToolkit<T>(method: "accounts:signUp" | "accounts:sendOobCode" | "accounts:signInWithPassword", body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${method}?key=${firebaseConfig.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as any;
  if (!response.ok) {
    const message = payload?.error?.message ?? `Firebase REST ${method} failed`;
    throw { code: `auth/${String(message).toLowerCase().replaceAll("_", "-")}`, message };
  }

  return payload as T;
}

async function postAuthApi<T>(path: "/api/auth/signup" | "/api/auth/login" | "/api/auth/password-reset", body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as any;
  if (!response.ok || payload?.ok === false) {
    const code = payload?.code === "EMAIL_EXISTS" ? "auth/email-already-in-use" : "auth/invalid-credential";
    throw { code, message: payload?.message ?? "Authentication failed." };
  }

  return payload as T;
}

async function createUserWithRest(email: string, password: string): Promise<void> {
  try {
    await postAuthApi<{ ok: true; user: { uid: string } }>("/api/auth/signup", { email, password });
    return;
  } catch (error) {
    if (getErrorCode(error) === "auth/email-already-in-use") throw error;
    console.warn("[Auth] Backend signup unavailable; falling back to Firebase REST.", error);
  }

  await postIdentityToolkit<{ localId: string }>("accounts:signUp", {
    email,
    password,
    returnSecureToken: true,
  });
}

async function signInWithRest(email: string, password: string): Promise<AuthUser> {
  let result: { localId: string; email?: string; displayName?: string };

  try {
    const apiResult = await postAuthApi<{ ok: true; user: { uid: string; email?: string; displayName?: string } }>("/api/auth/login", { email, password });
    result = {
      localId: apiResult.user.uid,
      email: apiResult.user.email,
      displayName: apiResult.user.displayName,
    };
  } catch (error) {
    if (getErrorCode(error) === "auth/invalid-credential") throw error;
    console.warn("[Auth] Backend login unavailable; falling back to Firebase REST.", error);
    result = await postIdentityToolkit<{ localId: string; email?: string; displayName?: string }>("accounts:signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
  }

  const authUser: AuthUser = {
    uid: result.localId,
    email: result.email ?? email,
    displayName: result.displayName,
    provider: "email",
    isNewUser: false,
  };

  saveAuthSession({
    status: "authenticated",
    uid: authUser.uid,
    provider: "email",
    email: authUser.email,
    displayName: authUser.displayName,
    createdAtMs: Date.now(),
  });

  if (typeof window !== "undefined") window.dispatchEvent(new Event("ss:auth-session-changed"));
  return authUser;
}

async function sendPasswordResetWithRest(email: string): Promise<void> {
  try {
    await postAuthApi<{ ok: true; email: string }>("/api/auth/password-reset", { email });
    return;
  } catch (error) {
    if (getErrorCode(error) === "auth/invalid-credential") throw error;
    console.warn("[Auth] Backend password reset unavailable; falling back to Firebase REST.", error);
  }

  await postIdentityToolkit<{ email: string }>("accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
}

async function signInWithGoogleProvider(): Promise<AuthUser> {
  const { auth } = getFirebaseAuthClient();
  await ensureAuthPersistence();

  console.info("[Auth] Google sign-in started", {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    currentUserBeforePopup: auth.currentUser?.uid ?? null,
  });

  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const addInfo = getAdditionalUserInfo(result);
    console.info("[Auth] Google sign-in completed", {
      uid: result.user.uid,
      isNewUser: addInfo?.isNewUser ?? false,
      providerIds: result.user.providerData.map((item) => item.providerId),
    });
    return persistAuthUser(result.user, addInfo?.isNewUser ?? false);
  } catch (error) {
    logAuthDiagnostic("google", error);
    throw error;
  }
}

async function beginGoogleRedirect(): Promise<void> {
  const { auth } = getFirebaseAuthClient();
  await ensureAuthPersistence();
  console.info("[Auth] Google redirect sign-in started", {
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    currentUserBeforeRedirect: auth.currentUser?.uid ?? null,
  });
  await signInWithRedirect(auth, googleAuthProvider);
}

async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { auth } = getFirebaseAuthClient();
  await ensureAuthPersistence();

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const addInfo = getAdditionalUserInfo(result);
    return persistAuthUser(result.user, addInfo?.isNewUser ?? false);
  } catch (error) {
    logAuthDiagnostic("email-login", error);
    if (getErrorCode(error) === "auth/network-request-failed") {
      return await signInWithRest(email, password);
    }
    throw error;
  }
}

async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  const { auth } = getFirebaseAuthClient();
  await ensureAuthPersistence();

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    if (name.trim().length > 0) {
      await updateProfile(result.user, { displayName: name.trim() });
      await result.user.reload();
    }

    return persistAuthUser(auth.currentUser ?? result.user, true);
  } catch (error) {
    logAuthDiagnostic("email-signup", error);
    if (getErrorCode(error) === "auth/network-request-failed") {
      try {
        await createUserWithRest(email, password);
      } catch (restError) {
        const restCode = getErrorCode(restError);
        if (restCode === "auth/email-exists" || restCode === "auth/email-already-in-use") {
          throw { code: "auth/email-already-in-use", message: "An account already exists with this email." };
        }
        if (restCode !== "auth/email-exists") {
          logAuthDiagnostic("email-signup-rest", restError);
          throw restError;
        }
      }

      const signedIn = await signInWithEmail(email, password);
      return { ...signedIn, isNewUser: true };
    }
    throw error;
  }
}

function subscribeSessionImpl(cb: (user: AuthUser | null) => void): () => void {
  const { auth } = getFirebaseAuthClient();
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      clearAuthSession();
      cb(null);
      return;
    }

    cb(persistAuthUser(user));
  });
}

export const authService: {
  signInWithGoogle: SignInWithGoogle;
  beginGoogleRedirect: BeginGoogleRedirect;
  signInWithEmail: SignInWithEmail;
  signUpWithEmail: SignUpWithEmail;
  sendPasswordReset: SendPasswordReset;
  restoreSession: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  subscribeSession: SubscribeSession;
} = {
  signInWithGoogle: async (): Promise<AuthUser> => {
    return await signInWithGoogleProvider();
  },

  beginGoogleRedirect: async (): Promise<void> => {
    try {
      await beginGoogleRedirect();
    } catch (error) {
      logAuthDiagnostic("google-redirect-start", error);
      throw error;
    }
  },

  signInWithEmail: async (email: string, password: string): Promise<AuthUser> => {
    const trimmedEmail = validateEmail(email);
    const trimmedPassword = validatePassword(password);

    if (!trimmedEmail || !trimmedPassword) {
      throw { code: "auth/invalid-credential", message: "Please enter a valid email and password." };
    }

    return await signInWithEmail(trimmedEmail, trimmedPassword);
  },

  signUpWithEmail: async (name: string, email: string, password: string): Promise<AuthUser> => {
    const trimmedEmail = validateEmail(email);
    const trimmedPassword = validatePassword(password);
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      throw { code: "auth/missing-name", message: "Please enter your name." };
    }
    if (!trimmedEmail) {
      throw { code: "auth/invalid-email", message: "Please enter a valid email address." };
    }
    if (!trimmedPassword) {
      throw { code: "auth/weak-password", message: "Password must be at least 6 characters." };
    }

    return await signUpWithEmail(trimmedName, trimmedEmail, trimmedPassword);
  },

  sendPasswordReset: async (email: string): Promise<{ email: string }> => {
    const trimmedEmail = validateEmail(email);
    if (!trimmedEmail) {
      throw { code: "auth/invalid-email", message: "Please enter a valid email address." };
    }

    const { auth } = getFirebaseAuthClient();
    await ensureAuthPersistence();

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      console.info("[Auth] Password reset email requested", { email: trimmedEmail });
      return { email: trimmedEmail };
    } catch (error) {
      logAuthDiagnostic("password-reset", error);
      if (getErrorCode(error) === "auth/network-request-failed") {
        await sendPasswordResetWithRest(trimmedEmail);
        console.info("[Auth] Password reset email requested through REST fallback", { email: trimmedEmail });
        return { email: trimmedEmail };
      }
      throw error;
    }
  },

  restoreSession: async (): Promise<AuthUser | null> => {
    try {
      await ensureAuthPersistence();
      const { auth } = getFirebaseAuthClient();
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          const addInfo = getAdditionalUserInfo(redirectResult);
          return persistAuthUser(redirectResult.user, addInfo?.isNewUser ?? false);
        }
      } catch (redirectError) {
        logAuthDiagnostic("google-redirect-result", redirectError);
        throw redirectError;
      }

      return await new Promise<AuthUser | null>((resolve) => {
        const unsubscribe = subscribeSessionImpl((user) => {
          unsubscribe();
          resolve(user);
        });
      });
    } catch (error) {
      logAuthDiagnostic("restore-session", error);
      return null;
    }
  },

  signOut: async (): Promise<void> => {
    const { auth } = getFirebaseAuthClient();
    await firebaseSignOut(auth);
    clearAuthSession();
  },

  subscribeSession: (cb: (user: AuthUser | null) => void): (() => void) => {
    return subscribeSessionImpl(cb);
  },
};
