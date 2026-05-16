import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

import { clearAuthSession, loadAuthSession, saveAuthSession } from "./sessionStore";
import { getFirebaseAuthClient } from "./firebaseClient";

export type AuthUser = {
  uid: string;
  email?: string;
  displayName?: string;
  provider: "google" | "email" | "apple";
};

export type AuthError = {
  message: string;
};

export type SignInWithGoogle = () => Promise<AuthUser>;
export type SignInWithApple = () => Promise<AuthUser>;
export type SignInWithEmail = (email: string, password: string) => Promise<AuthUser>;

export type SignUpWithEmail = (name: string, email: string, password: string) => Promise<AuthUser>;

export type SendOtp = (email: string) => Promise<{ expiresInSeconds: number; debugOtpCode?: string }>;
export type VerifyOtp = (email: string, code: string) => Promise<{ ok: true }>;
export type ResetPassword = (email: string, code: string, newPassword: string) => Promise<AuthUser>;

export type SubscribeSession = (cb: (user: AuthUser | null) => void) => () => void;

function makeAuthError(message: string): AuthError {
  return { message };
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed.includes("@")) return null;
  if (trimmed.length < 6) return null;
  return trimmed;
}

function validatePassword(password: string): string | null {
  const trimmed = password.trim();
  if (trimmed.length < 6) return null;
  return trimmed;
}

function userProviderToAuthProvider(user: User): AuthUser["provider"] {
  const providerIds = user.providerData.map((p) => p.providerId);
  if (providerIds.some((id) => id.includes("google"))) return "google";
  if (providerIds.some((id) => id.includes("apple"))) return "apple";
  return "email";
}

function persistAuthUser(user: User): AuthUser {
  const authUser: AuthUser = {
    uid: user.uid,
    provider: userProviderToAuthProvider(user),
    email: user.email ?? undefined,
    displayName: user.displayName ?? undefined,
  };

  saveAuthSession({
    status: "authenticated",
    uid: authUser.uid,
    provider: authUser.provider,
    email: authUser.email,
    displayName: authUser.displayName,
    createdAtMs: Date.now(),
  });

  return authUser;
}

function mapFirebaseErrorToMessage(e: unknown): string {
  if (!e || typeof e !== "object") return "Authentication could not be completed. Please try again.";

  // Firebase errors are typically { code, message }.
  const maybe = e as { code?: string; message?: string };
  const msg = typeof maybe.message === "string" ? maybe.message : undefined;
  const code = typeof maybe.code === "string" ? maybe.code : undefined;

  // Calm, trust-first messages (avoid “legal” tone).
  if (code === "auth/user-not-found") return "No account was found for this email. Please check and try again.";
  if (code === "auth/wrong-password") return "The password is incorrect. Please try again.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait briefly and try again.";
  if (code === "auth/popup-blocked") return "Sign-in was blocked by the browser. Please allow pop-ups and try again.";
  if (code === "auth/network-request-failed") return "Network connection was interrupted. Please try again.";

  if (msg) return msg;

  return "Authentication could not be completed. Please try again.";
}

async function signInWithProvider(provider: "google" | "apple"): Promise<AuthUser> {
  const { auth } = getFirebaseAuthClient();

  if (provider === "google") {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, googleProvider);
    return persistAuthUser(result.user);
  }

  const appleProvider = new OAuthProvider("apple.com");
  // Note: Firebase may require Apple sign-in configuration in Firebase console.
  // We keep UX calm and rely on Firebase errors if not configured.
  const result = await signInWithPopup(auth, appleProvider);
  return persistAuthUser(result.user);
}

async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { auth } = getFirebaseAuthClient();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return persistAuthUser(result.user);
}

async function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  const { auth } = getFirebaseAuthClient();
  const result = await createUserWithEmailAndPassword(auth, email, password);

  if (name.trim().length > 0) {
    await updateProfile(result.user, { displayName: name.trim() });
  }

  // Refresh after profile update.
  await result.user.reload();
  return persistAuthUser(auth.currentUser ?? result.user);
}

function subscribeSessionImpl(cb: (user: AuthUser | null) => void): () => void {
  const { auth } = getFirebaseAuthClient();
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user) {
      clearAuthSession();
      cb(null);
      return;
    }

    cb(persistAuthUser(user));
  });

  return unsubscribe;
}

