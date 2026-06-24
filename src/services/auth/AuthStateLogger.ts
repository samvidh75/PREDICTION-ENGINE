/**
 * AuthStateLogger — Centralized auth state diagnostic logging.
 *
 * Emits structured auth state transitions as both console logs (dev) and
 * custom DOM events (production-accessible). This enables:
 *   - DevTools console inspection during development
 *   - Production monitoring via event listeners (e.g., Sentry, custom analytics)
 *   - Session replay correlation
 *
 * States tracked:
 *   - session_restored (stored session loaded before Firebase confirm)
 *   - session_expired (stored session aged out)
 *   - firebase_confirmed (onAuthStateChanged fire)
 *   - firebase_null (onAuthStateChanged returned null — signed out)
 *   - redirect_start (URL redirect to login initiated)
 *   - redirect_complete (URL redirect to login completed)
 *   - loading_timeout (auth loading exceeded timeout threshold)
 *   - persistence_error (firebasePersistenceReady failed)
 *   - redirect_result_error (getRedirectResult failed)
 */

export type AuthLogPhase =
  | 'session_restored'
  | 'session_expired'
  | 'firebase_confirmed'
  | 'firebase_null'
  | 'redirect_start'
  | 'redirect_complete'
  | 'loading_timeout'
  | 'persistence_error'
  | 'redirect_result_error';

export interface AuthLogEntry {
  timestamp: string;
  phase: AuthLogPhase;
  sessionAgeMs?: number;
  uid?: string;
  provider?: string;
  error?: string;
  userAgent: string;
  elapsedMs?: number;
  targetPage?: string;
}

const SESSION_START_KEY = 'ss_auth_session_start_ms';

/**
 * Record the timestamp when a session is first created.
 * Used later to compute session age for expiry diagnostics.
 */
export function recordSessionStart(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_START_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Get the session age in milliseconds.
 * Returns null if the start timestamp is not available.
 */
export function getSessionAgeMs(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_START_KEY);
    if (!raw) return null;
    return Date.now() - Number(raw);
  } catch {
    return null;
  }
}

/**
 * Log an auth state transition.
 * In DEV mode: also pretty-prints to console.
 * In all modes: dispatches 'ss:auth-state-log' custom event.
 */
export function logAuthState(entry: Omit<AuthLogEntry, 'timestamp' | 'userAgent'>): void {
  const full: AuthLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 80) : 'unknown',
  };

  if (import.meta.env.DEV) {
    const emoji =
      entry.phase === 'session_restored' ? '📦' :
      entry.phase === 'session_expired' ? '⏰' :
      entry.phase === 'firebase_confirmed' ? '✅' :
      entry.phase === 'firebase_null' ? '👤' :
      entry.phase === 'redirect_start' ? '↪️' :
      entry.phase === 'redirect_complete' ? '🏁' :
      entry.phase === 'loading_timeout' ? '🚨' :
      entry.phase === 'persistence_error' ? '💥' :
      '⚠️';
    console.info(
      `[AuthState] ${emoji} ${entry.phase}` +
        (entry.uid ? ` uid=${entry.uid.slice(0, 8)}` : '') +
        (entry.sessionAgeMs != null ? ` age=${Math.round(entry.sessionAgeMs / 1000)}s` : '') +
        (entry.elapsedMs != null ? ` elapsed=${Math.round(entry.elapsedMs / 1000)}s` : '') +
        (entry.error ? ` err="${entry.error}"` : '') +
        (entry.targetPage ? ` page=${entry.targetPage}` : ''),
      full,
    );
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('ss:auth-state-log', { detail: full }));
    } catch {
      // ignore
    }
  }
}

/**
 * Clear the session start timestamp (called on logout).
 */
export function clearSessionStart(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_START_KEY);
  } catch {
    // ignore
  }
}
