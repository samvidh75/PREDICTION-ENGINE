import { colors, radius } from "../design/tokens";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const VARIANT_MAP: Record<BadgeVariant, { background: string; text: string; border: string }> = {
  neutral: { background: colors.fill, text: colors.textPrimary, border: colors.border },
  success: { background: "#E8F5E2", text: colors.success, border: colors.success },
  warning: { background: "#FFF3CD", text: "#856404", border: "#FFC107" },
  danger:  { background: "#FEE2E3", text: colors.danger, border: colors.danger },
  info:    { background: "#D1ECF1", text: "#0C5460", border: "#17A2B8" },
};

export function Badge({
  value,
  label,
  variant,
}: {
  value: number | string;
  label?: string;
  variant?: BadgeVariant;
}) {
  const tone = variant
    ? VARIANT_MAP[variant]
    : typeof value === "number"
      ? value >= 75
        ? VARIANT_MAP.success
        : value >= 50
          ? VARIANT_MAP.neutral
          : VARIANT_MAP.danger
      : VARIANT_MAP.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        minHeight: "24px",
        padding: "0 10px",
        borderRadius: radius.full,
        border: `1px solid ${tone.border}`,
        background: tone.background,
        color: tone.text,
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: "1.4",
      }}
    >
      {label ? `${label} ` : ""}
      {value}
    </span>
  );
}
