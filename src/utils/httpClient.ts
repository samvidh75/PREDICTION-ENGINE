// src/utils/httpClient.ts
/**
 * Simple HTTP client wrapper that adds retry logic and a very light circuit breaker.
 *
 * - `maxRetries` – number of attempts (default 2, i.e., original + 2 retries).
 * - `backoff` – base milliseconds for exponential back‑off.
 * - `circuitBreaker` – if more than `failureThreshold` requests fail within `windowMs`
 *   the breaker opens and all subsequent calls reject immediately for `coolDownMs`.
 */

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
};

let failureCount = 0;
let circuitOpen = false;
let lastFailureTime = 0;

export const httpGet = async (
  url: string,
  opts: RequestOptions = {},
  maxRetries = 2,
  backoff = 200,
  failureThreshold = 5,
  windowMs = 60_000,
  coolDownMs = 30_000
): Promise<any> => {
  if (circuitOpen) {
    const now = Date.now();
    if (now - lastFailureTime > coolDownMs) {
      // reset circuit
      circuitOpen = false;
      failureCount = 0;
    } else {
      throw new Error(`Circuit breaker open for ${url}`);
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      failureCount++;
      const now = Date.now();
      // Open circuit if too many failures in the window
      if (failureCount >= failureThreshold && now - lastFailureTime < windowMs) {
        circuitOpen = true;
        lastFailureTime = now;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  // Should never reach here
  throw new Error(`Failed to fetch ${url}`);
};
