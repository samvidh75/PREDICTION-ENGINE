/**
 * Integration test config — thin wrapper around vitest.config.ts.
 * Set VITEST_MODE=integration to activate integration profile.
 *
 * Usage:
 *   VITEST_MODE=integration vitest run
 *   VITEST_MODE=integration npx vitest run
 */
export { default } from "./vitest.config";
