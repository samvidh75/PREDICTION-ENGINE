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
export type SignInWithEmail = (email: string, password: string) => Promise<AuthUser>;
export type SignInWithApple = () => Promise<AuthUser>;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// Stub implementation: replace the internals with real Firebase Auth calls later.
// Keeping this file as the single integration point prevents UI refactors later.
export const authService = {
  signInWithGoogle: (async (): Promise<AuthUser> => {
    await delay(900);
    return {
      uid: "stub_uid_google",
      provider: "google",
      displayName: "Market Intelligence Member",
    };
  }) satisfies SignInWithGoogle,

  signInWithEmail: (async (email: string, _password: string): Promise<AuthUser> => {
    await delay(900);

    // Gentle validation; no aggressive error codes/messages.
    const trimmed = email.trim();
    if (!trimmed.includes("@") || trimmed.length < 6) {
      const err: AuthError = {
        message: "Authentication could not be completed. Please verify your credentials.",
      };
      throw err;
    }

    return {
      uid: "stub_uid_email",
      provider: "email",
      email: trimmed,
      displayName: "Market Intelligence Member",
    };
  }) satisfies SignInWithEmail,

  signInWithApple: (async (): Promise<AuthUser> => {
    await delay(900);
    return {
      uid: "stub_uid_apple",
      provider: "apple",
      displayName: "Market Intelligence Member",
    };
  }) satisfies SignInWithApple,
};
