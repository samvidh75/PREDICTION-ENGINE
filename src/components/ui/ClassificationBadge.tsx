import React from "react";

type Classification = "EXCELLENT" | "HEALTHY" | "STABLE" | "WEAKENING" | "AT_RISK" | "INSUFFICIENT_DATA" | string;
type BadgeSize = "sm" | "md" | "lg";

interface ClassificationBadgeProps {
  classification: Classification;
  size?: BadgeSize;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  EXCELLENT:         { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  HEALTHY:           { bg: "#F0FDF4", text: "#22C55E", border: "#BBF7D0" },
  STABLE:            { bg: "#EFF6FF", text: "#2962FF", border: "#BFDBFE" },
  WEAKENING:         { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  AT_RISK:           { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  INSUFFICIENT_DATA: { bg: "#F8FAFC", text: "#94A3B8", border: "#E2E8F0" },
};

const LABEL_MAP: Record<string, string> = {
  EXCELLENT:         "Excellent",
  HEALTHY:           "Healthy",
  STABLE:            "Stable",
  WEAKENING:         "Weakening",
  AT_RISK:           "At Risk",
  INSUFFICIENT_DATA: "Insufficient Data",
};

const SIZE_CLS: Record<BadgeSize, string> = {
  sm: "text-[9px] px-1.5 py-0.5",
  md: "text-[11px] px-2 py-0.5",
  lg: "text-xs px-2.5 py-1",
};

export function ClassificationBadge({ classification, size = "md" }: ClassificationBadgeProps) {
  const colors = COLOR_MAP[classification] ?? COLOR_MAP.INSUFFICIENT_DATA;
  const label = LABEL_MAP[classification] ?? classification;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border ${SIZE_CLS[size]}`}
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {label}
    </span>
  );
}

export default ClassificationBadge;
