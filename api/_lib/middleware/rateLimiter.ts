/**
 * Rate Limiter Middleware
 * Prevents abuse and ensures stability under high load
 */

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per IP
  message: "Too many requests, please try again later",
};

export function getRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (identifier: string) => {
    const now = Date.now();
    const record = store[identifier];

    // Reset if window has passed
    if (!record || now > record.resetTime) {
      store[identifier] = {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      };
      return { allowed: true, remaining: finalConfig.maxRequests - 1, resetIn: finalConfig.windowMs };
    }

    // Increment count
    record.count++;

    if (record.count > finalConfig.maxRequests) {
      const resetIn = Math.max(0, record.resetTime - now);
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: finalConfig.message,
      };
    }

    return {
      allowed: true,
      remaining: finalConfig.maxRequests - record.count,
      resetIn: Math.max(0, record.resetTime - now),
    };
  };
}

/**
 * Preset configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Stock data endpoints - high volume expected
  STOCK_DATA: {
    windowMs: 60 * 1000,
    maxRequests: 300, // 300/min per IP
  },
  // Search endpoint - moderate volume
  SEARCH: {
    windowMs: 60 * 1000,
    maxRequests: 200, // 200/min per IP
  },
  // Premium features - lower volume
  PREMIUM: {
    windowMs: 60 * 1000,
    maxRequests: 50, // 50/min per IP
  },
  // API endpoints - strict limits
  API: {
    windowMs: 60 * 1000,
    maxRequests: 100, // 100/min per IP
  },
  // Auth endpoints - very strict
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 min
  },
};

/**
 * Cleanup stale entries periodically
 */
export function startCleanupInterval(intervalMs: number = 60 * 1000) {
  setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }, intervalMs);
}
