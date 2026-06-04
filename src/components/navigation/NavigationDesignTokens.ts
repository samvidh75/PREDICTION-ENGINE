// src/components/navigation/NavigationDesignTokens.ts

export const NAV_TOKENS = {
  // Opaque header bases
  desktopBackground: "rgba(4, 6, 9, 0.96)",
  mobileBackground: "rgba(2, 3, 4, 0.95)",
  backdropBlur: "blur(24px)",
  
  // Heights
  desktopHeaderHeight: "72px",
  mobileHeaderHeight: "60px",
  mobileBottomNavHeight: "72px",
  
  // Borders
  border: "1px solid rgba(255, 255, 255, 0.08)",
  
  // Colours (Section 150)
  textPrimary: "#F5F7FA",
  textSecondary: "#AAB6C7",
  textMuted: "#6D7888",
  accentCyan: "#00D17A", // Cyan/Emerald theme active
  accentMagenta: "#D946EF",
  
  // Interactive Hover/Active states
  hoverBg: "rgba(255, 255, 255, 0.04)",
  activeBg: "rgba(255, 255, 255, 0.08)",
  hoverTransition: "transition-all duration-300 ease-out",
} as const;

export default NAV_TOKENS;
