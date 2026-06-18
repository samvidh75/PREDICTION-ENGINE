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
    return "Start exploring Indian companies through source-backed research states.";
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
      <div aria-live="polite">
        <div className="text-[18px] font-semibold tracking-tight text-[#E6EDF3]">{titleForStage(stage)}</div>
        <div className="mt-2 text-[13px] leading-relaxed text-[#9AA7B5]">
          {contextMessage || subtitleForStage(stage)}
        </div>
        {contextMessage && stage === "signup" && (
          <div className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
            {subtitleForStage(stage)}
          </div>
        )}

        <div className="mt-8">
          {stage === "login" && (
            <div className="flex flex-col gap-4">
              <Button type="button" disabled={busy} onClick={() => void startGoogle()} variant="secondary" className="w-full h-11 text-sm font-semibold" title={busy ? "Authentication is in progress." : undefined}>
                Continue with Google
              </Button>

              <div className="flex items-center my-2">
                <div className="flex-grow border-t border-[rgba(148,163,184,0.16)]" />
                <span className="mx-3 text-[11px] uppercase tracking-wider text-[#64748B] font-medium">Or email</span>
                <div className="flex-grow border-t border-[rgba(148,163,184,0.16)]" />
              </div>

              <Input aria-label="Email address" label="Email address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="name@example.com" type="email" className="h-11" disabled={busy} />
              <div className="relative">
                <Input aria-label="Password" label="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Minimum 6 characters" type={showLoginPassword ? "text" : "password"} className="h-11 pr-10" disabled={busy} />
                <button type="button" tabIndex={-1} onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-[38px] cursor-pointer bg-transparent border-none text-[#64748B] hover:text-[#E6EDF3]" disabled={busy} aria-label={showLoginPassword ? "Hide password" : "Show password"}>
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="button" disabled={busy || !canLogin} title={!canLogin ? "Enter an email address and a password with at least 6 characters." : undefined} onClick={() => void runAuth(() => authService.signInWithEmail(loginEmail, loginPassword), "email")} className="w-full h-11 text-sm font-semibold">
                Sign in
              </Button>
              {!canLogin && <p className="text-center text-[11px] text-[#64748B]">Enter an email and password to enable sign in.</p>}

              <button type="button" className="text-[13px] text-[#9AA7B5] hover:text-[#E6EDF3] transition" disabled={busy} onClick={() => goToStage("forgot")}>
                Forgot your password?
              </button>

              <div className="text-center text-[13px] text-[#9AA7B5]">
                Don't have an account?{" "}
                <button type="button" className="text-[#E6EDF3] underline transition hover:text-white" disabled={busy} onClick={() => goToStage("signup")}>
                  Create account
                </button>
              </div>
            </div>
          )}

          {stage === "signup" && (
            <div className="flex flex-col gap-4">
              <Button type="button" disabled={busy} onClick={() => void startGoogle()} variant="secondary" className="w-full h-11 text-sm font-semibold" title={busy ? "Authentication is in progress." : undefined}>
                Continue with Google
              </Button>

              <div className="flex items-center my-2">
                <div className="flex-grow border-t border-[rgba(148,163,184,0.16)]" />
                <span className="mx-3 text-[11px] uppercase tracking-wider text-[#64748B] font-medium">Or email</span>
                <div className="flex-grow border-t border-[rgba(148,163,184,0.16)]" />
              </div>

              <Input aria-label="Full name" label="Full name" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Your name" className="h-11" disabled={busy} />
              <Input aria-label="Email address" label="Email address" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="name@example.com" type="email" className="h-11" disabled={busy} />
              <div className="relative">
                <Input aria-label="Password" label="Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Minimum 6 characters" type={showSignupPassword ? "text" : "password"} className="h-11 pr-10" disabled={busy} />
                <button type="button" tabIndex={-1} onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-[38px] cursor-pointer bg-transparent border-none text-[#64748B] hover:text-[#E6EDF3]" disabled={busy} aria-label={showSignupPassword ? "Hide password" : "Show password"}>
                  {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="button" disabled={busy || !canSignup} title={!canSignup ? "Enter a name, email address, and password with at least 6 characters." : undefined} onClick={() => void runAuth(() => authService.signUpWithEmail(signupName, signupEmail, signupPassword), "email")} className="w-full h-11 text-sm font-semibold">
                Create account
              </Button>
              {!canSignup && <p className="text-center text-[11px] text-[#64748B]">Name, email, and a 6 character password are required.</p>}

              <div className="text-center text-[13px] text-[#9AA7B5]">
                Already have an account?{" "}
                <button type="button" className="text-[#E6EDF3] underline transition hover:text-white" disabled={busy} onClick={() => goToStage("login")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {stage === "forgot" && (
            <div className="flex flex-col gap-4">
              <Input aria-label="Recovery email address" label="Recovery email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="name@example.com" type="email" className="h-11" disabled={busy} />
              <Button type="button" disabled={busy || !canReset} title={!canReset ? "Enter the email address for the account." : undefined} onClick={() => void sendPasswordReset()} className="w-full h-11 text-sm font-semibold">
                Send reset link
              </Button>
              <button type="button" disabled={busy} className="text-center text-[13px] text-[#9AA7B5] transition hover:text-[#E6EDF3]" onClick={() => goToStage("login")}>
                Back to sign in
              </button>
            </div>
          )}
        </div>

        {error && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-[13px] leading-[1.5] text-[#FCA5A5]"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 p-3 text-[13px] leading-[1.5] text-[#86EFAC]"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
            <span>{success}</span>
          </div>
        )}

        {busy && (
          <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-[#9AA7B5]">
            <Loader2 className="h-4 w-4 animate-spin text-[#2962FF]" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
