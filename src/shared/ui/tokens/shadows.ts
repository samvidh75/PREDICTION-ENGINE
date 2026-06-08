/**
 * TRACK-95H — Clean institutional shadow system.
 * No glow effects. No coloured shadows. No decorative depth.
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.30)',
  md: '0 2px 6px rgba(0, 0, 0, 0.35)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.40)',
  xl: '0 8px 24px rgba(0, 0, 0, 0.50)',
  panel: '0 1px 3px rgba(0, 0, 0, 0.30), 0 4px 16px rgba(0, 0, 0, 0.35)',
  elevated: '0 2px 8px rgba(0, 0, 0, 0.40), 0 8px 32px rgba(0, 0, 0, 0.45)',
} as const;

export type Shadows = typeof shadows;
