import React from "react";

type Classification = "EXCELLENT" | "HEALTHY" | "STABLE" | "WEAKENING" | "AT_RISK" | "INSUFFICIENT_DATA" | string;
type BadgeSize = "sm" | "md" | "lg";

interface ClassificationBadgeProps {
  classification: Classification;
  size?: BadgeSize;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  EXCELLENT:         { bg: "#F0FDF4", text: "#065F46", border: "#A7F3D0" },
  HEALTHY:           { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  STABLE:            { bg: "#F8FAFC", text: "#374151", border: "#E5E7EB" },
  WEAKENING:         { bg: "#FFFBEB", text: "#78350F", border: "#FDE68A" },
  AT_RISK:           { bg: "#FEF2F2", text: "#7F1D1D", border: "#FECACA" },
  INSUFFICIENT_DATA: { bg: "#F8FAFC", text: "#6B7280", border: "#E5E7EB" },
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
      className={`inline-flex items-center rounded-[var(--r-sm)] font-semibold border ${SIZE_CLS[size]}`}
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {label}
    </span>
  );
}

export default ClassificationBadge;
