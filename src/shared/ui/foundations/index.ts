/**
 * Design Foundations barrel.
 * CSS variable bridge + TokenProvider + font roles.
 */
export { default as TokenProvider } from "./TokenProvider";
export { buildSpacingCssVars, buildTypographyCssVars, buildColourCssVars, buildTokenCssVars } from "./tokenCssVarMaps";
export { fontRoleVars } from "./typography/fontRoles";
export type { FontRoleVars } from "./typography/fontRoles";
