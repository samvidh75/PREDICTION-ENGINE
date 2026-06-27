/**
 * STRIPE + APPLE SPACING SYSTEM — 4px BASE GRID, IMMUTABLE LAW
 * Every margin, padding, gap MUST be a multiple of 4px.
 */
export const spacing = {
  0:    '0px',
  xs:   '4px',    // 1x
  sm:   '8px',    // 2x
  md:   '12px',   // 3x
  base: '16px',   // 4x
  lg:   '24px',   // 6x
  xl:   '32px',   // 8x
  xxl:  '48px',   // 12x
  xxxl: '64px',   // 16x

  // Named aliases for common uses
  gap:        '16px',  // default flex/grid gap
  gapSm:      '8px',
  gapLg:      '24px',
  pagePad:    '40px',  // desktop page padding
  pagePadMd:  '32px',  // tablet
  pagePadSm:  '16px',  // mobile
} as const;

export const radius = {
  xs:   '4px',
  sm:   '6px',    // buttons, inputs, badges
  md:   '8px',    // cards, containers — MAX allowed
  pill: '9999px', // pill shapes only
} as const;

export const transition = {
  fast:   '150ms ease',
  base:   '200ms ease',
  slow:   '300ms ease',
} as const;

export type Spacing = typeof spacing;
