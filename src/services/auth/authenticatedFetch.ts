/**
 * TRACK-P0-MEGA — Authenticated Fetch
 *
 * Sends Firebase ID token as Authorization: Bearer header.
 * Never stores token in localStorage. Never logs token.
 * Throws clear AUTH_MISSING error if signed out.
 *
 * Usage:
 *   const response = await authenticatedFetch('/api/watchlists');
 *   const data = await authenticatedFetchJSON('/api/watchlists');
 */
let currentGetIdToken: (() => Promise<string>) | null = null;

/**
 * Register the Firebase getIdToken function.
 * Called once during app initialization.
 */
export function registerTokenProvider(getIdToken: () => Promise<string>): void {
  currentGetIdToken = getIdToken;
}

/**
 * Get current Firebase ID token.
 * Throws if user is not signed in or token provider not registered.
 */
async function getIdToken(): Promise<string> {
  if (!currentGetIdToken) {
    throw new Error('AUTH_MISSING: Token provider not registered');
  }
  const token = await currentGetIdToken();
  if (!token) {
    throw new Error('AUTH_MISSING: User is not signed in');
  }
  return token;
}

/**
 * Fetch with Bearer token.
 * For signed-out contexts, call authenticatedFetchOnlyIfSignedIn() instead.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  return fetch(url, { ...options, headers });
}

/**
 * Fetch JSON with Bearer token and parse response.
 */
export async function authenticatedFetchJSON<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authenticatedFetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.code || `HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch with Bearer token only if user is signed in.
 * Returns null if signed out — caller handles local-only mode.
 */
export async function authenticatedFetchOnlyIfSignedIn(
  url: string,
  options: RequestInit = {},
): Promise<Response | null> {
  try {
    const token = await getIdToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    return fetch(url, { ...options, headers });
  } catch {
    return null; // Signed out — caller uses local cache
  }
}

/**
 * POST with Bearer token.
 */
export async function authenticatedPost<T = any>(
  url: string,
  body: unknown,
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}
