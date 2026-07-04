/**
 * Environment Variables Configuration
 * Safe access to import.meta.env with fallbacks
 */

export const ENV = {
  // Upstox API
  UPSTOX_ACCESS_TOKEN: (import.meta.env.VITE_UPSTOX_ACCESS_TOKEN as string) || '',

  // News API
  NEWS_API_KEY: (import.meta.env.VITE_NEWS_API_KEY as string) || '',

  // Alpha Vantage (stocks)
  ALPHAVANTAGE_KEY: (import.meta.env.VITE_ALPHAVANTAGE_KEY as string) || '',

  // Claude API
  CLAUDE_API_KEY: (import.meta.env.VITE_CLAUDE_API_KEY as string) || '',

  // Local LLM
  LOCAL_LLM_ENABLED: (import.meta.env.VITE_LOCAL_LLM_ENABLED as string) === 'true',

  // Feature flags
  DEBUG_MODE: (import.meta.env.VITE_DEBUG_MODE as string) === 'true',
} as const;

/**
 * Check if API is configured
 */
export const isConfigured = (apiName: keyof typeof ENV): boolean => {
  const value = ENV[apiName];
  return typeof value === 'string' ? value.length > 0 : value === true;
};
