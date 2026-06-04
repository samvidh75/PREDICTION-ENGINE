// src/components/navigation/NavigationDesignTokens.ts

export const NAV_TOKENS = {
  // Opaque header bases
  desktopBackground: "rgba(15, 15, 15, 0.96)",
  mobileBackground: "rgba(15, 15, 15, 0.95)",
  backdropBlur: "blur(24px)",
  
  // Heights
  desktopHeaderHeight: "72px",
  mobileHeaderHeight: "60px",
  mobileBottomNavHeight: "72px",
  
  // Borders
  border: "1px solid rgba(42, 46, 57, 1)",
  
  // Colours (Section 150)
  textPrimary: "#F0F3FA",
  textSecondary: "#B2B5BE",
  textMuted: "#787B86",
  accentCyan: "#2962FF",
  accentMagenta: "#8F5CFF",
  
  // Interactive Hover/Active states
  hoverBg: "rgba(30, 34, 45, 1)",
  activeBg: "rgba(41, 98, 255, 0.16)",
  hoverTransition: "transition-all duration-300 ease-out",
} as const;

export default NAV_TOKENS;
