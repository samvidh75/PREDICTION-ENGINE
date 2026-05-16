import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { AuthUser } from "../../services/auth/authService";
import { authService } from "../../services/auth/authService";
import PulseBars from "./internal/PulseBars";

type Stage = "login" | "signup" | "forgot" | "otp" | "reset";

type AutoProvider = "google" | "apple";

type Props = {
  onAuthed: (user: AuthUser) => void;
  /**
   * If true, attempts to restore a session on mount.
   * Defaults to true.
   */
  restoreOnMount?: boolean;
  /**
   * QA-only deep-link helper. When set, the gateway auto-runs sign-in to validate end-to-end.
   * Example: autoProvider=google
   */
  autoProvider?: AutoProvider | null;
};

function classNames(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

function titleForStage(stage: Stage): string {
  switch (stage) {
    case "login":
      return "Secure account access";
    case "signup":
      return "Create your premium identity";
    case "forgot":
      return "Forgot password";
    case "otp":
      return "Verify recovery code";
    case "reset":
      return "Reset your password";
  }
}

function trustLine(stage: Stage): string {
  switch (stage) {
    case "login":
      return "Calm, encrypted-feeling sign-in—no aggressive conversion tactics.";
    case "signup":
      return "Premium account creation with onboarding continuity.";
    case "forgot":
      return "Recovery that feels reassuring—step-by-step.";
    case "otp":
      return "Enter the code. Codes expire. We keep the experience calm.";
    case "reset":
      return "Update your password securely and restore your session.";
  }
}

export default function CinematicAuthGateway({
  onAuthed,
  restoreOnMount = true,
  autoProvider = null,
}: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const [stage, setStage] = useState<Stage>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const lastOtpExpiresAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!restoreOnMount) return;
    let alive = true;

    void authService
      .restoreSession()
      .then((user) => {
        if (!alive) return;
        if (user) onAuthed(user);
      })
      .catch(() => {
        // If restore fails, we just remain on login.
      });

    return () => {
      alive = false;
    };
  }, [onAuthed, restoreOnMount]);

  useEffect(() => {
    if (!autoProvider) return;
    let alive = true;

    setError(null);
    setBusy(true);

    (async () => {
      try {
        const user =
          autoProvider === "google" ? await authService.signInWithGoogle() : await authService.signInWithApple();
        if (!alive) return;
        onAuthed(user);
        setBusy(false);
      } catch (e) {
        if (!alive) return;
        const msg =
          e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Sign-in could not be completed. Please try again.";
        setError(msg);
        setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [autoProvider, onAuthed]);

  const canLogin = useMemo(() => loginEmail.trim().length > 0 && loginPassword.trim().length > 0, [loginEmail, loginPassword]);
  const canSignup = useMemo(() => signupName.trim().length > 1 && signupEmail.trim().length > 0 && signupPassword.trim().length >= 6, [signupName, signupEmail, signupPassword]);
  const canSendOtp = useMemo(() => recoveryEmail.trim().length > 0, [recoveryEmail]);
  const canVerifyOtp = useMemo(() => otpCode.trim().length >= 4, [otpCode]);
  const canReset = useMemo(() => newPassword.trim().length >= 6 && otpCode.trim().length >= 4, [newPassword, otpCode]);

  const setSoftError = (msg: string): void => {
    setError(msg);
  };

  const clearErrorAndBusy = (): void => {
    setError(null);
    setBusy(false);
  };

  const onGoogle = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const user = await authService.signInWithGoogle();
      onAuthed(user);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Sign-in could not be completed. Please try again.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const onApple = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      // Stub: uses the same UX. The platform can later swap to real OAuth.
      const user = await authService.signInWithApple();
      onAuthed(user);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Sign-in could not be completed. Please try again.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const onEmailLogin = async (): Promise<void> => {
    if (!canLogin) return;
    setError(null);
    setBusy(true);
    try {
      const user = await authService.signInWithEmail(loginEmail, loginPassword);
      onAuthed(user);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Authentication could not be completed. Please verify your credentials.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const onSignup = async (): Promise<void> => {
    if (!canSignup) return;
    setError(null);
    setBusy(true);
    try {
      const user = await authService.signUpWithEmail(signupName, signupEmail, signupPassword);
      onAuthed(user);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Sign up could not be completed. Please verify your details.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const onSendOtp = async (): Promise<void> => {
    if (!canSendOtp) return;
    setError(null);
    setBusy(true);
    try {
      const resp = await authService.sendOtp(recoveryEmail);
      lastOtpExpiresAtRef.current = Date.now() + resp.expiresInSeconds * 1000;
      setDebugOtpCode(resp.debugOtpCode ?? null);
      setOtpCode("");
      setStage("otp");
      setBusy(false);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Recovery code could not be delivered. Please verify the email address.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const onVerifyOtp = async (): Promise<void> => {
    if (!canVerifyOtp) return;
    setError(null);
    setBusy(true);
    try {
      await authService.verifyOtp(recoveryEmail, otpCode);
      setStage("reset");
      setBusy(false);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "OTP verification could not be completed. Please try again.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const onResetPassword = async (): Promise<void> => {
    if (!canReset) return;
    setError(null);
    setBusy(true);
    try {
      const user = await authService.resetPassword(recoveryEmail, otpCode, newPassword);
      onAuthed(user);
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Password reset could not be completed. Please try again.";
      setSoftError(msg);
      setBusy(false);
    }
  };

  const panelGlow = useMemo(() => "0 0 60px rgba(0,255,210,0.08)", []);

  const primaryButtonBase =
    "h-[58px] rounded-[18px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="w-full lg:w-[420px]">
      <div
        className="rounded-[28px] border border-white/10 bg-black/35 backdrop-blur-2xl p-[28px] shadow-[0_0_60px_rgba(0,0,0,0.35)]"
        style={{ boxShadow: panelGlow }}
        aria-live="polite"
      >
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/65">Identity ecosystem</div>
        <div className="mt-3 text-[18px] font-semibold text-white/92">{titleForStage(stage)}</div>
        <div className="mt-3 text-[13px] leading-[1.8] text-white/80">{trustLine(stage)}</div>

        <div className="mt-6 flex gap-2">
          {stage === "login" && (
            <button
              type="button"
              className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/70 ss-focus-outline"
              onClick={() => setStage("signup")}
              disabled={busy}
            >
              Create account
            </button>
          )}
          {stage !== "login" && (
            <button
              type="button"
              className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/70 ss-focus-outline"
              onClick={() => setStage("login")}
              disabled={busy}
            >
              Back to sign in
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="mt-6">
          {stage === "login" && (
            <div className="flex flex-col gap-3">
              <button type="button" disabled={busy} onClick={() => void onGoogle()} className={primaryButtonBase}>
                Continue with Google
              </button>
              <button type="button" disabled={busy} onClick={() => void onApple()} className={primaryButtonBase}>
                Continue with Apple
              </button>

              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">Email login</div>

              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email"
                className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                disabled={busy}
              />

              <div className="relative">
                <input
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30 w-full pr-[92px]"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-[36px] rounded-[14px] px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/65 border border-white/10 bg-black/20 hover:text-white/85 transition disabled:opacity-50"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={busy}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button type="button" disabled={busy || !canLogin} onClick={() => void onEmailLogin()} className={primaryButtonBase}>
                Continue with Email
              </button>

              <button
                type="button"
                className="text-[12px] text-white/60 hover:text-white/85 transition mt-1 text-left"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setRecoveryEmail(loginEmail);
                  setStage("forgot");
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {stage === "signup" && (
            <div className="flex flex-col gap-3">
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">Signup</div>

              <input
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="Name"
                className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                disabled={busy}
              />

              <input
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="Email"
                className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                disabled={busy}
              />

              <div className="relative">
                <input
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Password"
                  type={showSignupPassword ? "text" : "password"}
                  className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30 w-full pr-[92px]"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-[36px] rounded-[14px] px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/65 border border-white/10 bg-black/20 hover:text-white/85 transition disabled:opacity-50"
                  onClick={() => setShowSignupPassword((v) => !v)}
                  disabled={busy}
                >
                  {showSignupPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button type="button" disabled={busy || !canSignup} onClick={() => void onSignup()} className={primaryButtonBase}>
                Create account
              </button>

              <button
                type="button"
                className="text-[12px] text-white/60 hover:text-white/85 transition mt-1 text-left"
                disabled={busy}
                onClick={() => setStage("login")}
              >
                Already have an account?
              </button>
            </div>
          )}

          {stage === "forgot" && (
            <div className="flex flex-col gap-3">
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">Email verification</div>

              <input
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="Email"
                className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                disabled={busy}
              />

              <button type="button" disabled={busy || !canSendOtp} onClick={() => void onSendOtp()} className={primaryButtonBase}>
                Send OTP
              </button>

              <button type="button" disabled={busy} className="text-[12px] text-white/60 hover:text-white/85 transition text-left" onClick={() => setStage("login")}>
                Back
              </button>
            </div>
          )}

          {stage === "otp" && (
            <div className="flex flex-col gap-3">
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">Recovery code</div>

              {debugOtpCode && (
                <div className="rounded-[18px] border border-white/10 bg-black/25 p-3 text-[12px] text-white/80">
                  Debug OTP (prototype): <span className="text-white/95 font-medium">{debugOtpCode}</span>
                </div>
              )}

              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter code"
                className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                disabled={busy}
              />

              <button type="button" disabled={busy || !canVerifyOtp} onClick={() => void onVerifyOtp()} className={primaryButtonBase}>
                Verify code
              </button>

              <button
                type="button"
                className="text-[12px] text-white/60 hover:text-white/85 transition text-left"
                disabled={busy}
                onClick={() => void onSendOtp()}
              >
                Resend OTP
              </button>

              <button type="button" disabled={busy} className="text-[12px] text-white/60 hover:text-white/85 transition text-left" onClick={() => setStage("forgot")}>
                Back
              </button>
            </div>
          )}

          {stage === "reset" && (
            <div className="flex flex-col gap-3">
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">New password</div>

              <div className="relative">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  type={showNewPassword ? "text" : "password"}
                  className="h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30 w-full pr-[92px]"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-[36px] rounded-[14px] px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/65 border border-white/10 bg-black/20 hover:text-white/85 transition disabled:opacity-50"
                  onClick={() => setShowNewPassword((v) => !v)}
                  disabled={busy}
                >
                  {showNewPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button type="button" disabled={busy || !canReset} onClick={() => void onResetPassword()} className={primaryButtonBase}>
                Reset password
              </button>

              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Session restoration follows reset.
              </div>

              <button type="button" disabled={busy} className="text-[12px] text-white/60 hover:text-white/85 transition text-left" onClick={() => setStage("otp")}>
                Back
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(8px)" }}
              transition={{ duration: 0.25 }}
              className="mt-4 text-[13px] leading-[1.6] text-white/80"
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {busy && (
          <div className="mt-4 flex items-center gap-3 text-[13px] text-white/75">
            <PulseBars active />
            Synchronising identity…
          </div>
        )}

        <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Security messaging: session integrity • calm verification • educational compliance tone.
        </div>

        <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
          {prefersReducedMotion ? "Reduced motion enabled." : "Motion enabled."}
        </div>

        {/* keep stage changes traceable */}
        <div className="sr-only">{stage}</div>
      </div>
    </div>
  );
}
