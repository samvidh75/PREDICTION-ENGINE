/**
 * TRACK-38A — ProviderFailoverConfig
 *
 * Defines static failover-priority ordering for data providers.
 * Each provider group has a ranked list; at runtime the list is filtered
 * to only include providers that are enabled via environment variables.
 *
 * Upstox is optional-only (intraday). If UPSTOX_ENABLED is false or unset,
 * it is silently excluded — it must never block ingestion for other providers.
 */

// ---------------------------------------------------------------------------
// Provider name constants (used as keys for env-var gating)
// ---------------------------------------------------------------------------

export const PROVIDER_YFINANCE = 'yfinance';
export const PROVIDER_UPSTOX = 'upstox';
// ScreenerProvider removed (QUARANTINED — F3 Phase 0). No SCREENER_ENABLED.

// ---------------------------------------------------------------------------
// Env-var key → provider name mapping
// ---------------------------------------------------------------------------

const PROVIDER_ENV_KEYS: Record<string, string> = {
  [PROVIDER_YFINANCE]: 'YFINANCE_ENABLED',
  [PROVIDER_UPSTOX]: 'UPSTOX_ENABLED',
};

// ---------------------------------------------------------------------------
// ProviderFailoverConfig
// ---------------------------------------------------------------------------

export class ProviderFailoverConfig {
  /**
   * Priority order for price data providers.
   * yfinance → upstox (optional).
   */
  static readonly PROVIDER_ORDER_PRICES: string[] = [
    PROVIDER_YFINANCE,
    PROVIDER_UPSTOX,
  ];

  /**
   * Priority order for fundamental data providers.
   * Screener removed (QUARANTINED — F3 Phase 0).
   */
  static readonly PROVIDER_ORDER_FUNDAMENTALS: string[] = [
    PROVIDER_YFINANCE,
  ];

  /**
   * Priority order for intraday data providers.
   * Upstox is the only supported intraday provider and is entirely optional.
   * If UPSTOX_ENABLED is false, getActiveIntradayProviders() returns [].
   */
  static readonly PROVIDER_ORDER_INTRADAY: string[] = [PROVIDER_UPSTOX];

  // -----------------------------------------------------------------------
  // Static helpers
  // -----------------------------------------------------------------------

  /**
   * Checks whether a given provider is enabled via its environment variable.
   *
   * The env var can be "true", "1", "yes" (case-insensitive) to enable.
   * Any other value (including unset) is treated as disabled.
   *
   * SPECIAL RULE for upstox: never throws, never logs at error level.
   * If disabled, it is silently skipped.
   */
  static isProviderEnabled(provider: string): boolean {
    const envKey = PROVIDER_ENV_KEYS[provider];
    if (!envKey) {
      // Unknown provider — treat as disabled to be safe
      return false;
    }

    const raw = process.env[envKey];
    if (raw === undefined) return false;

    const normalised = raw.trim().toLowerCase();
    return normalised === 'true' || normalised === '1' || normalised === 'yes';
  }

  /**
   * Returns the list of enabled price data providers in priority order.
   * If upstox is disabled, it is silently omitted.
   */
  static getActivePriceProviders(): string[] {
    return ProviderFailoverConfig.PROVIDER_ORDER_PRICES.filter((p) =>
      ProviderFailoverConfig.isProviderEnabled(p),
    );
  }

  /**
   * Returns the list of enabled fundamental data providers in priority order.
   */
  static getActiveFundamentalProviders(): string[] {
    return ProviderFailoverConfig.PROVIDER_ORDER_FUNDAMENTALS.filter((p) =>
      ProviderFailoverConfig.isProviderEnabled(p),
    );
  }

  /**
   * Returns the list of enabled intraday data providers in priority order.
   * If upstox is disabled the array is empty — callers should handle this
   * gracefully (e.g. skip intraday ingestion entirely).
   */
  static getActiveIntradayProviders(): string[] {
    return ProviderFailoverConfig.PROVIDER_ORDER_INTRADAY.filter((p) =>
      ProviderFailoverConfig.isProviderEnabled(p),
    );
  }
}

export default ProviderFailoverConfig;
