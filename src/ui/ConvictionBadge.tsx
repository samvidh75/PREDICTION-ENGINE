/**
 * ConvictionBadge — displays one of 5 SEBI-safe conviction states
 *
 * States (score ranges):
 *   Very Healthy (80-100) → green
 *   Healthy     (65-79)  → teal
 *   Stable      (45-64)  → blue
 *   Caution     (30-44)  → amber
 *   Watch List  (0-29)   → red
 */

import { colors } from "../design/tokens";

export type ConvictionLevel = "very-healthy" | "healthy" | "stable" | "caution" | "watch-list";

const CONFIG: Record<ConvictionLevel, { label: string; bg: string; text: string; border: string }> = {
  "very-healthy": {
    label: "Very Healthy",
    bg: "rgba(89,212,153,0.12)",
    text: colors.success,
    border: colors.success,
  },
  healthy: {
    label: "Healthy",
    bg: "rgba(0,198,167,0.12)",
    text: "#00C9A7",
    border: "#00C9A7",
  },
  stable: {
    label: "Stable",
    bg: "rgba(255,255,255,0.08)",
    text: colors.primary,
    border: colors.primary,
  },
  caution: {
    label: "Caution",
    bg: "rgba(255,197,51,0.12)",
    text: colors.warning,
    border: colors.warning,
  },
  "watch-list": {
    label: "Watch List",
    bg: "rgba(255,99,99,0.12)",
    text: colors.danger,
    border: colors.danger,
  },
};

/** Map a 0-100 health score to a conviction level */
export function scoreToConviction(score: number): ConvictionLevel {
  if (score >= 80) return "very-healthy";
  if (score >= 65) return "healthy";
  if (score >= 45) return "stable";
  if (score >= 30) return "caution";
  return "watch-list";
}

interface ConvictionBadgeProps {
  /** 0-100 score, or explicit level */
  value?: number;
  level?: ConvictionLevel;
  size?: "sm" | "md";
}

export function ConvictionBadge({ value, level, size = "md" }: ConvictionBadgeProps) {
  const resolvedLevel: ConvictionLevel = level ?? (value !== undefined ? scoreToConviction(value) : "stable");
  const config = CONFIG[resolvedLevel];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        minHeight: size === "sm" ? "20px" : "26px",
        padding: size === "sm" ? "0 8px" : "0 12px",
        borderRadius: "999px",
        border: `1px solid ${config.border}`,
        background: config.bg,
        color: config.text,
        fontSize: size === "sm" ? "11px" : "13px",
        fontWeight: 600,
        lineHeight: "1.4",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: size === "sm" ? 6 : 8,
          height: size === "sm" ? 6 : 8,
          borderRadius: "50%",
          background: config.text,
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}