export const authService: {
  signInWithGoogle: SignInWithGoogle;
  signInWithApple: SignInWithApple;
  signInWithEmail: SignInWithEmail;

  signUpWithEmail: SignUpWithEmail;

  sendOtp: SendOtp;
  verifyOtp: VerifyOtp;
  resetPassword: ResetPassword;

  restoreSession: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  subscribeSession: SubscribeSession;
} = {
  signInWithGoogle: (async (): Promise<AuthUser> => {
    try {
      return await signInWithProvider("google");
    } catch (e) {
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies SignInWithGoogle,

  signInWithApple: (async (): Promise<AuthUser> => {
    try {
      return await signInWithProvider("apple");
    } catch (e) {
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies SignInWithApple,

  signInWithEmail: (async (email: string, password: string): Promise<AuthUser> => {
    try {
      const trimmedEmail = validateEmail(email);
      const trimmedPassword = validatePassword(password);

      if (!trimmedEmail || !trimmedPassword) {
        throw makeAuthError("Authentication could not be completed. Please verify your credentials.");
      }

      return await signInWithEmail(trimmedEmail, trimmedPassword);
    } catch (e) {
      if (typeof e === "object" && e && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        throw e;
      }
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies SignInWithEmail,

  signUpWithEmail: (async (name: string, email: string, password: string): Promise<AuthUser> => {
    try {
      const trimmedEmail = validateEmail(email);
      const trimmedPassword = validatePassword(password);
      const trimmedName = name.trim();

      if (!trimmedEmail || !trimmedPassword || trimmedName.length < 2) {
        throw makeAuthError("Sign up could not be completed. Please verify your details.");
      }

      return await signUpWithEmail(trimmedName, trimmedEmail, trimmedPassword);
    } catch (e) {
      if (typeof e === "object" && e && "message" in e && typeof (e as { message?: unknown }).message === "string") {
        throw e;
      }
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies SignUpWithEmail,

  sendOtp: (async (email: string): Promise<{ expiresInSeconds: number; debugOtpCode?: string }> => {
    try {
      const trimmedEmail = validateEmail(email);
      if (!trimmedEmail) throw makeAuthError("Recovery code could not be delivered. Please verify the email address.");

      const { auth } = getFirebaseAuthClient();

      // Firebase password reset email flow:
      // We send the reset email, then the “OTP code” stage expects the user to paste the action code from the link.
      const expiresInSeconds = 300;

      await sendPasswordResetEmail(auth, trimmedEmail);

      return { expiresInSeconds };
    } catch (e) {
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies SendOtp,

  verifyOtp: (async (email: string, code: string): Promise<{ ok: true }> => {
    try {
      const trimmedEmail = validateEmail(email);
      if (!trimmedEmail) throw makeAuthError("OTP verification could not be completed. Please verify your email.");

      const trimmedCode = code.trim();
      if (trimmedCode.length < 4) throw makeAuthError("OTP verification could not be completed. Please verify the code and try again.");

      const { auth } = getFirebaseAuthClient();
      const actionEmail = await verifyPasswordResetCode(auth, trimmedCode);

      if (actionEmail.toLowerCase() !== trimmedEmail.toLowerCase()) {
        throw makeAuthError("OTP verification could not be completed. Please verify the code and try again.");
      }

      return { ok: true };
    } catch (e) {
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies VerifyOtp,

  resetPassword: (async (email: string, code: string, newPassword: string): Promise<AuthUser> => {
    try {
      const trimmedEmail = validateEmail(email);
      const trimmedPassword = validatePassword(newPassword);

      if (!trimmedEmail || !trimmedPassword) {
        throw makeAuthError("Password reset could not be completed. Please verify the details.");
      }

      const trimmedCode = code.trim();
      if (trimmedCode.length < 4) throw makeAuthError("Password reset could not be completed. OTP is incorrect.");

      const { auth } = getFirebaseAuthClient();

      await confirmPasswordReset(auth, trimmedCode, trimmedPassword);

      // After confirming reset, sign in for continuity.
      const result = await signInWithEmail(trimmedEmail, trimmedPassword);
      return result;
    } catch (e) {
      throw makeAuthError(mapFirebaseErrorToMessage(e));
    }
  }) satisfies ResetPassword,

  restoreSession: (async (): Promise<AuthUser | null> => {
    const existing = loadAuthSession();
    if (existing.status !== "authenticated") {
      return new Promise<AuthUser | null>((resolve) => {
        const unsubscribe = subscribeSessionImpl((user) => {
          unsubscribe();
          resolve(user);
        });
      });
    }

    return new Promise<AuthUser | null>((resolve) => {
      const unsubscribe = subscribeSessionImpl((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }) satisfies () => Promise<AuthUser | null>,

  signOut: (async (): Promise<void> => {
    const { auth } = getFirebaseAuthClient();
    await firebaseSignOut(auth);
    clearAuthSession();
  }) satisfies () => Promise<void>,

  subscribeSession: (cb: (user: AuthUser | null) => void): (() => void) => {
    return subscribeSessionImpl(cb);
  },
};
