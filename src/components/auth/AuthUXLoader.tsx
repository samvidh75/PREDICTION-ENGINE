/**
 * AuthUXLoader — Context-aware loading states for protected routes.
 *
 * Replaces the generic "Restoring secure session" card with:
 *   - "Loading [Page]..." — contextual loading message
 *   - Skeleton UI with animated pulse
 *   - Timeout diagnostics after 10s
 *   - Auth state logging to console (dev mode)
 *
 * States:
 *   1. LOADING — Firebase is resolving auth (normal, < 10s)
 *   2. SLOW — > 10s, shows diagnostic + retry suggestion
 *   3. TIMEOUT — > 30s, shows error + reload button
 */

import React, { useEffect, useRef, useState } from 'react';

export interface AuthUXLoaderProps {
  /** The page the user was trying to access */
  targetPage: string;
  /** Whether auth is still loading */
  isLoading: boolean;
  /** Any auth error */
  authError?: string | null;
  /** Whether we're redirecting to login */
  isRedirecting?: boolean;
  /** Retry handler */
  onRetry?: () => void;
  /** True when auth loading is artificially delayed for testing */
  isSimulatingTimeout?: boolean;
}

type LoaderPhase = 'connecting' | 'loading' | 'slow' | 'timeout' | 'redirecting' | 'error';

const SLOW_THRESHOLD_MS = 10_000;
const TIMEOUT_THRESHOLD_MS = 30_000;

const PAGE_LABELS: Record<string, string> = {
  search: 'Search',
  dashboard: 'Dashboard',
  stock: 'Company Intelligence',
  company: 'Company Universe',
  portfolio: 'Portfolio',
  watchlist: 'Watchlist',
  alerts: 'Alert Centre',
  discovery: 'Discovery',
  settings: 'Settings',
  academy: 'Academy',
  analysis: 'Analysis',
};

function getPageLabel(page: string): string {
  return PAGE_LABELS[page] ?? page.charAt(0).toUpperCase() + page.slice(1);
}

/** Log auth UX state transitions */
function logAuthState(phase: LoaderPhase, targetPage: string, elapsedMs: number, error?: string | null): void {
  const entry = {
    timestamp: new Date().toISOString(),
    phase,
    targetPage,
    elapsedMs,
    error: error ?? undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 80) : 'unknown',
  };

  if (import.meta.env.DEV) {
    const emoji =
      phase === 'connecting' ? '🔌' :
      phase === 'loading' ? '⏳' :
      phase === 'slow' ? '⚠️' :
      phase === 'timeout' ? '🚨' :
      phase === 'redirecting' ? '↪️' :
      '❌';
  }

  // Also emit as a custom event so monitoring can pick it up
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('ss:auth-ux-state', { detail: entry }));
    } catch {}
  }
}

