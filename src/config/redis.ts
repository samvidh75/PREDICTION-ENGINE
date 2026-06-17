/**
 * src/config/redis.ts
 * Centralized Redis URL access with safe diagnostics.
 * Never prints, logs, or exposes the actual URL, password, or token.
 */

const ENV_KEY = "REDIS_URL" as const;

/** Returns the REDIS_URL value or null if unset. Never printed. */
export function getRedisUrl(): string | null {
  return process.env[ENV_KEY] || null;
}

/** Returns the REDIS_URL or throws in production when Redis is required. */
export function requireRedisUrl(context = "redis"): string {
  const url = getRedisUrl();
  if (!url) {
    const msg = `${context}: REDIS_URL is required but not set`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
    console.warn(`[redis] ${msg} — using in-memory fallback`);
    return "";
  }
  return url;
}

/**
 * Returns a safe status object suitable for API responses.
 * Never includes the actual URL, password, or token.
 */
export function getRedisStatusSummary(): {
  url: "present" | "missing";
} {
  return {
    url: process.env[ENV_KEY] ? "present" : "missing",
  };
}
