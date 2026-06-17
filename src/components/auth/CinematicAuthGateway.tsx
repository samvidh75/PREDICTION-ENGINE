import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import type { AuthUser } from "../../services/auth/authService";
import { authService } from "../../services/auth/authService";
import { AnalyticsCoordinator } from "../../services/diagnostics/AnalyticsCoordinator";
import { mapAuthError } from "../../services/auth/authErrorMapper";
import Button from "../ui/Button";
import Input from "../ui/Input";

type Stage = "login" | "signup" | "forgot";
type AutoProvider = "google";

type Props = {
  onAuthed: (user: AuthUser) => void;
  restoreOnMount?: boolean;
  autoProvider?: AutoProvider | null;
  initialStage?: Stage;
  contextMessage?: string | null;
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
  contextMessage = null,
}: Props): JSX.Element {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");

  useEffect(() => {
    if (!restoreOnMount) return;
    let alive = true;
    setBusy(true);

    void authService.restoreSession().then((user) => {
      if (alive && user) onAuthed(user);
    }).finally(() => {
      if (alive) setBusy(false);
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

  return (
    <div className="w-full antialiased [text-rendering:geometricPrecision]">
      <div className="p-2" aria-live="polite">
        <div className="text-[24px] font-semibold tracking-tight text-slate-950">{titleForStage(stage)}</div>
        <div className="mt-2 text-[14px] leading-relaxed text-slate-600">
          {contextMessage || subtitleForStage(stage)}
        </div>
        {contextMessage && stage === "signup" && (
          <div className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {subtitleForStage(stage)}
          </div>
        )}

        <div className="mt-8">
          {stage === "login" && (
            <div className="flex flex-col gap-4">
              <Button type="button" disabled={busy} onClick={() => void startGoogle()} variant="secondary" className="w-full h-12 text-sm font-semibold">
                Continue with Google
              </Button>

              <div className="flex items-center my-2">
                <div className="flex-grow border-t border-slate-200" />
                <span className="mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Or email</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <Input aria-label="Email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email address" type="email" className="h-12" disabled={busy} />
              <div className="relative">
                <Input aria-label="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" type={showLoginPassword ? "text" : "password"} className="h-12 pr-10" disabled={busy} />
                <button type="button" tabIndex={-1} onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none text-slate-400 hover:text-slate-600" disabled={busy} aria-label={showLoginPassword ? "Hide password" : "Show password"}>
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="button" disabled={busy || !canLogin} onClick={() => void runAuth(() => authService.signInWithEmail(loginEmail, loginPassword), "email")} className="w-full h-12 text-sm font-semibold">
                Sign in
              </Button>

              <button type="button" className="text-[13px] text-slate-500 hover:text-slate-800 transition" disabled={busy} onClick={() => goToStage("forgot")}>
                Forgot your password?
              </button>

              <div className="text-center text-[13px] text-slate-500">
                Don't have an account?{" "}
                <button type="button" className="text-slate-800 underline transition hover:text-slate-950" disabled={busy} onClick={() => goToStage("signup")}>
                  Create account
                </button>
              </div>
            </div>
          )}

          {stage === "signup" && (
            <div className="flex flex-col gap-4">
              <Button type="button" disabled={busy} onClick={() => void startGoogle()} variant="secondary" className="w-full h-12 text-sm font-semibold">
                Continue with Google
              </Button>

              <div className="flex items-center my-2">
                <div className="flex-grow border-t border-slate-200" />
                <span className="mx-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">Or email</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <Input aria-label="Full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full name" className="h-12" disabled={busy} />
              <Input aria-label="Email address" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email address" type="email" className="h-12" disabled={busy} />
              <div className="relative">
                <Input aria-label="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password (min 6 characters)" type={showSignupPassword ? "text" : "password"} className="h-12 pr-10" disabled={busy} />
                <button type="button" tabIndex={-1} onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none text-slate-400 hover:text-slate-600" disabled={busy} aria-label={showSignupPassword ? "Hide password" : "Show password"}>
                  {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="button" disabled={busy || !canSignup} onClick={() => void runAuth(() => authService.signUpWithEmail(signupName, signupEmail, signupPassword), "email")} className="w-full h-12 text-sm font-semibold">
                Create account
              </Button>

              <div className="text-center text-[13px] text-slate-500">
                Already have an account?{" "}
                <button type="button" className="text-slate-800 underline transition hover:text-slate-950" disabled={busy} onClick={() => goToStage("login")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {stage === "forgot" && (
            <div className="flex flex-col gap-4">
              <Input aria-label="Recovery email address" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Email address" type="email" className="h-12" disabled={busy} />
              <Button type="button" disabled={busy || !canReset} onClick={() => void sendPasswordReset()} className="w-full h-12 text-sm font-semibold">
                Send reset link
              </Button>
              <button type="button" disabled={busy} className="text-center text-[13px] text-slate-500 transition hover:text-slate-800" onClick={() => goToStage("login")}>
                Back to sign in
              </button>
            </div>
          )}
        </div>

        {error && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] leading-[1.5] text-red-700"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[13px] leading-[1.5] text-emerald-700"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {busy && (
          <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
