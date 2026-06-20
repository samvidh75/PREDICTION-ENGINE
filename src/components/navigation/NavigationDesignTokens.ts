// src/components/navigation/NavigationDesignTokens.ts

export const NAV_TOKENS = {
  // Opaque header bases
  desktopBackground: "rgba(8, 11, 18, 0.96)",
  mobileBackground: "rgba(8, 11, 18, 0.95)",
  backdropBlur: "blur(24px)",
  
  // Heights
  desktopHeaderHeight: "72px",
  mobileHeaderHeight: "60px",
  mobileBottomNavHeight: "72px",
  
  // Borders
  border: "1px solid rgba(148, 163, 184, 0.12)",
  
  // Colours (Section 150)
  textPrimary: "#EEF4FF",
  textSecondary: "#AAB7C8",
  textMuted: "#718096",
  accentCyan: "#5B7CFA",
  accentMagenta: "#7C3AED",
  
  // Interactive Hover/Active states
  hoverBg: "rgba(18, 26, 42, 0.6)",
  activeBg: "rgba(91, 124, 250, 0.08)",
  hoverTransition: "transition-all duration-300 ease-out",
} as const;

export default NAV_TOKENS;
