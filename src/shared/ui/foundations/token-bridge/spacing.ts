/**
 * Spatial spacing tokens
 * Single source of truth for the OS spacing system.
 *
 * Naming:
 * - xs/sm/md/lg/xl: general micro + widget rhythm
 * - section: section breathing (titles/blocks)
 * - layout: page/container pacing
 * - overlay: overlay padding + modal spacing
 * - immersive: full experience breathing
 * - panoramic: wide desktop breathing
 *
 * IMPORTANT: Keep values aligned to a 4pt grid where possible (4px increments).
 */
export const spacing = {
  // 4pt grid primitives
  grid4: 4,
  grid8: 8,

  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,

  // Breathing layers
  section: 48,

  // Layout paddings (matches existing SS-pad governance)
  padXs: 16,
  padSm: 20,
  padMd: 24,

  // Page / container rhythm (matches existing SS-space governance)
  layout20: 20,
  layout64: 64,
  layout72: 72,
  layout80: 80,
  layout96: 96,
  layout110: 110,

  // Overlays / HUD reserve
  overlayTopLarge: 96,

  // Immutable overlay reserve used by mobile rail in the current codebase
  mobileRailReserve: 116,
} as const;

export type SpacingKey = keyof typeof spacing;
