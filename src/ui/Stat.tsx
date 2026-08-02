import { colors, typography } from "../design/tokens";

export function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ display: "grid", gap: "4px" }}>
      <span
        style={{
          color: colors.textSecondary,
          fontSize: typography.caption.desktop.size,
          fontWeight: 500,
          lineHeight: typography.caption.desktop.line,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: colors.textPrimary,
          fontSize: typography.body.desktop.size,
          fontWeight: 600,
          lineHeight: "1.3",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
