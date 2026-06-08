/**
 * Shared module — top-level barrel.
 * Unified entry point for cross-cutting shared code.
 * 
 * Usage:
 *   import { colors, PremiumCard, useDeviceTier } from "../shared";
 * 
 * Replaces scattered imports from:
 *   - design/, design-system/, designSystem/
 *   - scattered type imports
 *   - scattered hook imports
 */
export * from "./ui";
export * from "./types";
export * from "./hooks";
export * from "./utils";
