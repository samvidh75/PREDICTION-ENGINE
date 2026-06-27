/**
 * STRIPE + APPLE DESIGN - SPACING SYSTEM
 * BASE UNIT: 4px
 * ALL SPACING MUST BE MULTIPLES OF 4px
 * NO EXCEPTIONS
 */

export const SPACING = {
  // Multiples of 4px
  xs: '4px',      // 1x
  sm: '8px',      // 2x
  md: '12px',     // 3x
  base: '16px',   // 4x
  lg: '24px',     // 6x
  xl: '32px',     // 8x
  xxl: '48px',    // 12x
  xxxl: '64px',   // 16x
};

// Semantic spacing
export const semanticSpacing = {
  // Page padding
  pageX: '40px',              // Horizontal padding (desktop)
  pageXTablet: '32px',        // Horizontal padding (tablet)
  pageXMobile: '16px',        // Horizontal padding (mobile)
  pageY: '32px',              // Vertical padding

  // Section spacing
  sectionGap: '32px',         // Gap between sections
  sectionPadding: '24px',     // Padding within sections

  // Component spacing
  componentGap: '16px',       // Gap between components
  elementGap: '12px',         // Gap between elements

  // Button spacing
  buttonPaddingVertical: '12px',
  buttonPaddingHorizontal: '32px',

  // Input spacing
  inputHeight: '44px',        // Touch target minimum
  inputPadding: '12px 16px',

  // Card spacing
  cardPadding: '24px',        // Card internal padding
  cardGap: '24px',            // Gap between cards
};

// Responsive breakpoints
export const breakpoints = {
  mobile: '375px',            // iPhone SE
  tablet: '768px',            // iPad
  desktop: '1024px',          // Desktop minimum
  wide: '1280px',             // Desktop maximum (max-width)
};
