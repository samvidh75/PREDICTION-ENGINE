import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { AuthUser } from "../../services/auth/authService";
import { authService } from "../../services/auth/authService";
import { AnalyticsCoordinator } from "../../services/diagnostics/AnalyticsCoordinator";
import { mapAuthError } from "../../services/auth/authErrorMapper";

type Stage = "login" | "signup" | "forgot";
type AutoProvider = "google";

type Props = {
  onAuthed: (user: AuthUser) => void;
  restoreOnMount?: boolean;
  autoProvider?: AutoProvider | null;
  initialStage?: Stage;
};

function titleForStage(stage: Stage): string {
  if (stage === "signup") return "Create your account";
  if (stage === "forgot") return "Reset your password";
  return "Welcome back";
}

function subtitleForStage(stage: Stage): string {
  if (stage === "signup") {
    return "Start exploring Indian companies through clear, research-driven analysis.";
  }
  if (stage === "forgot") {
    return "We'll send a password reset link to your email.";
  }
  return "Sign in to continue using StockStory India.";
}

function trackAuthOutcome(user: AuthUser, method: "google" | "email") {
  AnalyticsCoordinator.trackEvent(
    user.isNewUser ? "signup_completed" : "login_completed",
    JSON.stringify({
      uid: user.uid,
      method,
      timestamp: new Date().toISOString(),
    }),
  );
}

export default function CinematicAuthGateway({
  onAuthed,
  restoreOnMount = true,
  autoProvider = null,
  initialStage = "login",
}: Props): JSX.Element {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");

  useEffect(() => {
    if (!restoreOnMount) return;
    let alive = true;

    void authService.restoreSession().then((user) => {
      if (alive && user) onAuthed(user);
    });

    return () => {
      alive = false;
    };
  }, [onAuthed, restoreOnMount]);

  useEffect(() => {
    if (!autoProvider) return;
    let alive = true;

    setError(null);
    setSuccess(null);
    setBusy(true);

    void authService
      .signInWithGoogle()
      .then((user) => {
        if (!alive) return;
        trackAuthOutcome(user, "google");
        onAuthed(user);
      })
      .catch((e) => {
        if (!alive) return;
        setError(mapAuthError(e));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });

    return () => {
      alive = false;
    };
  }, [autoProvider, onAuthed]);

  const canLogin = useMemo(
    () => loginEmail.trim().length > 0 && loginPassword.trim().length >= 6,
    [loginEmail, loginPassword],
  );
  const canSignup = useMemo(
    () => signupName.trim().length > 1 && signupEmail.trim().length > 0 && signupPassword.trim().length >= 6,
    [signupName, signupEmail, signupPassword],
  );
  const canReset = useMemo(() => recoveryEmail.trim().length > 0, [recoveryEmail]);

  const runAuth = async (operation: () => Promise<AuthUser>, method: "google" | "email") => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const user = await operation();
      trackAuthOutcome(user, method);
      onAuthed(user);
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = async () => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const user = await authService.signInWithGoogle();
      trackAuthOutcome(user, "google");
      onAuthed(user);
    } catch (e) {
      if ((e as { code?: string })?.code === "auth/popup-blocked" || (e as { code?: string })?.code === "auth/popup-closed-by-user") {
        try {
          await authService.beginGoogleRedirect();
          return;
        } catch (redirectError) {
          setError(mapAuthError(redirectError));
        }
      } else {
        setError(mapAuthError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!canReset) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await authService.sendPasswordReset(recoveryEmail);
      void result;
      setSuccess("Password reset email sent. Please check your inbox.");
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const goToStage = (nextStage: Stage) => {
    setError(null);
    setSuccess(null);
    if (nextStage === "forgot" && !recoveryEmail) setRecoveryEmail(loginEmail);
    setStage(nextStage);
  };

  const secondaryButton =
    "h-[50px] rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-[14px]";
  const primaryButton =
    "h-[50px] rounded-lg bg-white text-black hover:bg-white/90 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed text-[14px]";
  const inputClass = "ss-input ss-input--tall ss-input--auth";

  return (
    <div className="w-full antialiased [text-rendering:geometricPrecision]">
      <div className="p-2" aria-live="polite">
        <div className="text-[24px] font-bold text-white/95 tracking-tight">{titleForStage(stage)}</div>
        <div className="mt-2 text-[14px] leading-relaxed text-white/60">{subtitleForStage(stage)}</div>

        <div className="mt-8">
          {stage === "login" && (
            <div className="flex flex-col gap-4">
              <button type="button" disabled={busy} onClick={() => void startGoogle()} className={secondaryButton}>
                Continue with Google
              </button>

              <div className="flex items-center my-2">
                <div className="flex-grow border-t border-white/10" />
                <span className="mx-3 text-[11px] uppercase tracking-wider text-white/35 font-medium">Or email</span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email address" type="email" className={inputClass} disabled={busy} />
              <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" type="password" className={inputClass} disabled={busy} />

              <button type="button" disabled={busy || !canLogin} onClick={() => void runAuth(() => authService.signInWithEmail(loginEmail, loginPassword), "email")} className={primaryButton}>
                Sign in
              </button>

              <button type="button" className="text-[13px] text-white/50 hover:text-white/80 transition" disabled={busy} onClick={() => goToStage("forgot")}>
                Forgot your password?
              </button>

              <div className="text-[13px] text-center text-white/50">
                Don't have an account?{" "}
                <button type="button" className="text-white/80 hover:text-white underline transition" disabled={busy} onClick={() => goToStage("signup")}>
                  Create account
                </button>
              </div>
            </div>
          )}

          {stage === "signup" && (
            <div className="flex flex-col gap-4">
              <button type="button" disabled={busy} onClick={() => void startGoogle()} className={secondaryButton}>
                Continue with Google
              </button>

              <div className="flex items-center my-2">
                <div className="flex-grow border-t border-white/10" />
                <span className="mx-3 text-[11px] uppercase tracking-wider text-white/35 font-medium">Or email</span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              <input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full name" className={inputClass} disabled={busy} />
              <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email address" type="email" className={inputClass} disabled={busy} />
              <input value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password (min 6 characters)" type="password" className={inputClass} disabled={busy} />

              <button type="button" disabled={busy || !canSignup} onClick={() => void runAuth(() => authService.signUpWithEmail(signupName, signupEmail, signupPassword), "email")} className={primaryButton}>
                Create account
              </button>

              <div className="text-[13px] text-center text-white/50">
                Already have an account?{" "}
                <button type="button" className="text-white/80 hover:text-white underline transition" disabled={busy} onClick={() => goToStage("login")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {stage === "forgot" && (
            <div className="flex flex-col gap-4">
              <input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Email address" type="email" className={inputClass} disabled={busy} />
              <button type="button" disabled={busy || !canReset} onClick={() => void sendPasswordReset()} className={primaryButton}>
                Send reset link
              </button>
              <button type="button" disabled={busy} className="text-[13px] text-white/50 hover:text-white/80 transition text-center" onClick={() => goToStage("login")}>
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="mt-4 text-[13px] leading-[1.6] text-red-400 text-center"
              role="alert"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="mt-4 text-[13px] leading-[1.6] text-emerald-400 text-center"
              role="status"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {busy && (
          <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-white/65">
            <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
