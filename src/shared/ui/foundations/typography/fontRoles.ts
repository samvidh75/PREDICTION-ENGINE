/**
 * fontRoles (Hybrid Font Role Stub)
 * ---------------------------------
 * Production engineering requirement:
 * - components must NOT hardcode Geist/Echo/Varino/Metropolia directly
 * - components should rely on semantic CSS variables:
 *   --font-display, --font-heading, --font-body, --font-telemetry, --font-overlay, --font-command
 *
 * IMPORTANT
 * This file supports a temporary font strategy until real Echo Horizon / Varino / Metropolia
 * assets are provided.
 *
 * Temporary production-safe mapping (IMMEDIATELY usable):
 * - Echo Horizon replacement (flagship headings): Orbitron
 * - Varino replacement (main UI/heading system): Sora
 * - Metropolia replacement (readability + telemetry engine): Inter Tight
 *
 * Later swap:
 * - replace only these font-family strings (or the font-face sources) with:
 *   Echo Horizon / Varino / Metropolia
 * - zero component rewrite required.
 */

export type FontRoleVars = Record<string, string>;

export const fontRoleVars: FontRoleVars = {
  // Explicit desktop vars (CSS selects these at desktop)
  "--font-display-desktop": `"Orbitron", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-heading-desktop": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-body-desktop": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-overlay-desktop": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-telemetry-desktop": `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-command-desktop": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,

  // Explicit mobile vars (CSS selects these under 639px)
  "--font-display-mobile": `"Orbitron", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-heading-mobile": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-body-mobile": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-overlay-mobile": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-telemetry-mobile": `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
  "--font-command-mobile": `"Exo 2", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
};