function SkeletonBlock({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-white/[0.04] border border-white/[0.05]"
      style={{ height: '16px', width }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <SkeletonBlock width="60px" />
          <SkeletonBlock width="160px" />
        </div>
        <SkeletonBlock width="40px" />
      </div>
      <div className="mt-3 flex gap-3">
        <SkeletonBlock width="80px" />
        <SkeletonBlock width="100px" />
      </div>
      <div className="mt-3">
        <SkeletonBlock width="80%" />
      </div>
      <div className="mt-4 flex justify-between border-t border-white/[0.05] pt-3">
        <SkeletonBlock width="60px" />
        <SkeletonBlock width="90px" />
      </div>
    </div>
  );
}

export const AuthUXLoader: React.FC<AuthUXLoaderProps> = ({
  targetPage,
  isLoading,
  authError,
  isRedirecting = false,
  onRetry,
}) => {
  const startMs = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const loggedSlow = useRef(false);
  const loggedTimeout = useRef(false);

  useEffect(() => {
    if (!isLoading && !isRedirecting) return;

    const interval = setInterval(() => {
      const ms = Date.now() - startMs.current;
      setElapsed(ms);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isRedirecting]);

  // Determine phase
  const phase: LoaderPhase = (() => {
    if (isRedirecting) return 'redirecting';
    if (authError) return 'error';
    if (elapsed > TIMEOUT_THRESHOLD_MS) return 'timeout';
    if (elapsed > SLOW_THRESHOLD_MS) return 'slow';
    if (isLoading) return 'loading';
    return 'connecting';
  })();

  // Log state transitions
  useEffect(() => {
    if (phase === 'slow' && !loggedSlow.current) {
      loggedSlow.current = true;
      logAuthState('slow', targetPage, elapsed, authError);
    }
    if (phase === 'timeout' && !loggedTimeout.current) {
      loggedTimeout.current = true;
      logAuthState('timeout', targetPage, elapsed, authError);
    }
    if (phase === 'error' && authError) {
      logAuthState('error', targetPage, elapsed, authError);
    }
    if (phase === 'redirecting') {
      logAuthState('redirecting', targetPage, elapsed);
    }
  }, [phase, targetPage, elapsed, authError]);

  const pageLabel = getPageLabel(targetPage);

  // ── Connecting (first render) ───────────────────────────
  if (phase === 'connecting') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#020304]">
        <div className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] max-w-[560px] w-[calc(100%-32px)]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-cyan-400/80">StockStory</div>
          <div className="mt-3 text-[18px] font-semibold text-white/92">Connecting to session service...</div>
          <div className="mt-3 text-[13px] leading-[1.7] text-white/75">
            Establishing a secure channel for your session.
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Loading ──────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen w-full bg-[#020304]">
        {/* Header skeleton */}
        <div className="border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
              <SkeletonBlock width="100px" />
              <SkeletonBlock width="60px" />
            </div>
            <SkeletonBlock width="140px" />
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-[800px] mx-auto px-4 pt-16">
          {/* Status card */}
          <div className="rounded-[28px] border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 mb-8 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-400/70 mb-2">Loading {pageLabel}...</div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-cyan-400/70 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-[13px] text-white/60">Restoring Session...</span>
            </div>
            <div className="mt-3 text-[12px] text-white/45">
              You were heading to <span className="text-white/80 font-medium">{pageLabel}</span> — just verifying your identity.
            </div>
          </div>

          {/* Content skeletons */}
          <div className="space-y-4">
            <SkeletonBlock width="200px" />
            <div className="h-12 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Slow (> 10s) ────────────────────────────────────────
  if (phase === 'slow') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#020304]">
        <div className="rounded-[28px] border border-amber-500/20 bg-amber-950/10 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(180,120,0,0.15)] max-w-[560px] w-[calc(100%-32px)]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400/80">Taking longer than usual</div>
          <div className="mt-3 text-[18px] font-semibold text-white/92">Still connecting to {pageLabel}...</div>
          <div className="mt-2 text-[13px] leading-[1.7] text-white/70">
            This usually takes a few seconds. Session restoration has been running for{' '}
            <span className="text-amber-400 font-medium">{Math.round(elapsed / 1000)}s</span>.
          </div>
          <div className="mt-4 text-[12px] text-white/50 leading-relaxed">
            This could be due to a slow network or Firebase initialization delay. The page will appear automatically when ready.
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.08] transition"
            >
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Timeout (> 30s) ─────────────────────────────────────
  if (phase === 'timeout') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#020304]">
        <div className="rounded-[28px] border border-red-500/25 bg-red-950/10 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(180,0,0,0.12)] max-w-[560px] w-[calc(100%-32px)]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-red-400">Connection Timeout</div>
          <div className="mt-3 text-[18px] font-semibold text-white/92">Could not load {pageLabel}</div>
          <div className="mt-2 text-[13px] leading-[1.7] text-white/70">
            Session verification timed out after{' '}
            <span className="text-red-400 font-medium">{Math.round(elapsed / 1000)}s</span>.
            This may indicate a temporary Firebase outage or network issue.
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.08] transition"
            >
              Reload Page
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-2 text-[13px] text-red-300 hover:bg-red-500/[0.12] transition"
              >
                Force Retry
              </button>
            )}
          </div>
          <div className="mt-4 text-[11px] text-white/40 leading-relaxed border-t border-white/[0.06] pt-3">
            <div>Page: {targetPage}</div>
            {authError && <div className="mt-1 text-red-400/70">Error: {authError}</div>}
            <div className="mt-1">Elapsed: {Math.round(elapsed / 1000)}s | {new Date().toISOString()}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Redirecting ─────────────────────────────────────────
  if (phase === 'redirecting') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#020304]">
        <div className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] max-w-[560px] w-[calc(100%-32px)]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-blue-400/70">Redirecting</div>
          <div className="mt-3 text-[18px] font-semibold text-white/92">Redirecting to Login...</div>
          <div className="mt-2 text-[13px] leading-[1.7] text-white/70">
            The <span className="text-white/90 font-medium">{pageLabel}</span> page requires authentication.
            You'll be redirected to sign in.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-blue-400/50 animate-pulse" />
            </div>
            <span className="text-[11px] text-white/40">Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#020304]">
        <div className="rounded-[28px] border border-red-500/25 bg-red-950/10 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(180,0,0,0.12)] max-w-[560px] w-[calc(100%-32px)]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-red-400">Session Error</div>
          <div className="mt-3 text-[18px] font-semibold text-white/92">Could not verify session for {pageLabel}</div>
          <div className="mt-2 text-[13px] leading-[1.7] text-white/70">
            {authError || 'An authentication error occurred. This is usually temporary.'}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/80 hover:bg-white/[0.08] transition"
            >
              Reload Page
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-2 text-[13px] text-red-300 hover:bg-red-500/[0.12] transition"
              >
                Try Again
              </button>
            )}
          </div>
          <div className="mt-4 text-[11px] text-red-400/60 leading-relaxed border-t border-white/[0.06] pt-3">
            If this persists, Firebase authentication may be unavailable.
          </div>
        </div>
      </div>
    );
  }

  // Fallback — never shown in practice, all phases handled above
  return null;
};

export default AuthUXLoader;
