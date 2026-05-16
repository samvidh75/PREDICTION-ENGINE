import { clearAuthSession, loadAuthSession, saveAuthSession } from "./sessionStore";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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

type OtpEntry = {
  code: string;
  expiresAtMs: number;
  verified: boolean;
};

const otpStore: Record<string, OtpEntry | undefined> = {};

function genOtpCode(): string {
  // Stable, calm stub (not cryptographic).
  const x = Math.floor((Date.now() / 1000) % 1000000);
  return String(x).padStart(6, "0");
}

async function persistAndReturnAuthUser(session: {
  uid: string;
  provider: "google" | "email" | "apple";
  email?: string;
  displayName?: string;
}): Promise<AuthUser> {
  const user: AuthUser = {
    uid: session.uid,
    provider: session.provider,
    email: session.email,
    displayName: session.displayName,
  };

  saveAuthSession({
    status: "authenticated",
    uid: user.uid,
    provider: user.provider,
    email: user.email,
    displayName: user.displayName,
    createdAtMs: Date.now(),
  });

  return user;
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
} = {
  signInWithGoogle: (async (): Promise<AuthUser> => {
    await delay(900);
    return persistAndReturnAuthUser({
      uid: "stub_uid_google",
      provider: "google",
      displayName: "Market Intelligence Member",
    });
  }) satisfies SignInWithGoogle,

  signInWithApple: (async (): Promise<AuthUser> => {
    await delay(900);
    return persistAndReturnAuthUser({
      uid: "stub_uid_apple",
      provider: "apple",
      displayName: "Market Intelligence Member",
    });
  }) satisfies SignInWithApple,

  signInWithEmail: (async (email: string, password: string): Promise<AuthUser> => {
    await delay(900);

    const trimmedEmail = validateEmail(email);
    const trimmedPassword = validatePassword(password);

    if (!trimmedEmail || !trimmedPassword) {
      throw makeAuthError("Authentication could not be completed. Please verify your credentials.");
    }

    return persistAndReturnAuthUser({
      uid: "stub_uid_email",
      provider: "email",
      email: trimmedEmail,
      displayName: "Market Intelligence Member",
    });
  }) satisfies SignInWithEmail,

  signUpWithEmail: (async (name: string, email: string, password: string): Promise<AuthUser> => {
    await delay(950);

    const trimmedEmail = validateEmail(email);
    const trimmedPassword = validatePassword(password);
    const trimmedName = name.trim();

    if (!trimmedEmail || !trimmedPassword || trimmedName.length < 2) {
      throw makeAuthError("Sign up could not be completed. Please verify your details.");
    }

    return persistAndReturnAuthUser({
      uid: `stub_uid_email_signup_${trimmedEmail.toLowerCase()}`,
      provider: "email",
      email: trimmedEmail,
      displayName: trimmedName,
    });
  }) satisfies SignUpWithEmail,

  sendOtp: (async (email: string): Promise<{ expiresInSeconds: number; debugOtpCode?: string }> => {
    await delay(600);

    const trimmedEmail = validateEmail(email);
    if (!trimmedEmail) {
      throw makeAuthError("OTP delivery could not be completed. Please verify the email address.");
    }

    const expiresInSeconds = 300; // 5 minutes
    const otpCode = genOtpCode();
    otpStore[trimmedEmail.toLowerCase()] = {
      code: otpCode,
      expiresAtMs: Date.now() + expiresInSeconds * 1000,
      verified: false,
    };

    // Stub: OTP isn't actually emailed. We return a debug code so the OTP flow is testable.
    return { expiresInSeconds, debugOtpCode: otpCode };
  }) satisfies SendOtp,

  verifyOtp: (async (email: string, code: string): Promise<{ ok: true }> => {
    await delay(500);

    const trimmedEmail = validateEmail(email);
    if (!trimmedEmail) {
      throw makeAuthError("OTP verification could not be completed. Please verify your email.");
    }

    const entry = otpStore[trimmedEmail.toLowerCase()];
    if (!entry) {
      throw makeAuthError("OTP verification could not be completed. Please request a new code.");
    }

    if (Date.now() > entry.expiresAtMs) {
      otpStore[trimmedEmail.toLowerCase()] = undefined;
      throw makeAuthError("OTP has expired. Please request a new code.");
    }

    const trimmedCode = code.trim();
    if (trimmedCode !== entry.code) {
      throw makeAuthError("OTP verification could not be completed. Please verify the code and try again.");
    }

    entry.verified = true;
    otpStore[trimmedEmail.toLowerCase()] = entry;
    return { ok: true };
  }) satisfies VerifyOtp,

  resetPassword: (async (email: string, code: string, newPassword: string): Promise<AuthUser> => {
    await delay(900);

    const trimmedEmail = validateEmail(email);
    const trimmedPassword = validatePassword(newPassword);
    if (!trimmedEmail || !trimmedPassword) {
      throw makeAuthError("Password reset could not be completed. Please verify the details.");
    }

    // Re-verify OTP as a calm correctness step.
    await (async () => {
      const entry = otpStore[trimmedEmail.toLowerCase()];
      if (!entry) throw makeAuthError("Password reset could not be completed. Please request a new OTP.");
      if (Date.now() > entry.expiresAtMs) {
        otpStore[trimmedEmail.toLowerCase()] = undefined;
        throw makeAuthError("OTP has expired. Please request a new code.");
      }
      if (code.trim() !== entry.code) throw makeAuthError("Password reset could not be completed. OTP is incorrect.");
    })();

    // Issue a fresh session as part of session restoration.
    return persistAndReturnAuthUser({
      uid: `stub_uid_email_reset_${trimmedEmail.toLowerCase()}`,
      provider: "email",
      email: trimmedEmail,
      displayName: "Market Intelligence Member",
    });
  }) satisfies ResetPassword,

  restoreSession: (async () => {
    await delay(300);

    const s = loadAuthSession();
    if (s.status !== "authenticated") return null;

    if (!s.uid || !s.provider) return null;

    return {
      uid: s.uid,
      provider: s.provider,
      email: s.email,
      displayName: s.displayName,
    } satisfies AuthUser;
  }) satisfies () => Promise<AuthUser | null>,

  signOut: (async () => {
    await delay(250);
    clearAuthSession();
  }) satisfies () => Promise<void>,
};
