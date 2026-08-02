import { colors, radius, typography } from "../design/tokens";

type BadgeVariant = "pro" | "info" | "success" | "danger" | "warning" | "neutral";

const VARIANT_MAP: Record<BadgeVariant, { background: string; color: string }> = {
  pro:     { background: colors.surfaceElevated, color: colors.mute },
  info:    { background: colors.accentBlueSoft, color: colors.accentBlue },
  success: { background: colors.accentGreenSoft, color: colors.accentGreen },
  danger:  { background: colors.accentRedSoft, color: colors.accentRed },
  warning: { background: colors.accentYellowSoft, color: colors.accentYellow },
  neutral: { background: colors.surfaceCard, color: colors.body },
};

export function Badge({
  value,
  label,
  variant = "pro",
}: {
  value: number | string;
  label?: string;
  variant?: BadgeVariant;
}) {
  const tone = VARIANT_MAP[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        minHeight: "24px",
        padding: "0 10px",
        borderRadius: radius.full,
        background: tone.background,
        color: tone.color,
        fontSize: typography.captionSm.size,
        fontWeight: 500,
        lineHeight: typography.captionSm.line,
        letterSpacing: typography.captionSm.track,
      }}
    >
      {label ? `${label} ` : ""}
      {value}
    </span>
  );
}
